import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import '../progress.dart';

/// One entry read straight from a ZIP central directory.
class ZipEntryInfo {
  const ZipEntryInfo({
    required this.name,
    required this.compressedSize,
    required this.uncompressedSize,
    required this.isEncrypted,
    required this.isDirectory,
    required this.compressionMethod,
  });

  final String name;
  final int compressedSize;
  final int uncompressedSize;
  final bool isEncrypted;
  final bool isDirectory;

  /// 0 = stored, 8 = deflate, 99 = AES (WinZip AE-x).
  final int compressionMethod;

  String get extension {
    final dot = name.lastIndexOf('.');
    if (dot < 0 || dot == name.length - 1) return '';
    return name.substring(dot + 1).toLowerCase();
  }

  /// Last path segment.
  String get baseName {
    final slash = name.lastIndexOf('/');
    return slash < 0 ? name : name.substring(slash + 1);
  }
}

/// The result of reading a ZIP's central directory without decompressing it.
class ZipSummary {
  const ZipSummary({
    required this.entries,
    required this.isEncrypted,
    required this.totalUncompressedSize,
    required this.usesAes,
  });

  final List<ZipEntryInfo> entries;

  /// True when at least one *file* entry is encrypted.
  final bool isEncrypted;

  /// Sum of uncompressed sizes of all file entries.
  final int totalUncompressedSize;

  /// True when encryption is WinZip AES rather than legacy ZipCrypto.
  final bool usesAes;

  Iterable<ZipEntryInfo> get files => entries.where((e) => !e.isDirectory);

  int get fileCount => files.length;
}

const int _eocdSignature = 0x06054b50;
const int _eocd64Signature = 0x06064b50;
const int _eocd64LocatorSignature = 0x07064b50;
const int _centralFileSignature = 0x02014b50;

/// Reads a ZIP's central directory to learn what is inside it — entry names,
/// sizes and whether it is encrypted — without inflating any data.
///
/// This is what lets the UI ask for a password *before* handing the job to a
/// background isolate, and lets the converter classify a ZIP's contents
/// cheaply even when the archive is several gigabytes.
///
/// Throws [DiscCoreException] when the file is not a readable ZIP.
class ZipInspector {
  /// Maximum number of bytes searched backwards for the end-of-central-directory
  /// record. The ZIP comment it may sit behind is capped at 64 KiB by the spec.
  static const int _maxCommentScan = 66 * 1024;

  static Future<ZipSummary> inspect(File file) async {
    final length = await file.length();
    if (length < 22) {
      throw const DiscCoreException(
        'This file is too small to be a ZIP archive.',
      );
    }

    final raf = await file.open();
    try {
      final tailLength = length < _maxCommentScan ? length : _maxCommentScan;
      await raf.setPosition(length - tailLength);
      final tail = await raf.read(tailLength);
      final eocdOffsetInTail = _findLastSignature(tail, _eocdSignature);
      if (eocdOffsetInTail < 0) {
        throw const DiscCoreException(
          'This does not look like a ZIP archive — its end-of-archive record '
          'is missing. The file may be corrupted or only partially downloaded.',
        );
      }

      final eocd = ByteData.sublistView(tail, eocdOffsetInTail);
      var entryCount = eocd.getUint16(10, Endian.little);
      var directorySize = eocd.getUint32(12, Endian.little);
      var directoryOffset = eocd.getUint32(16, Endian.little);

      // ZIP64: the 32-bit fields saturate and the real values live in the
      // ZIP64 end-of-central-directory record.
      if (directoryOffset == 0xFFFFFFFF ||
          directorySize == 0xFFFFFFFF ||
          entryCount == 0xFFFF) {
        final locatorInTail =
            _findLastSignature(tail, _eocd64LocatorSignature);
        if (locatorInTail < 0) {
          throw const DiscCoreException(
            'This ZIP declares ZIP64 sizes but is missing its ZIP64 locator, '
            'so it cannot be read.',
          );
        }
        final locator = ByteData.sublistView(tail, locatorInTail);
        final eocd64Offset = locator.getUint64(8, Endian.little);
        await raf.setPosition(eocd64Offset);
        final eocd64 = ByteData.sublistView(await raf.read(56));
        if (eocd64.getUint32(0, Endian.little) != _eocd64Signature) {
          throw const DiscCoreException(
            'This ZIP\'s ZIP64 header is invalid, so it cannot be read.',
          );
        }
        entryCount = eocd64.getUint64(32, Endian.little);
        directorySize = eocd64.getUint64(40, Endian.little);
        directoryOffset = eocd64.getUint64(48, Endian.little);
      }

      if (directoryOffset + directorySize > length) {
        throw const DiscCoreException(
          'This ZIP is truncated — its file index points past the end of the '
          'file. Try downloading or copying it again.',
        );
      }

      await raf.setPosition(directoryOffset);
      final directory = await raf.read(directorySize);
      return _parseCentralDirectory(directory, entryCount);
    } on DiscCoreException {
      rethrow;
    } on FileSystemException catch (e) {
      throw DiscCoreException('Could not read the ZIP file: ${e.message}');
    } finally {
      await raf.close();
    }
  }

