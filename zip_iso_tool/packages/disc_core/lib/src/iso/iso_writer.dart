import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:path/path.dart' as p;

import '../progress.dart';

const int _sectorSize = 2048;
const int _systemAreaSectors = 16;

/// A file to be placed into the generated image.
class IsoSourceFile {
  IsoSourceFile({required this.file, required String relativePath})
      : relativePath = _normalize(relativePath);

  final File file;

  /// Path inside the image, using `/` separators and no leading slash.
  final String relativePath;

  static String _normalize(String path) {
    final parts = p
        .split(path.replaceAll('\\', '/'))
        .where((s) => s.isNotEmpty && s != '.' && s != '..')
        .toList();
    return parts.join('/');
  }
}

/// Builds a standards-compliant ISO 9660 image with a Joliet supplementary
/// descriptor, so both classic readers and anything expecting long/Unicode
/// names (which is most emulators and every desktop OS) can read it.
///
/// The writer streams file payloads sector by sector, so images far larger
/// than available RAM can be produced on a phone.
class IsoWriter {
  /// Writes an image containing [files] to [output].
  ///
  /// [volumeName] is trimmed to the 32-character ISO limit and upper-cased for
  /// the primary descriptor; the Joliet descriptor keeps the original text.
  static Future<IsoWriteResult> write({
    required List<IsoSourceFile> files,
    required File output,
    String volumeName = 'DISC',
    DateTime? timestamp,
    ProgressSink onProgress = discardProgress,
  }) async {
    if (files.isEmpty) {
      throw const DiscCoreException(
        'There are no files to put into the image.',
      );
    }

    final now = timestamp ?? DateTime.now();
    onProgress(const ProgressUpdate(stage: 'Building image layout'));

    // ---- 1. Build the directory tree -------------------------------------
    final root = _Node.directory('');
    final sizes = <String, int>{};
    for (final source in files) {
      if (source.relativePath.isEmpty) continue;
      final length = await source.file.length();
      sizes[source.file.path] = length;
      final segments = source.relativePath.split('/');
      var current = root;
      for (var i = 0; i < segments.length - 1; i++) {
        current = current.childDirectory(segments[i]);
      }
      current.children.add(
        _Node.file(segments.last, source.file, length),
      );
    }

    // ---- 2. Assign identifiers -------------------------------------------
    _assignIdentifiers(root);

    // ---- 3. Order directories for the path tables ------------------------
    // ECMA-119 requires path table entries in breadth-first order with each
    // entry's parent appearing before it.
    final primaryDirs = _breadthFirstDirectories(root, joliet: false);
    final jolietDirs = _breadthFirstDirectories(root, joliet: true);

    // ---- 4. Size every directory extent ----------------------------------
    for (final dir in primaryDirs) {
      dir.primaryExtentLength = _directoryExtentLength(dir, joliet: false);
    }
    for (final dir in jolietDirs) {
      dir.jolietExtentLength = _directoryExtentLength(dir, joliet: true);
    }

    final primaryPathTableSize = _pathTableSize(primaryDirs, joliet: false);
    final jolietPathTableSize = _pathTableSize(jolietDirs, joliet: true);

    // ---- 5. Assign logical block addresses -------------------------------
    var lba = _systemAreaSectors + 3; // PVD, SVD, terminator

    final primaryPathTableL = lba;
    lba += _sectorsFor(primaryPathTableSize);
    final primaryPathTableM = lba;
    lba += _sectorsFor(primaryPathTableSize);
    final jolietPathTableL = lba;
    lba += _sectorsFor(jolietPathTableSize);
    final jolietPathTableM = lba;
    lba += _sectorsFor(jolietPathTableSize);

    for (final dir in primaryDirs) {
      dir.primaryExtent = lba;
      lba += _sectorsFor(dir.primaryExtentLength);
    }
    for (final dir in jolietDirs) {
      dir.jolietExtent = lba;
      lba += _sectorsFor(dir.jolietExtentLength);
    }

    // File payloads are shared between the two directory hierarchies: both
    // descriptors point at the same extents, which is exactly what mkisofs does.
    final payloads = <_Node>[];
    void collectFiles(_Node dir) {
      for (final child in dir.children) {
        if (child.isDirectory) {
          collectFiles(child);
        } else {
          child.dataExtent = lba;
          lba += _sectorsFor(child.length);
          payloads.add(child);
        }
      }
    }

    collectFiles(root);
    final totalSectors = lba;
    final totalBytes = totalSectors * _sectorSize;

    // ---- 6. Write ---------------------------------------------------------
    await output.parent.create(recursive: true);
    final sink = await output.open(mode: FileMode.write);
    var sectorsWritten = 0;

    Future<void> writeSector(Uint8List sector) async {
      assert(sector.length == _sectorSize);
      await sink.writeFrom(sector);
      sectorsWritten++;
    }

    try {
      final blank = Uint8List(_sectorSize);
      for (var i = 0; i < _systemAreaSectors; i++) {
        await writeSector(blank);
      }

      await writeSector(_volumeDescriptor(
        type: 1,
        volumeName: volumeName,
        totalSectors: totalSectors,
        pathTableSize: primaryPathTableSize,
        pathTableL: primaryPathTableL,
        pathTableM: primaryPathTableM,
        root: root,
        joliet: false,
        now: now,
      ));
      await writeSector(_volumeDescriptor(
        type: 2,
        volumeName: volumeName,
        totalSectors: totalSectors,
        pathTableSize: jolietPathTableSize,
        pathTableL: jolietPathTableL,
        pathTableM: jolietPathTableM,
        root: root,
        joliet: true,
        now: now,
      ));
      await writeSector(_terminator());

      await _writeSectors(
        writeSector,
        _pathTable(primaryDirs, joliet: false, endian: Endian.little),
      );
      await _writeSectors(
        writeSector,
        _pathTable(primaryDirs, joliet: false, endian: Endian.big),
      );
      await _writeSectors(
        writeSector,
        _pathTable(jolietDirs, joliet: true, endian: Endian.little),
      );
      await _writeSectors(
        writeSector,
        _pathTable(jolietDirs, joliet: true, endian: Endian.big),
      );

      for (final dir in primaryDirs) {
        await _writeSectors(
          writeSector,
          _directoryExtent(dir, joliet: false, now: now),
        );
      }
      for (final dir in jolietDirs) {
        await _writeSectors(
          writeSector,
          _directoryExtent(dir, joliet: true, now: now),
        );
      }

      final buffer = Uint8List(_sectorSize * 64);
      for (final node in payloads) {
        onProgress(ProgressUpdate(
          stage: 'Writing image',
          detail: node.name,
          processed: sectorsWritten * _sectorSize,
          total: totalBytes,
        ));
        final input = await node.source!.open();
        try {
          var remaining = node.length;
          while (remaining > 0) {
            final want = remaining < buffer.length ? remaining : buffer.length;
            final read = await input.readInto(buffer, 0, want);
            if (read <= 0) {
              throw DiscCoreException(
                'The file "${node.name}" ended earlier than expected while '
                'the image was being written. It may have been moved or '
                'deleted mid-conversion.',
              );
            }
            // Pad the final partial sector with zeros.
            final padded = (read + _sectorSize - 1) ~/ _sectorSize * _sectorSize;
            if (padded > read) {
              buffer.fillRange(read, padded, 0);
            }
            await sink.writeFrom(buffer, 0, padded);
            sectorsWritten += padded ~/ _sectorSize;
            remaining -= read;

            onProgress(ProgressUpdate(
              stage: 'Writing image',
              detail: node.name,
              processed: sectorsWritten * _sectorSize,
              total: totalBytes,
            ));
          }
        } finally {
          await input.close();
        }
      }
    } finally {
      await sink.close();
    }

    onProgress(ProgressUpdate(
      stage: 'Writing image',
      processed: totalBytes,
      total: totalBytes,
    ));

    return IsoWriteResult(
      path: output.path,
      sizeInBytes: totalSectors * _sectorSize,
      fileCount: payloads.length,
      volumeName: volumeName,
    );
  }

