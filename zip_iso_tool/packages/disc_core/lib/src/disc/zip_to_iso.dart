import 'dart:io';

import 'package:path/path.dart' as p;

import '../iso/iso_writer.dart';
import '../progress.dart';
import '../zip/zip_extractor.dart';
import '../zip/zip_inspector.dart';
import 'cue_sheet.dart';
import 'disc_detector.dart';
import 'sector_codec.dart';

class ConvertOptions {
  const ConvertOptions({
    required this.outputFile,
    this.password,
    this.volumeName,
    this.deleteSourceOnSuccess = false,
  });

  final File outputFile;
  final String? password;

  /// Volume label written into the image. Defaults to the output file name.
  final String? volumeName;

  final bool deleteSourceOnSuccess;

  ConvertOptions copyWith({String? password, File? outputFile}) =>
      ConvertOptions(
        outputFile: outputFile ?? this.outputFile,
        password: password ?? this.password,
        volumeName: volumeName,
        deleteSourceOnSuccess: deleteSourceOnSuccess,
      );
}

class ConvertResult {
  const ConvertResult({
    required this.sourcePath,
    required this.outputPath,
    required this.sizeInBytes,
    required this.strategy,
    required this.details,
    required this.warnings,
    required this.sourceDeleted,
  });

  final String sourcePath;
  final String outputPath;
  final int sizeInBytes;
  final DiscStrategy strategy;

  /// What actually happened, e.g. "Converted MODE1/2352 raw sectors".
  final String details;

  final List<String> warnings;
  final bool sourceDeleted;
}

/// Turns a ZIP containing game disc data into a single `.iso`.
///
/// The pipeline is: inspect the archive, decide a strategy, extract to a
/// scratch directory, then either rewrite sectors, copy, or build a fresh
/// ISO 9660 filesystem. The scratch directory is always cleaned up.
class ZipToIsoConverter {
  static Future<ConvertResult> convert({
    required File source,
    required Directory workingDirectory,
    required ConvertOptions options,
    ProgressSink onProgress = discardProgress,
  }) async {
    final summary = await ZipInspector.inspect(source);
    if (summary.isEncrypted && (options.password?.isEmpty ?? true)) {
      throw const DiscCoreException(
        'This archive is password-protected.',
        isPasswordFailure: true,
      );
    }

    final plan = DiscDetector.plan(summary);
    if (!plan.isSupported) {
      throw DiscCoreException(plan.reason);
    }

    final scratch = Directory(
      p.join(
        workingDirectory.path,
        'convert_${DateTime.now().microsecondsSinceEpoch}',
      ),
    );
    await scratch.create(recursive: true);

    try {
      onProgress(const ProgressUpdate(stage: 'Reading archive'));
      final extraction = await ZipExtractor.extract(
        source: source,
        destination: scratch,
        options: ExtractOptions(
          password: options.password,
          // Nested ZIPs inside a game archive are usually multi-disc sets; we
          // want their contents visible to the packer.
          extractNested: true,
        ),
        onProgress: (update) => onProgress(ProgressUpdate(
          stage: 'Unpacking archive',
          detail: update.detail,
          processed: update.processed,
          total: update.total,
        )),
      );

      if (extraction.files.isEmpty) {
        throw const DiscCoreException(
          'Nothing could be unpacked from this archive.',
        );
      }

      final warnings = List<String>.from(plan.warnings);
      final output = options.outputFile;
      await output.parent.create(recursive: true);

      final String details;
      switch (plan.strategy) {
        case DiscStrategy.binCue:
          details = await _convertBinCue(
            extraction: extraction,
            plan: plan,
            output: output,
            warnings: warnings,
            onProgress: onProgress,
          );
        case DiscStrategy.rawImage:
          details = await _convertRawImage(
            extraction: extraction,
            plan: plan,
            output: output,
            warnings: warnings,
            onProgress: onProgress,
          );
        case DiscStrategy.packFiles:
          details = await _packFiles(
            extraction: extraction,
            output: output,
            volumeName: options.volumeName ??
                p.basenameWithoutExtension(output.path),
            onProgress: onProgress,
          );
        case DiscStrategy.unsupportedDiscFormat:
          throw DiscCoreException(plan.reason);
      }

      final size = await output.length();
      if (size == 0) {
        throw const DiscCoreException(
          'Conversion produced an empty file. The archive\'s contents could '
          'not be interpreted as a disc image.',
        );
      }

      var deleted = false;
      if (options.deleteSourceOnSuccess) {
        try {
          await source.delete();
          deleted = true;
        } on FileSystemException {
          deleted = false;
        }
      }

      return ConvertResult(
        sourcePath: source.path,
        outputPath: output.path,
        sizeInBytes: size,
        strategy: plan.strategy,
        details: details,
        warnings: warnings,
        sourceDeleted: deleted,
      );
    } finally {
      if (await scratch.exists()) {
        try {
          await scratch.delete(recursive: true);
        } on FileSystemException {
          // Leaving scratch files behind is not worth failing the job over.
        }
      }
    }
  }

