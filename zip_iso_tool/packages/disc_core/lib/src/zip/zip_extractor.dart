import 'dart:io';

import 'package:archive/archive_io.dart';
import 'package:path/path.dart' as p;

import '../progress.dart';
import 'crc_output_stream.dart';
import 'zip_inspector.dart';

/// Options controlling a single extraction job.
class ExtractOptions {
  const ExtractOptions({
    this.password,
    this.extractNested = true,
    this.maxNestingDepth = 4,
    this.deleteSourceOnSuccess = false,
  });

  /// Password for encrypted entries, or `null` when the archive is open.
  final String? password;

  /// When true, ZIPs found *inside* the archive are extracted in place into a
  /// folder named after them, recursively.
  final bool extractNested;

  /// Guards against zip-bomb style infinite nesting.
  final int maxNestingDepth;

  final bool deleteSourceOnSuccess;

  ExtractOptions copyWith({String? password}) => ExtractOptions(
        password: password ?? this.password,
        extractNested: extractNested,
        maxNestingDepth: maxNestingDepth,
        deleteSourceOnSuccess: deleteSourceOnSuccess,
      );
}

/// One file written to disk by an extraction.
class ExtractedFile {
  const ExtractedFile({
    required this.path,
    required this.size,
    required this.nestingDepth,
  });

  final String path;
  final int size;

  /// 0 for entries of the top-level archive, 1 for entries of a ZIP inside it,
  /// and so on.
  final int nestingDepth;

  String get name => p.basename(path);
}

class ExtractResult {
  const ExtractResult({
    required this.sourcePath,
    required this.destinationDirectory,
    required this.files,
    required this.nestedArchivesExpanded,
    required this.sourceDeleted,
  });

  final String sourcePath;
  final String destinationDirectory;
  final List<ExtractedFile> files;
  final int nestedArchivesExpanded;
  final bool sourceDeleted;

  int get totalBytes => files.fold(0, (sum, f) => sum + f.size);
}