  // --------------------------------------------------------------------------
  // Layout helpers
  // --------------------------------------------------------------------------

  static int _sectorsFor(int bytes) =>
      (bytes + _sectorSize - 1) ~/ _sectorSize;

  static Future<void> _writeSectors(
    Future<void> Function(Uint8List) writeSector,
    Uint8List data,
  ) async {
    final sectors = _sectorsFor(data.length);
    for (var i = 0; i < sectors; i++) {
      final sector = Uint8List(_sectorSize);
      final start = i * _sectorSize;
      final end = ((i + 1) * _sectorSize).clamp(0, data.length);
      if (end > start) {
        sector.setRange(0, end - start, data, start);
      }
      await writeSector(sector);
    }
  }

  static List<_Node> _breadthFirstDirectories(_Node root, {required bool joliet}) {
    final ordered = <_Node>[root];
    root.setPathIndex(joliet, 1);
    var cursor = 0;
    while (cursor < ordered.length) {
      final dir = ordered[cursor];
      final subdirs = dir.children.where((c) => c.isDirectory).toList()
        ..sort((a, b) => _compareIdentifiers(
              joliet ? a.jolietId : a.primaryId,
              joliet ? b.jolietId : b.primaryId,
            ));
      for (final sub in subdirs) {
        sub.parent = dir;
        sub.setPathIndex(joliet, ordered.length + 1);
        ordered.add(sub);
      }
      cursor++;
    }
    return ordered;
  }

