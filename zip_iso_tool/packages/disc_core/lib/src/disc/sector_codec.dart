import 'dart:io';
import 'dart:typed_data';

import '../progress.dart';

/// The 12-byte sync pattern that opens every raw (2352-byte) CD data sector.
const List<int> kRawSectorSync = <int>[
  0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00,
];

const int kIsoSectorSize = 2048;
const int kRawSectorSize = 2352;
const int kMode2SectorSize = 2336;

/// What a raw image's sectors look like.
class SectorLayout {
  const SectorLayout({
    required this.sectorSize,
    required this.userDataOffset,
    required this.description,
  });

  final int sectorSize;
  final int userDataOffset;
  final String description;

  bool get isAlreadyIso => sectorSize == kIsoSectorSize && userDataOffset == 0;

  static const SectorLayout iso = SectorLayout(
    sectorSize: kIsoSectorSize,
    userDataOffset: 0,
    description: '2048-byte sectors (already ISO form)',
  );
  static const SectorLayout mode1Raw = SectorLayout(
    sectorSize: kRawSectorSize,
    userDataOffset: 16,
    description: 'MODE1/2352 raw sectors',
  );
  static const SectorLayout mode2Raw = SectorLayout(
    sectorSize: kRawSectorSize,
    userDataOffset: 24,
    description: 'MODE2/2352 raw sectors (Form 1)',
  );
  static const SectorLayout mode2Form1 = SectorLayout(
    sectorSize: kMode2SectorSize,
    userDataOffset: 8,
    description: 'MODE2/2336 sectors',
  );
}

/// Reads and rewrites CD sector layouts.
class SectorCodec {
  /// Inspects the first sectors of [file] to work out its sector layout.
  ///
  /// Returns `null` when the layout cannot be determined, which the caller
  /// should treat as "not a recognisable disc image".
  static Future<SectorLayout?> detectLayout(File file) async {
    final length = await file.length();
    if (length < kRawSectorSize) return null;

    final raf = await file.open();
    try {
      final head = await raf.read(kRawSectorSize * 2);
      if (_hasSyncAt(head, 0)) {
        // Raw sector. Byte 15 of the sector header carries the mode.
        final mode = head.length > 15 ? head[15] : 1;
        if (length % kRawSectorSize == 0) {
          return mode == 2 ? SectorLayout.mode2Raw : SectorLayout.mode1Raw;
        }
        // Sync present but the size does not divide evenly — still usable,
        // we simply ignore the trailing partial sector.
        return mode == 2 ? SectorLayout.mode2Raw : SectorLayout.mode1Raw;
      }

      // No sync: either a cooked 2048 image or a 2336 MODE2 image. The ISO
      // 9660 primary volume descriptor sits at sector 16, so check both
      // candidate offsets for the "CD001" magic.
      if (await _hasCd001(raf, sectorSize: kIsoSectorSize, dataOffset: 0)) {
        return SectorLayout.iso;
      }
      if (await _hasCd001(raf, sectorSize: kMode2SectorSize, dataOffset: 8)) {
        return SectorLayout.mode2Form1;
      }
      if (length % kIsoSectorSize == 0) {
        // A UDF-only disc (GameCube/Wii/PS3 images and many PSP ISOs) has no
        // CD001 descriptor but is still a flat 2048-byte image.
        return SectorLayout.iso;
      }
      return null;
    } finally {
      await raf.close();
    }
  }

  /// True when [file] contains an ISO 9660 primary volume descriptor at the
  /// standard place for [layout].
  static Future<bool> hasIso9660Descriptor(
    File file,
    SectorLayout layout,
  ) async {
    final raf = await file.open();
    try {
      return await _hasCd001(
        raf,
        sectorSize: layout.sectorSize,
        dataOffset: layout.userDataOffset,
      );
    } finally {
      await raf.close();
    }
  }