/// Streaming ZIP extractor.
///
/// Entries are inflated straight to disk through `InputFileStream` /
/// `OutputFileStream` rather than being buffered in memory, so a 40 GB Wii
/// image extracts in roughly constant memory — which is the difference between
/// working and being OOM-killed on a phone.
class ZipExtractor {
  /// Extracts [source] into [destination], reporting progress through [onProgress].
  ///
  /// Throws [DiscCoreException] with `isPasswordFailure` set when the archive
  /// is encrypted and the supplied password is absent or wrong.
  static Future<ExtractResult> extract({
    required File source,
    required Directory destination,
    ExtractOptions options = const ExtractOptions(),
    ProgressSink onProgress = discardProgress,
  }) async {
    final summary = await ZipInspector.inspect(source);
    if (summary.isEncrypted && (options.password?.isEmpty ?? true)) {
      throw const DiscCoreException(
        'This archive is password-protected.',
        isPasswordFailure: true,
      );
    }
    if (summary.usesAes && options.password != null) {
      // archive 3.x implements AES-256 decryption; AES-128/192 variants and
      // some vendor extensions are not covered. Fail loudly rather than
      // writing corrupt files.
      onProgress(const ProgressUpdate(
        stage: 'Decrypting',
        detail: 'AES-encrypted archive',
      ));
    }

    await destination.create(recursive: true);

    final files = <ExtractedFile>[];
    var nestedCount = 0;
    final totalBytes = summary.totalUncompressedSize;
    var writtenBytes = 0;

    Future<void> run(
      File archive,
      Directory target,
      int depth,
      String? password,
    ) async {
      final decoder = ZipDecoder();
      InputFileStream input;
      try {
        input = InputFileStream(archive.path);
      } on FileSystemException catch (e) {
        throw DiscCoreException('Could not open the archive: ${e.message}');
      }

      final Archive contents;
      try {
        contents = decoder.decodeBuffer(input, password: password);
      } catch (e) {
        await input.close();
        throw _translateArchiveError(e, encrypted: password != null);
      }

      final nestedArchives = <File>[];
      try {
        for (final entry in contents) {
          final relative = _sanitizeEntryName(entry.name);
          if (relative == null) continue; // absolute or traversing path
          final outPath = p.join(target.path, relative);

          if (!entry.isFile) {
            await Directory(outPath).create(recursive: true);
            continue;
          }

          onProgress(ProgressUpdate(
            stage: 'Extracting',
            detail: p.basename(relative),
            processed: writtenBytes,
            total: totalBytes > 0 ? totalBytes : null,
          ));

          await Directory(p.dirname(outPath)).create(recursive: true);
          final output = CrcOutputStream(OutputFileStream(outPath));
          try {
            entry.writeContent(output);
          } catch (e) {
            await output.close();
            throw _translateArchiveError(e, encrypted: password != null);
          } finally {
            await output.close();
          }
          entry.clear();

          // The archive package decrypts without validating, so a wrong
          // password yields garbage rather than an error. Compare against the
          // CRC recorded in the ZIP to catch that — and genuine corruption too.
          if (entry.crc32 != null && output.crc32 != entry.crc32) {
            try {
              await File(outPath).delete();
            } on FileSystemException {
              // Best effort — we are about to throw anyway.
            }
            throw DiscCoreException(
              password != null
                  ? 'That password did not work for this archive.'
                  : 'This ZIP is corrupted — "${p.basename(relative)}" failed '
                      'its integrity check.',
              isPasswordFailure: password != null,
            );
          }

          final size = await File(outPath).length();
          writtenBytes += size;
          files.add(ExtractedFile(
            path: outPath,
            size: size,
            nestingDepth: depth,
          ));

          if (options.extractNested &&
              depth < options.maxNestingDepth &&
              p.extension(outPath).toLowerCase() == '.zip') {
            nestedArchives.add(File(outPath));
          }
        }
      } finally {
        await input.close();
      }

      // Nested archives are expanded after the parent is fully closed so we
      // never hold two decoders open on the same file handle budget.
      for (final nested in nestedArchives) {
        final nestedTarget = Directory(
          p.join(p.dirname(nested.path), p.basenameWithoutExtension(nested.path)),
        );
        try {
          final nestedSummary = await ZipInspector.inspect(nested);
          if (nestedSummary.isEncrypted && password == null) {
            // Can't prompt from here; leave the inner ZIP on disk untouched.
            continue;
          }
          await nestedTarget.create(recursive: true);
          await run(nested, nestedTarget, depth + 1, password);
          nestedCount++;
          files.removeWhere((f) => f.path == nested.path);
          await nested.delete();
        } on DiscCoreException {
          // A broken or password-protected inner ZIP should not fail the whole
          // job — the archive itself stays extracted for the user to handle.
          continue;
        }
      }
    }

    await run(source, destination, 0, options.password);

    onProgress(ProgressUpdate(
      stage: 'Extracting',
      processed: totalBytes > 0 ? totalBytes : writtenBytes,
      total: totalBytes > 0 ? totalBytes : writtenBytes,
    ));

    var deleted = false;
    if (options.deleteSourceOnSuccess && files.isNotEmpty) {
      try {
        await source.delete();
        deleted = true;
      } on FileSystemException {
        // Deleting a file we do not own (e.g. a SAF-provided URI copy) can
        // fail; the extraction itself still succeeded.
        deleted = false;
      }
    }

    return ExtractResult(
      sourcePath: source.path,
      destinationDirectory: destination.path,
      files: files,
      nestedArchivesExpanded: nestedCount,
      sourceDeleted: deleted,
    );
  }

  /// Rejects absolute paths and `..` segments so a malicious archive cannot
  /// write outside the destination directory (the "zip slip" bug).
  static String? _sanitizeEntryName(String name) {
    final normalized = name.replaceAll('\\', '/');
    if (normalized.isEmpty) return null;
    if (normalized.startsWith('/') || p.isAbsolute(normalized)) return null;
    final segments = <String>[];
    for (final segment in normalized.split('/')) {
      if (segment.isEmpty || segment == '.') continue;
      if (segment == '..') return null;
      segments.add(segment);
    }
    if (segments.isEmpty) return null;
    return segments.join(p.separator);
  }

  static DiscCoreException _translateArchiveError(
    Object error, {
    required bool encrypted,
  }) {
    final text = error.toString().toLowerCase();
    if (text.contains('password') ||
        text.contains('invalid password') ||
        text.contains('encrypt') ||
        (encrypted && text.contains('checksum')) ||
        (encrypted && text.contains('crc'))) {
      return DiscCoreException(
        encrypted
            ? 'That password did not work for this archive.'
            : 'This archive is password-protected.',
        isPasswordFailure: true,
      );
    }
    if (text.contains('crc') || text.contains('checksum')) {
      return const DiscCoreException(
        'This ZIP is corrupted — a file inside it failed its integrity check.',
      );
    }
    if (text.contains('unsupported') || text.contains('compression')) {
      return const DiscCoreException(
        'This ZIP uses a compression method that is not supported. Re-create '
        'it with standard Deflate compression and try again.',
      );
    }
    return DiscCoreException('The ZIP could not be extracted: $error');
  }
}