  static int _directoryExtentLength(_Node dir, {required bool joliet}) {
    var length = _recordLength(1) * 2; // "." and ".."
    var sectorRemaining = _sectorSize - length;
    for (final child in _sortedChildren(dir, joliet: joliet)) {
      final id = joliet ? child.jolietId : child.primaryId;
      final size = _recordLength(_identifierBytes(id, joliet).length);
      if (size > sectorRemaining) {
        // A directory record may not straddle a sector boundary.
        length += sectorRemaining;
        sectorRemaining = _sectorSize;
      }
      length += size;
      sectorRemaining -= size;
    }
    return length;
  }

  static List<_Node> _sortedChildren(_Node dir, {required bool joliet}) {
    final children = List<_Node>.from(dir.children);
    children.sort((a, b) {
      final byName = _compareIdentifiers(
        joliet ? a.jolietId : a.primaryId,
        joliet ? b.jolietId : b.primaryId,
      );
      return byName;
    });
    return children;
  }

  /// ISO 9660 orders identifiers by their byte values with the shorter name
  /// padded — plain byte comparison with a length tie-break matches that.
  static int _compareIdentifiers(String a, String b) {
    final ua = a.codeUnits;
    final ub = b.codeUnits;
    final min = ua.length < ub.length ? ua.length : ub.length;
    for (var i = 0; i < min; i++) {
      if (ua[i] != ub[i]) return ua[i] - ub[i];
    }
    return ua.length - ub.length;
  }

  static int _recordLength(int identifierLength) {
    final base = 33 + identifierLength;
    return base.isOdd ? base + 1 : base;
  }

  static Uint8List _identifierBytes(String id, bool joliet) {
    if (!joliet) return Uint8List.fromList(latin1.encode(id));
    final out = Uint8List(id.codeUnits.length * 2);
    var i = 0;
    for (final unit in id.codeUnits) {
      out[i++] = (unit >> 8) & 0xFF;
      out[i++] = unit & 0xFF;
    }
    return out;
  }

  static int _pathTableSize(List<_Node> dirs, {required bool joliet}) {
    var total = 0;
    for (final dir in dirs) {
      final idLength = dir.parent == null
          ? 1
          : _identifierBytes(joliet ? dir.jolietId : dir.primaryId, joliet)
              .length;
      final size = 8 + idLength;
      total += size.isOdd ? size + 1 : size;
    }
    return total;
  }