  static Future<bool> _hasCd001(
    RandomAccessFile raf, {
    required int sectorSize,
    required int dataOffset,
  }) async {
    final position = 16 * sectorSize + dataOffset;
    final length = await raf.length();
    if (position + 6 > length) return false;
    await raf.setPosition(position);
    final magic = await raf.read(6);
    return magic.length >= 6 &&
        magic[1] == 0x43 && // C
        magic[2] == 0x44 && // D
        magic[3] == 0x30 && // 0
        magic[4] == 0x30 && // 0
        magic[5] == 0x31; //  1
  }

  static bool _hasSyncAt(Uint8List data, int offset) {
    if (offset + kRawSectorSync.length > data.length) return false;
    for (var i = 0; i < kRawSectorSync.length; i++) {
      if (data[offset + i] != kRawSectorSync[i]) return false;
    }
    return true;
  }

  /// Copies the 2048-byte user data out of every sector of [source] into
  /// [destination], turning a raw BIN into a true ISO.
  ///
  /// Streams through a fixed buffer, so memory use is independent of image size.
  static Future<int> convertToIso({
    required File source,
    required File destination,
    required SectorLayout layout,
    ProgressSink onProgress = discardProgress,
    String stage = 'Converting sectors',
  }) async {
    if (layout.isAlreadyIso) {
      return copyStream(
        source: source,
        destination: destination,
        onProgress: onProgress,
        stage: stage,
      );
    }

    final total = await source.length();
    final sectorCount = total ~/ layout.sectorSize;
    if (sectorCount == 0) {
      throw const DiscCoreException(
        'This disc image is too small to contain any sectors.',
      );
    }

    // Process ~1000 sectors per read to keep syscall overhead low without
    // allocating more than a couple of megabytes.
    const sectorsPerChunk = 1024;
    final input = await source.open();
    final output = await destination.open(mode: FileMode.write);
    var written = 0;
    try {
      final chunk = Uint8List(layout.sectorSize * sectorsPerChunk);
      final outBuffer = Uint8List(kIsoSectorSize * sectorsPerChunk);
      var sectorsDone = 0;

      while (sectorsDone < sectorCount) {
        final wanted = (sectorCount - sectorsDone).clamp(1, sectorsPerChunk);
        final bytesWanted = wanted * layout.sectorSize;
        final read = await input.readInto(chunk, 0, bytesWanted);
        if (read < layout.sectorSize) break;
        final fullSectors = read ~/ layout.sectorSize;

        for (var i = 0; i < fullSectors; i++) {
          final from = i * layout.sectorSize + layout.userDataOffset;
          outBuffer.setRange(
            i * kIsoSectorSize,
            (i + 1) * kIsoSectorSize,
            chunk,
            from,
          );
        }
        final outBytes = fullSectors * kIsoSectorSize;
        await output.writeFrom(outBuffer, 0, outBytes);
        written += outBytes;
        sectorsDone += fullSectors;

        onProgress(ProgressUpdate(
          stage: stage,
          processed: sectorsDone * layout.sectorSize,
          total: total,
        ));
      }
    } finally {
      await input.close();
      await output.close();
    }

    onProgress(ProgressUpdate(stage: stage, processed: total, total: total));
    return written;
  }

  /// Streams [source] to [destination] with progress. Used when the payload is
  /// already a flat 2048-byte image and only needs to be moved into place.
  static Future<int> copyStream({
    required File source,
    required File destination,
    ProgressSink onProgress = discardProgress,
    String stage = 'Copying image',
  }) async {
    final total = await source.length();
    final sink = destination.openWrite();
    var written = 0;
    try {
      await for (final chunk in source.openRead()) {
        sink.add(chunk);
        written += chunk.length;
        onProgress(ProgressUpdate(
          stage: stage,
          processed: written,
          total: total,
        ));
      }
      await sink.flush();
    } finally {
      await sink.close();
    }
    return written;
  }
}
