/// Parser for the subset of the CUE sheet format that matters when deciding
/// how to turn a ripped disc into an ISO.
///
/// We care about three things: which BIN files back the sheet, what sector
/// mode the data track uses, and whether there are CD-DA audio tracks (which
/// an ISO physically cannot represent).
library;

import 'dart:convert' show LineSplitter;

class CueTrack {
  const CueTrack({
    required this.number,
    required this.type,
    required this.fileName,
  });

  final int number;

  /// Raw CUE track type, e.g. `MODE1/2352`, `MODE2/2352`, `AUDIO`.
  final String type;

  /// The FILE this track belongs to.
  final String fileName;

  bool get isAudio => type.toUpperCase().startsWith('AUDIO');

  /// Bytes per sector for this track, or `null` if the type is unrecognised.
  int? get sectorSize {
    final slash = type.indexOf('/');
    if (slash < 0) return isAudio ? 2352 : null;
    return int.tryParse(type.substring(slash + 1).trim());
  }

  /// Offset of the 2048-byte user data within a raw sector.
  ///
  /// MODE1/2352: 12-byte sync + 4-byte header, data at 16.
  /// MODE2/2352: sync + header + 8-byte subheader, Form 1 data at 24.
  /// MODE2/2336: subheader only, data at 8.
  int? get userDataOffset {
    final upper = type.toUpperCase();
    final size = sectorSize;
    if (size == 2048) return 0;
    if (upper.startsWith('MODE1') && size == 2352) return 16;
    if (upper.startsWith('MODE2') && size == 2352) return 24;
    if (upper.startsWith('MODE2') && size == 2336) return 8;
    return null;
  }
}

class CueSheet {
  const CueSheet({required this.files, required this.tracks});

  /// FILE names referenced by the sheet, in order of appearance.
  final List<String> files;
  final List<CueTrack> tracks;

  bool get hasAudioTracks => tracks.any((t) => t.isAudio);

  List<CueTrack> get dataTracks => tracks.where((t) => !t.isAudio).toList();

  /// True for the common case of one data track in one BIN file — the only
  /// shape that converts losslessly to a single ISO.
  bool get isSingleDataTrack =>
      files.length == 1 && tracks.length == 1 && !tracks.first.isAudio;

  static final RegExp _fileLine = RegExp(
    r'^\s*FILE\s+(?:"([^"]*)"|(\S+))\s+(\S+)\s*$',
    caseSensitive: false,
  );
  static final RegExp _trackLine = RegExp(
    r'^\s*TRACK\s+(\d+)\s+(\S+)\s*$',
    caseSensitive: false,
  );

  /// Parses CUE text. Unknown commands (INDEX, PREGAP, REM, PERFORMER…) are
  /// ignored, which is what every real CUE reader does.
  static CueSheet parse(String text) {
    final files = <String>[];
    final tracks = <CueTrack>[];
    String? currentFile;

    for (final rawLine in const LineSplitter().convert(text)) {
      final fileMatch = _fileLine.firstMatch(rawLine);
      if (fileMatch != null) {
        currentFile = fileMatch.group(1) ?? fileMatch.group(2) ?? '';
        files.add(currentFile);
        continue;
      }
      final trackMatch = _trackLine.firstMatch(rawLine);
      if (trackMatch != null) {
        tracks.add(CueTrack(
          number: int.parse(trackMatch.group(1)!),
          type: trackMatch.group(2)!,
          fileName: currentFile ?? '',
        ));
      }
    }

    return CueSheet(files: files, tracks: tracks);
  }
}