  // --------------------------------------------------------------------------
  // Structure serialisation
  // --------------------------------------------------------------------------

  static Uint8List _pathTable(
    List<_Node> dirs, {
    required bool joliet,
    required Endian endian,
  }) {
    final size = _pathTableSize(dirs, joliet: joliet);
    final out = Uint8List(size);
    final view = ByteData.sublistView(out);
    var offset = 0;
    for (final dir in dirs) {
      final isRoot = dir.parent == null;
      final id = isRoot
          ? Uint8List.fromList([0])
          : _identifierBytes(joliet ? dir.jolietId : dir.primaryId, joliet);
      out[offset] = id.length;
      out[offset + 1] = 0; // extended attribute length
      view.setUint32(
        offset + 2,
        joliet ? dir.jolietExtent : dir.primaryExtent,
        endian,
      );
      view.setUint16(
        offset + 6,
        isRoot ? 1 : dir.parent!.pathIndex(joliet),
        endian,
      );
      out.setRange(offset + 8, offset + 8 + id.length, id);
      offset += 8 + id.length;
      if (id.length.isOdd) offset++; // padding byte
    }
    return out;
  }

  static Uint8List _directoryExtent(
    _Node dir, {
    required bool joliet,
    required DateTime now,
  }) {
    final length = joliet ? dir.jolietExtentLength : dir.primaryExtentLength;
    final out = Uint8List(_sectorsFor(length) * _sectorSize);
    var offset = 0;

    // "." points at this directory, ".." at its parent (root's ".." is itself).
    final self = joliet ? dir.jolietExtent : dir.primaryExtent;
    final selfLength = joliet ? dir.jolietExtentLength : dir.primaryExtentLength;
    final parent = dir.parent ?? dir;
    final parentExtent = joliet ? parent.jolietExtent : parent.primaryExtent;
    final parentLength =
        joliet ? parent.jolietExtentLength : parent.primaryExtentLength;

    offset += _writeRecord(
      out,
      offset,
      identifier: Uint8List.fromList([0]),
      extent: self,
      dataLength: selfLength,
      isDirectory: true,
      now: now,
    );
    offset += _writeRecord(
      out,
      offset,
      identifier: Uint8List.fromList([1]),
      extent: parentExtent,
      dataLength: parentLength,
      isDirectory: true,
      now: now,
    );

    for (final child in _sortedChildren(dir, joliet: joliet)) {
      final id = _identifierBytes(
        joliet ? child.jolietId : child.primaryId,
        joliet,
      );
      final recordLength = _recordLength(id.length);
      final positionInSector = offset % _sectorSize;
      if (positionInSector + recordLength > _sectorSize) {
        offset += _sectorSize - positionInSector;
      }
      offset += _writeRecord(
        out,
        offset,
        identifier: id,
        extent: child.isDirectory
            ? (joliet ? child.jolietExtent : child.primaryExtent)
            : child.dataExtent,
        dataLength: child.isDirectory
            ? (joliet ? child.jolietExtentLength : child.primaryExtentLength)
            : child.length,
        isDirectory: child.isDirectory,
        now: now,
      );
    }

    return out;
  }

  static int _writeRecord(
    Uint8List out,
    int offset, {
    required Uint8List identifier,
    required int extent,
    required int dataLength,
    required bool isDirectory,
    required DateTime now,
  }) {
    final length = _recordLength(identifier.length);
    final view = ByteData.sublistView(out);
    out[offset] = length;
    out[offset + 1] = 0; // extended attribute record length
    _setBoth32(view, offset + 2, extent);
    _setBoth32(view, offset + 10, dataLength);
    _writeRecordingDate(out, offset + 18, now);
    out[offset + 25] = isDirectory ? 0x02 : 0x00;
    out[offset + 26] = 0; // file unit size
    out[offset + 27] = 0; // interleave gap size
    _setBoth16(view, offset + 28, 1); // volume sequence number
    out[offset + 32] = identifier.length;
    out.setRange(offset + 33, offset + 33 + identifier.length, identifier);
    return length;
  }