  static ZipSummary _parseCentralDirectory(Uint8List directory, int expected) {
    final view = ByteData.sublistView(directory);
    final entries = <ZipEntryInfo>[];
    var offset = 0;
    var anyEncrypted = false;
    var anyAes = false;
    var totalUncompressed = 0;

    while (offset + 46 <= directory.length && entries.length < expected) {
      if (view.getUint32(offset, Endian.little) != _centralFileSignature) break;

      final flags = view.getUint16(offset + 8, Endian.little);
      final method = view.getUint16(offset + 10, Endian.little);
      var compressedSize = view.getUint32(offset + 20, Endian.little);
      var uncompressedSize = view.getUint32(offset + 24, Endian.little);
      final nameLength = view.getUint16(offset + 28, Endian.little);
      final extraLength = view.getUint16(offset + 30, Endian.little);
      final commentLength = view.getUint16(offset + 32, Endian.little);

      final nameStart = offset + 46;
      final nameEnd = nameStart + nameLength;
      if (nameEnd > directory.length) break;
      final name = _decodeName(
        Uint8List.sublistView(directory, nameStart, nameEnd),
        utf8Flag: flags & 0x0800 != 0,
      );

      if (compressedSize == 0xFFFFFFFF || uncompressedSize == 0xFFFFFFFF) {
        final extra = Uint8List.sublistView(
          directory,
          nameEnd,
          (nameEnd + extraLength).clamp(0, directory.length),
        );
        final zip64 = _readZip64Extra(extra);
        if (zip64 != null) {
          uncompressedSize = zip64.$1 ?? uncompressedSize;
          compressedSize = zip64.$2 ?? compressedSize;
        }
      }

      final isDirectory = name.endsWith('/');
      final encrypted = !isDirectory && (flags & 0x0001) != 0;
      if (encrypted) {
        anyEncrypted = true;
        if (method == 99) anyAes = true;
      }
      if (!isDirectory) totalUncompressed += uncompressedSize;

      entries.add(ZipEntryInfo(
        name: name,
        compressedSize: compressedSize,
        uncompressedSize: uncompressedSize,
        isEncrypted: encrypted,
        isDirectory: isDirectory,
        compressionMethod: method,
      ));

      offset = nameEnd + extraLength + commentLength;
    }

    if (entries.isEmpty) {
      throw const DiscCoreException(
        'This ZIP appears to be empty or its file index is unreadable.',
      );
    }

    return ZipSummary(
      entries: entries,
      isEncrypted: anyEncrypted,
      totalUncompressedSize: totalUncompressed,
      usesAes: anyAes,
    );
  }

  /// Returns `(uncompressedSize, compressedSize)` from a ZIP64 extra field.
  static (int?, int?)? _readZip64Extra(Uint8List extra) {
    final view = ByteData.sublistView(extra);
    var offset = 0;
    while (offset + 4 <= extra.length) {
      final id = view.getUint16(offset, Endian.little);
      final size = view.getUint16(offset + 2, Endian.little);
      final body = offset + 4;
      if (body + size > extra.length) return null;
      if (id == 0x0001) {
        final uncompressed =
            size >= 8 ? view.getUint64(body, Endian.little) : null;
        final compressed =
            size >= 16 ? view.getUint64(body + 8, Endian.little) : null;
        return (uncompressed, compressed);
      }
      offset = body + size;
    }
    return null;
  }

  /// ZIP names are UTF-8 only when bit 11 is set; otherwise they are nominally
  /// CP437. We decode the ASCII range directly and fall back to UTF-8 for the
  /// rest, which is what real-world archives from other platforms use.
  static String _decodeName(Uint8List bytes, {required bool utf8Flag}) {
    if (!utf8Flag && bytes.every((b) => b < 0x80)) {
      return String.fromCharCodes(bytes);
    }
    try {
      return const Utf8Codec(allowMalformed: true).decode(bytes);
    } catch (_) {
      return String.fromCharCodes(bytes);
    }
  }

  static int _findLastSignature(Uint8List data, int signature) {
    final b0 = signature & 0xFF;
    final b1 = (signature >> 8) & 0xFF;
    final b2 = (signature >> 16) & 0xFF;
    final b3 = (signature >> 24) & 0xFF;
    for (var i = data.length - 4; i >= 0; i--) {
      if (data[i] == b0 &&
          data[i + 1] == b1 &&
          data[i + 2] == b2 &&
          data[i + 3] == b3) {
        return i;
      }
    }
    return -1;
  }
}
