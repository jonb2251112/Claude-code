import 'dart:typed_data';

import 'package:archive/archive_io.dart';

/// Wraps an [OutputFileStream] and computes the CRC-32 of everything written
/// through it.
///
/// The `archive` package decrypts ZipCrypto/AES entries without ever checking
/// the result against the CRC stored in the archive. That matters because a
/// *wrong* password does not fail — it produces plausible-looking garbage of
/// exactly the right length. Hashing the bytes as they stream past costs
/// nothing extra in I/O and lets the extractor tell the difference between
/// "decrypted" and "decrypted correctly".
class CrcOutputStream extends OutputStreamBase {
  CrcOutputStream(this._inner);

  final OutputFileStream _inner;
  int _crc = 0;

  /// CRC-32 of all bytes written so far.
  int get crc32 => _crc;

  @override
  int get length => _inner.length;

  @override
  void flush() => _inner.flush();

  @override
  void writeByte(int value) {
    _crc = getCrc32([value], _crc);
    _inner.writeByte(value);
  }

  @override
  void writeBytes(List<int> bytes, [int? len]) {
    final slice = (len == null || len == bytes.length)
        ? bytes
        : bytes.sublist(0, len);
    _crc = getCrc32(slice, _crc);
    _inner.writeBytes(bytes, len);
  }

  @override
  void writeInputStream(InputStreamBase stream) {
    // Hash a copy of the bytes without consuming the caller's stream position.
    final peek = stream.peekBytes(stream.length);
    _crc = getCrc32(peek.toUint8List(), _crc);
    _inner.writeInputStream(stream);
  }

  @override
  void writeUint16(int value) {
    _writeLittleEndian(value, 2);
  }

  @override
  void writeUint32(int value) {
    _writeLittleEndian(value, 4);
  }

  @override
  void writeUint64(int value) {
    _writeLittleEndian(value, 8);
  }

  void _writeLittleEndian(int value, int byteCount) {
    final bytes = Uint8List(byteCount);
    for (var i = 0; i < byteCount; i++) {
      bytes[i] = (value >> (8 * i)) & 0xFF;
    }
    writeBytes(bytes);
  }

  Future<void> close() => _inner.close();
}