  static Uint8List _volumeDescriptor({
    required int type,
    required String volumeName,
    required int totalSectors,
    required int pathTableSize,
    required int pathTableL,
    required int pathTableM,
    required _Node root,
    required bool joliet,
    required DateTime now,
  }) {
    final out = Uint8List(_sectorSize);
    final view = ByteData.sublistView(out);

    out[0] = type;
    out.setRange(1, 6, ascii.encode('CD001'));
    out[6] = 1; // version

    _setStringField(out, 8, 32, 'ZIP TOOLS', joliet: joliet, aChars: true);
    _setStringField(
      out,
      40,
      32,
      joliet ? volumeName : _isoVolumeName(volumeName),
      joliet: joliet,
      aChars: true,
    );

    _setBoth32(view, 80, totalSectors);

    if (joliet) {
      // Escape sequence "%/E" selects UCS-2 Level 3, the Joliet encoding.
      out[88] = 0x25;
      out[89] = 0x2F;
      out[90] = 0x45;
    }

    _setBoth16(view, 120, 1); // volume set size
    _setBoth16(view, 124, 1); // volume sequence number
    _setBoth16(view, 128, _sectorSize); // logical block size
    _setBoth32(view, 132, pathTableSize);
    view.setUint32(140, pathTableL, Endian.little);
    view.setUint32(144, 0, Endian.little); // optional L path table
    view.setUint32(148, pathTableM, Endian.big);
    view.setUint32(152, 0, Endian.big); // optional M path table

    // Root directory record, inlined into the descriptor.
    final rootRecord = Uint8List(34);
    _writeRecord(
      rootRecord,
      0,
      identifier: Uint8List.fromList([0]),
      extent: joliet ? root.jolietExtent : root.primaryExtent,
      dataLength: joliet ? root.jolietExtentLength : root.primaryExtentLength,
      isDirectory: true,
      now: now,
    );
    out.setRange(156, 190, rootRecord);

    _setStringField(out, 190, 128, '', joliet: joliet);
    _setStringField(out, 318, 128, '', joliet: joliet);
    _setStringField(out, 446, 128, '', joliet: joliet);
    _setStringField(out, 574, 128, 'ZIP TOOLS ISO WRITER', joliet: joliet);
    _setStringField(out, 702, 37, '', joliet: joliet);
    _setStringField(out, 739, 37, '', joliet: joliet);
    _setStringField(out, 776, 37, '', joliet: joliet);

    _writeLongDate(out, 813, now); // creation
    _writeLongDate(out, 830, now); // modification
    _writeLongDate(out, 847, null); // expiration
    _writeLongDate(out, 864, now); // effective

    out[881] = 1; // file structure version
    return out;
  }

  static Uint8List _terminator() {
    final out = Uint8List(_sectorSize);
    out[0] = 0xFF;
    out.setRange(1, 6, ascii.encode('CD001'));
    out[6] = 1;
    return out;
  }

  // --------------------------------------------------------------------------
  // Field encoding
  // --------------------------------------------------------------------------

  static void _setBoth16(ByteData view, int offset, int value) {
    view.setUint16(offset, value, Endian.little);
    view.setUint16(offset + 2, value, Endian.big);
  }

  static void _setBoth32(ByteData view, int offset, int value) {
    view.setUint32(offset, value, Endian.little);
    view.setUint32(offset + 4, value, Endian.big);
  }

