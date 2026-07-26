import 'package:path/path.dart' as p;

import '../zip/zip_inspector.dart';

/// How the contents of a ZIP should be turned into an ISO.
enum DiscStrategy {
  /// The ZIP holds a flat 2048-byte image already (.iso, or an .img/.bin that
  /// turns out to be cooked). Extract and copy.
  rawImage,

  /// The ZIP holds a BIN backed by a CUE sheet. Strip raw sector headers to
  /// produce a true ISO.
  binCue,

  /// The ZIP holds a compressed disc format we cannot decode ourselves.
  unsupportedDiscFormat,

  /// The ZIP holds ordinary files (a ROM set, a PSP folder, loose game data).
  /// Pack everything into a new ISO 9660 image.
  packFiles,
}

/// Extensions that essentially always mean "this whole file is a disc image".
const Set<String> kStrongImageExtensions = {
  'iso', 'mdf', 'nrg', 'gcm', 'wbfs', 'cdi', 'gdi',
};

/// Extensions that *may* be a disc image but are just as often an ordinary
/// file inside a game folder — `EBOOT.BIN`, `BI2.BIN`, `APPLOADER.IMG` and so
/// on. These only count as an image when nothing else in the archive suggests
/// a directory layout.
const Set<String> kAmbiguousImageExtensions = {'bin', 'img'};

/// Every extension that could denote a flat disc image.
const Set<String> kRawImageExtensions = {
  ...kStrongImageExtensions,
  ...kAmbiguousImageExtensions,
};

/// File names that identify a console's on-disc file layout. Seeing any of
/// them means the archive holds an extracted game *folder*, so its `.bin`
/// files are game data, not disc images.
const Set<String> kGameFolderMarkers = {
  'eboot.bin', // PSP
  'umd_data.bin', // PSP
  'param.sfo', // PSP / PS3
  'boot.bin', // GameCube
  'bi2.bin', // GameCube
  'apploader.img', // GameCube
  'main.dol', // GameCube / Wii
  'default.xbe', // Xbox
  'system.cnf', // PS1 / PS2
  'ip.bin', // Dreamcast
};

/// Extensions that emulators read but that use container formats with their own
/// compression, which this app does not decode.
const Set<String> kCompressedDiscExtensions = {'chd', 'cso', 'rvz', 'wux', 'zso'};

/// A plan for converting one ZIP into one ISO.
class DiscPlan {
  const DiscPlan({
    required this.strategy,
    required this.reason,
    this.primaryEntry,
    this.cueEntry,
    this.payloadEntries = const [],
    this.warnings = const [],
  });

  final DiscStrategy strategy;

  /// Human-readable explanation shown in the UI before conversion starts.
  final String reason;

  /// The disc image entry, for [DiscStrategy.rawImage] and
  /// [DiscStrategy.binCue].
  final ZipEntryInfo? primaryEntry;

  /// The CUE sheet accompanying [primaryEntry], when there is one.
  final ZipEntryInfo? cueEntry;

  /// Entries to pack, for [DiscStrategy.packFiles].
  final List<ZipEntryInfo> payloadEntries;

  /// Non-fatal notes worth surfacing, e.g. discarded CD audio tracks.
  final List<String> warnings;

  bool get isSupported => strategy != DiscStrategy.unsupportedDiscFormat;

  /// Estimated size of the payload that will be processed, in bytes.
  int get estimatedInputBytes {
    if (primaryEntry != null) return primaryEntry!.uncompressedSize;
    return payloadEntries.fold(0, (sum, e) => sum + e.uncompressedSize);
  }
}

/// Decides, from a ZIP's central directory alone, how to convert it.
class DiscDetector {
  /// Anything under this is almost certainly not a disc image and is more
  /// likely a stray file the user picked by accident.
  static const int minimumPlausibleImageBytes = 64 * 1024;