  static Future<String> _convertBinCue({
    required ExtractResult extraction,
    required DiscPlan plan,
    required File output,
    required List<String> warnings,
    required ProgressSink onProgress,
  }) async {
    final bin = _findExtracted(extraction, plan.primaryEntry!.baseName);
    if (bin == null) {
      throw const DiscCoreException(
        'The BIN track named in the CUE sheet was not found in the archive.',
      );
    }

    SectorLayout? layout;
    final cuePath = plan.cueEntry == null
        ? null
        : _findExtracted(extraction, plan.cueEntry!.baseName);
    if (cuePath != null) {
      final sheet = CueSheet.parse(await File(cuePath).readAsString());
      if (sheet.hasAudioTracks) {
        warnings.add(
          'The CUE sheet lists CD audio tracks. An ISO can only hold the data '
          'track, so any redbook audio (in-game music on many PS1 titles) '
          'will not be included.',
        );
      }
      final dataTrack = sheet.dataTracks.isEmpty ? null : sheet.dataTracks.first;
      final offset = dataTrack?.userDataOffset;
      final size = dataTrack?.sectorSize;
      if (offset != null && size != null) {
        layout = SectorLayout(
          sectorSize: size,
          userDataOffset: offset,
          description: '${dataTrack!.type} (from CUE sheet)',
        );
      }
    }

    // If the CUE was missing, unparseable, or listed a mode we do not know,
    // fall back to sniffing the BIN itself.
    layout ??= await SectorCodec.detectLayout(File(bin));
    if (layout == null) {
      throw const DiscCoreException(
        'The BIN file does not use a recognised CD sector layout, so it '
        'cannot be converted. Keep the original BIN/CUE and load that in your '
        'emulator instead.',
      );
    }

    await SectorCodec.convertToIso(
      source: File(bin),
      destination: output,
      layout: layout,
      onProgress: onProgress,
      stage: 'Converting sectors',
    );

    if (!await SectorCodec.hasIso9660Descriptor(output, SectorLayout.iso)) {
      warnings.add(
        'The converted image has no ISO 9660 volume descriptor. Many console '
        'discs use their own filesystem, so this is often normal — but if the '
        'emulator rejects the file, use the original BIN/CUE.',
      );
    }

    return layout.isAlreadyIso
        ? 'Copied a BIN that already used 2048-byte sectors'
        : 'Converted ${layout.description} to 2048-byte ISO sectors';
  }

  static Future<String> _convertRawImage({
    required ExtractResult extraction,
    required DiscPlan plan,
    required File output,
    required List<String> warnings,
    required ProgressSink onProgress,
  }) async {
    final imagePath = _findExtracted(extraction, plan.primaryEntry!.baseName);
    if (imagePath == null) {
      throw const DiscCoreException(
        'The disc image could not be found after unpacking the archive.',
      );
    }
    final image = File(imagePath);
    final layout = await SectorCodec.detectLayout(image);
    if (layout == null) {
      throw const DiscCoreException(
        'This file does not look like a disc image — its size does not divide '
        'into CD or DVD sectors and it has no volume descriptor. Check that '
        'the archive really contains a game image.',
      );
    }

    await SectorCodec.convertToIso(
      source: image,
      destination: output,
      layout: layout,
      onProgress: onProgress,
      stage: layout.isAlreadyIso ? 'Copying image' : 'Converting sectors',
    );

    if (!await SectorCodec.hasIso9660Descriptor(output, SectorLayout.iso)) {
      warnings.add(
        'No ISO 9660 volume descriptor was found in the result. GameCube, Wii '
        'and some PSP images use their own filesystem and are still valid.',
      );
    }

    return layout.isAlreadyIso
        ? 'Image already used 2048-byte sectors and was copied unchanged'
        : 'Converted ${layout.description} to 2048-byte ISO sectors';
  }

  static Future<String> _packFiles({
    required ExtractResult extraction,
    required File output,
    required String volumeName,
    required ProgressSink onProgress,
  }) async {
    final root = extraction.destinationDirectory;
    final sources = extraction.files
        .map((f) => IsoSourceFile(
              file: File(f.path),
              relativePath: p.relative(f.path, from: root),
            ))
        .toList();

    final result = await IsoWriter.write(
      files: sources,
      output: output,
      volumeName: volumeName,
      onProgress: onProgress,
    );
    return 'Packed ${result.fileCount} files into a new ISO 9660 image '
        '(Joliet names included)';
  }

  /// Extracted paths keep the archive's folder structure, so we match on the
  /// entry's own base name rather than its full path.
  static String? _findExtracted(ExtractResult extraction, String baseName) {
    for (final file in extraction.files) {
      if (p.basename(file.path) == baseName) return file.path;
    }
    return null;
  }
}