  /// Writes a space-padded text field. Joliet descriptors store text as
  /// big-endian UCS-2 padded with U+0020.
  static void _setStringField(
    Uint8List out,
    int offset,
    int length,
    String value, {
    required bool joliet,
    bool aChars = false,
  }) {
    if (joliet) {
      var i = offset;
      final end = offset + length;
      for (final unit in value.codeUnits) {
        if (i + 1 >= end) break;
        out[i++] = (unit >> 8) & 0xFF;
        out[i++] = unit & 0xFF;
      }
      while (i + 1 < end) {
        out[i++] = 0x00;
        out[i++] = 0x20;
      }
      if (i < end) out[i] = 0x00;
      return;
    }
    final text = aChars ? _toAChars(value) : value;
    final bytes = latin1.encode(text.padRight(length).substring(0, length));
    out.setRange(offset, offset + length, bytes);
  }

  /// ISO a-characters: uppercase letters, digits and a small punctuation set.
  static String _toAChars(String value) {
    const allowed = ' !"%&\'()*+,-./:;<=>?_';
    final buffer = StringBuffer();
    for (final rune in value.toUpperCase().runes) {
      final char = String.fromCharCode(rune);
      if (RegExp(r'[A-Z0-9]').hasMatch(char) || allowed.contains(char)) {
        buffer.write(char);
      } else {
        buffer.write('_');
      }
    }
    return buffer.toString();
  }

  static String _isoVolumeName(String value) {
    final cleaned = value
        .toUpperCase()
        .replaceAll(RegExp(r'[^A-Z0-9_]'), '_')
        .replaceAll(RegExp(r'_+'), '_');
    final trimmed = cleaned.length > 32 ? cleaned.substring(0, 32) : cleaned;
    return trimmed.isEmpty ? 'DISC' : trimmed;
  }

  /// 7-byte directory-record timestamp.
  static void _writeRecordingDate(Uint8List out, int offset, DateTime time) {
    final t = time.toUtc();
    out[offset] = (t.year - 1900) & 0xFF;
    out[offset + 1] = t.month;
    out[offset + 2] = t.day;
    out[offset + 3] = t.hour;
    out[offset + 4] = t.minute;
    out[offset + 5] = t.second;
    out[offset + 6] = 0; // GMT offset in 15-minute intervals
  }

  /// 17-byte volume-descriptor timestamp. A null [time] writes the "not
  /// specified" form, which is all-zero digits.
  static void _writeLongDate(Uint8List out, int offset, DateTime? time) {
    if (time == null) {
      for (var i = 0; i < 16; i++) {
        out[offset + i] = 0x30; // '0'
      }
      out[offset + 16] = 0;
      return;
    }
    final t = time.toUtc();
    String pad(int value, int width) => value.toString().padLeft(width, '0');
    final text = '${pad(t.year, 4)}${pad(t.month, 2)}${pad(t.day, 2)}'
        '${pad(t.hour, 2)}${pad(t.minute, 2)}${pad(t.second, 2)}'
        '${pad(t.millisecond ~/ 10, 2)}';
    out.setRange(offset, offset + 16, ascii.encode(text));
    out[offset + 16] = 0;
  }

  // --------------------------------------------------------------------------
  // Identifier assignment
  // --------------------------------------------------------------------------

  static void _assignIdentifiers(_Node dir) {
    final usedPrimary = <String>{};
    final usedJoliet = <String>{};
    for (final child in dir.children) {
      child.primaryId = _uniqueName(
        _primaryIdentifier(child.name, isDirectory: child.isDirectory),
        usedPrimary,
        isFile: !child.isDirectory,
      );
      child.jolietId = _uniqueName(
        _jolietIdentifier(child.name, isDirectory: child.isDirectory),
        usedJoliet,
        isFile: !child.isDirectory,
      );
      if (child.isDirectory) _assignIdentifiers(child);
    }
  }