  static DiscPlan plan(ZipSummary summary) {
    final files = summary.files.toList();
    if (files.isEmpty) {
      return const DiscPlan(
        strategy: DiscStrategy.packFiles,
        reason: 'The archive has no files in it.',
      );
    }

    final warnings = <String>[];

    // A container format we cannot decode is worth reporting up front rather
    // than producing a nonsense ISO that wraps the compressed blob.
    final compressed = files.where(
      (f) => kCompressedDiscExtensions.contains(f.extension),
    );
    if (compressed.isNotEmpty && compressed.length >= files.length - 1) {
      final ext = compressed.first.extension.toUpperCase();
      return DiscPlan(
        strategy: DiscStrategy.unsupportedDiscFormat,
        reason:
            'This archive contains a .$ext image. That is already a compressed '
            'disc format — most emulators load it directly, and converting it '
            'to ISO would need a $ext decoder this app does not include.',
        primaryEntry: compressed.first,
      );
    }

    // Case 1: BIN + CUE.
    final cues = files.where((f) => f.extension == 'cue').toList();
    final bins = files.where((f) => f.extension == 'bin').toList();
    if (cues.length == 1 && bins.isNotEmpty) {
      if (bins.length > 1) {
        warnings.add(
          'This rip has ${bins.length} BIN tracks. Only the data track can '
          'become an ISO — CD audio tracks will be left out, so music may be '
          'missing in-game. Keeping the original BIN/CUE is usually better.',
        );
      }
      final dataBin = bins.reduce(
        (a, b) => a.uncompressedSize >= b.uncompressedSize ? a : b,
      );
      return DiscPlan(
        strategy: DiscStrategy.binCue,
        reason: 'Found a BIN/CUE rip. The data track will be converted to a '
            'true 2048-byte-sector ISO.',
        primaryEntry: dataBin,
        cueEntry: cues.first,
        warnings: warnings,
      );
    }

    // Case 2: a single raw image, optionally alongside small side files
    // (readme, cover art, save data) that are not part of the disc.
    //
    // An extracted game folder is the trap here: `PSP_GAME/SYSDIR/EBOOT.BIN`
    // ends in `.bin` but is emphatically not a disc image. Treat ambiguous
    // extensions as images only when the archive shows no sign of being a
    // game directory.
    final looksLikeGameFolder = files.any(
      (f) => kGameFolderMarkers.contains(f.baseName.toLowerCase()),
    );
    final images = files.where((f) {
      if (kStrongImageExtensions.contains(f.extension)) return true;
      if (!kAmbiguousImageExtensions.contains(f.extension)) return false;
      if (looksLikeGameFolder) return false;
      if (kGameFolderMarkers.contains(f.baseName.toLowerCase())) return false;
      // A `.bin` buried inside a folder tree is game data, not a rip.
      return !_isNestedInArchive(f, files);
    }).toList()
      ..sort((a, b) => b.uncompressedSize.compareTo(a.uncompressedSize));

    if (images.isNotEmpty) {
      final largest = images.first;
      final othersAreSmall = files
          .where((f) => f != largest)
          .every((f) => f.uncompressedSize < largest.uncompressedSize ~/ 20);

      if (images.length == 1 || othersAreSmall) {
        if (largest.uncompressedSize < minimumPlausibleImageBytes) {
          warnings.add(
            'The image inside is only ${_formatBytes(largest.uncompressedSize)}, '
            'which is far smaller than any real game disc. It may be a '
            'placeholder or a broken download.',
          );
        }
        if (files.length > 1) {
          warnings.add(
            '${files.length - 1} extra file(s) in the archive will be ignored; '
            'only the disc image is converted.',
          );
        }
        return DiscPlan(
          strategy: DiscStrategy.rawImage,
          reason: 'Found a single disc image (${largest.baseName}). It will be '
              'converted to ISO sector layout if needed, or copied as-is when '
              'it is already an ISO.',
          primaryEntry: largest,
          warnings: warnings,
        );
      }
    }

    // Case 3: loose files — build a fresh ISO 9660 filesystem around them.
    return DiscPlan(
      strategy: DiscStrategy.packFiles,
      reason: 'Found ${files.length} loose files. They will be packed into a '
          'new ISO 9660 image with their folder structure preserved.',
      payloadEntries: files,
      warnings: warnings,
    );
  }

  /// A conservative default output name derived from the archive's own name.
  static String suggestOutputName(String zipPath) {
    final stem = p.basenameWithoutExtension(zipPath).trim();
    final cleaned = stem.replaceAll(RegExp(r'[<>:"/\\|?*]'), '_');
    return cleaned.isEmpty ? 'disc.iso' : '$cleaned.iso';
  }

  /// True when [entry] sits inside a subfolder, ignoring a single wrapper
  /// directory that archives commonly add around their whole contents.
  static bool _isNestedInArchive(ZipEntryInfo entry, List<ZipEntryInfo> all) {
    final root = _commonRootFolder(all);
    var path = entry.name;
    if (root != null && path.startsWith('$root/')) {
      path = path.substring(root.length + 1);
    }
    return path.contains('/');
  }

  /// The single top-level folder shared by every entry, if there is one.
  static String? _commonRootFolder(List<ZipEntryInfo> files) {
    String? candidate;
    for (final file in files) {
      final slash = file.name.indexOf('/');
      if (slash <= 0) return null;
      final top = file.name.substring(0, slash);
      candidate ??= top;
      if (candidate != top) return null;
    }
    return candidate;
  }

  static String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    var value = bytes / 1024;
    var unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return '${value.toStringAsFixed(value >= 10 ? 0 : 1)} ${units[unit]}';
  }
}