  static String _uniqueName(
    String candidate,
    Set<String> used, {
    required bool isFile,
  }) {
    if (used.add(candidate)) return candidate;
    // Insert a numeric discriminator before the ";1" version suffix.
    final versionAt = isFile ? candidate.lastIndexOf(';') : -1;
    final stem = versionAt < 0 ? candidate : candidate.substring(0, versionAt);
    final suffix = versionAt < 0 ? '' : candidate.substring(versionAt);
    for (var i = 1; i < 10000; i++) {
      final tag = '~$i';
      final room = (isFile ? 30 : 31) - suffix.length - tag.length;
      final base = stem.length > room ? stem.substring(0, room) : stem;
      final attempt = '$base$tag$suffix';
      if (used.add(attempt)) return attempt;
    }
    throw const DiscCoreException(
      'Too many files with conflicting names to fit in an ISO directory.',
    );
  }

  static String _primaryIdentifier(String name, {required bool isDirectory}) {
    String clean(String value) => value
        .toUpperCase()
        .replaceAll(RegExp(r'[^A-Z0-9_]'), '_');

    if (isDirectory) {
      final id = clean(name);
      final trimmed = id.length > 31 ? id.substring(0, 31) : id;
      return trimmed.isEmpty ? 'DIR' : trimmed;
    }

    final dot = name.lastIndexOf('.');
    var stem = dot > 0 ? name.substring(0, dot) : name;
    var ext = dot > 0 ? name.substring(dot + 1) : '';
    stem = clean(stem);
    ext = clean(ext);
    if (ext.length > 3) ext = ext.substring(0, 3);
    if (stem.isEmpty) stem = 'FILE';

    // ";1" plus an optional "." and extension must fit inside 30 characters.
    final room = 30 - 2 - (ext.isEmpty ? 0 : ext.length + 1);
    if (stem.length > room) stem = stem.substring(0, room);
    return ext.isEmpty ? '$stem;1' : '$stem.$ext;1';
  }

  static String _jolietIdentifier(String name, {required bool isDirectory}) {
    // Joliet forbids these characters and caps identifiers at 64 UCS-2 units.
    var clean = name.replaceAll(RegExp(r'[*/:;?\\]'), '_');
    clean = clean.replaceAll(RegExp(r'[\x00-\x1F]'), '');
    if (clean.isEmpty) clean = isDirectory ? 'DIR' : 'FILE';
    final limit = isDirectory ? 64 : 62; // leave room for ";1"
    if (clean.length > limit) {
      if (!isDirectory) {
        final dot = clean.lastIndexOf('.');
        if (dot > 0 && clean.length - dot <= 8) {
          final ext = clean.substring(dot);
          clean = clean.substring(0, limit - ext.length) + ext;
        } else {
          clean = clean.substring(0, limit);
        }
      } else {
        clean = clean.substring(0, limit);
      }
    }
    return isDirectory ? clean : '$clean;1';
  }
}

class IsoWriteResult {
  const IsoWriteResult({
    required this.path,
    required this.sizeInBytes,
    required this.fileCount,
    required this.volumeName,
  });

  final String path;
  final int sizeInBytes;
  final int fileCount;
  final String volumeName;
}

/// Internal tree node — either a directory or a file.
class _Node {
  _Node.directory(this.name)
      : isDirectory = true,
        source = null,
        length = 0;

  _Node.file(this.name, File this.source, this.length) : isDirectory = false;

  final String name;
  final bool isDirectory;
  final File? source;
  final int length;

  final List<_Node> children = [];
  _Node? parent;

  String primaryId = '';
  String jolietId = '';

  int primaryPathIndex = 0;
  int jolietPathIndex = 0;
  int primaryExtent = 0;
  int jolietExtent = 0;
  int primaryExtentLength = 0;
  int jolietExtentLength = 0;
  int dataExtent = 0;

  int pathIndex(bool joliet) => joliet ? jolietPathIndex : primaryPathIndex;

  void setPathIndex(bool joliet, int value) {
    if (joliet) {
      jolietPathIndex = value;
    } else {
      primaryPathIndex = value;
    }
  }

  _Node childDirectory(String name) {
    for (final child in children) {
      if (child.isDirectory && child.name == name) return child;
    }
    final created = _Node.directory(name);
    children.add(created);
    return created;
  }
}
