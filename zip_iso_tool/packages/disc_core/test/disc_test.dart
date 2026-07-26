import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:disc_core/disc_core.dart';
import 'package:path/path.dart' as p;
import 'package:test/test.dart';

import 'test_support.dart';

/// Builds a plausible fake disc image: [sectorCount] sectors, each carrying
/// 2048 bytes of user data wrapped in the requested layout, with an ISO 9660
/// primary volume descriptor at sector 16.
Uint8List buildImage({
  required int sectorCount,
  required int sectorSize,
  required int dataOffset,
  bool mode2 = false,
  bool withDescriptor = true,
}) {
  final out = Uint8List(sectorCount * sectorSize);
  for (var lba = 0; lba < sectorCount; lba++) {
    final base = lba * sectorSize;
    if (sectorSize == 2352) {
      out.setRange(base, base + 12, kRawSectorSync);
      out[base + 12] = 0; // minute
      out[base + 13] = 2; // second
      out[base + 14] = lba & 0xFF; // frame
      out[base + 15] = mode2 ? 2 : 1; // mode
    }
    // Fill user data with a recognisable pattern.
    for (var i = 0; i < 2048; i++) {
      out[base + dataOffset + i] = (lba * 7 + i) % 251;
    }
  }
  if (withDescriptor && sectorCount > 16) {
    final base = 16 * sectorSize + dataOffset;
    out[base] = 1;
    out.setRange(base + 1, base + 6, ascii.encode('CD001'));
    out[base + 6] = 1;
  }
  return out;
}

/// The 2048-byte user data we expect after conversion.
Uint8List expectedUserData(int sectorCount) {
  final out = Uint8List(sectorCount * 2048);
  for (var lba = 0; lba < sectorCount; lba++) {
    for (var i = 0; i < 2048; i++) {
      out[lba * 2048 + i] = (lba * 7 + i) % 251;
    }
  }
  // Mirror the descriptor written by buildImage.
  if (sectorCount > 16) {
    final base = 16 * 2048;
    out[base] = 1;
    out.setRange(base + 1, base + 6, ascii.encode('CD001'));
    out[base + 6] = 1;
  }
  return out;
}

void main() {
  late Directory tmp;

  setUp(() => tmp = Directory.systemTemp.createTempSync('disc_test'));
  tearDown(() => tmp.deleteSync(recursive: true));

  File writeFile(String name, List<int> bytes) {
    final file = File(p.join(tmp.path, name));
    file.parent.createSync(recursive: true);
    file.writeAsBytesSync(bytes);
    return file;
  }

  File buildZip(String name, Map<String, List<int>> entries) {
    final stage = Directory(p.join(tmp.path, 'stage_$name'))
      ..createSync(recursive: true);
    for (final e in entries.entries) {
      final f = File(p.join(stage.path, e.key));
      f.parent.createSync(recursive: true);
      f.writeAsBytesSync(e.value);
    }
    final zipPath = p.join(tmp.path, name);
    final r = Process.runSync('zip', ['-r', '-q', zipPath, '.'],
        workingDirectory: stage.path);
    if (r.exitCode != 0) throw StateError('zip failed: ${r.stderr}');
    return File(zipPath);
  }

  group('CueSheet', () {
    test('parses a single-track MODE1/2352 rip', () {
      final sheet = CueSheet.parse('''
FILE "Crash Bandicoot.bin" BINARY
  TRACK 01 MODE1/2352
    INDEX 01 00:00:00
''');
      expect(sheet.files, ['Crash Bandicoot.bin']);
      expect(sheet.tracks, hasLength(1));
      expect(sheet.isSingleDataTrack, isTrue);
      expect(sheet.hasAudioTracks, isFalse);
      expect(sheet.tracks.first.sectorSize, 2352);
      expect(sheet.tracks.first.userDataOffset, 16);
    });

    test('detects mixed-mode discs with CD audio', () {
      final sheet = CueSheet.parse('''
FILE "game.bin" BINARY
  TRACK 01 MODE2/2352
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    PREGAP 00:02:00
    INDEX 01 12:34:56
''');
      expect(sheet.hasAudioTracks, isTrue);
      expect(sheet.isSingleDataTrack, isFalse);
      expect(sheet.dataTracks.single.userDataOffset, 24);
    });

    test('handles unquoted file names and stray commands', () {
      final sheet = CueSheet.parse('''
REM GENRE Platformer
PERFORMER "Some Studio"
FILE game.bin BINARY
  TRACK 01 MODE1/2048
    INDEX 01 00:00:00
''');
      expect(sheet.files, ['game.bin']);
      expect(sheet.tracks.first.sectorSize, 2048);
      expect(sheet.tracks.first.userDataOffset, 0);
    });

    test('multi-file rips list every FILE', () {
      final sheet = CueSheet.parse('''
FILE "track01.bin" BINARY
  TRACK 01 MODE1/2352
    INDEX 01 00:00:00
FILE "track02.bin" BINARY
  TRACK 02 AUDIO
    INDEX 01 00:00:00
''');
      expect(sheet.files, hasLength(2));
      expect(sheet.tracks.last.fileName, 'track02.bin');
    });
  });

  group('SectorCodec', () {
    test('detects MODE1/2352 from the sync pattern', () async {
      final file = writeFile(
        'mode1.bin',
        buildImage(sectorCount: 20, sectorSize: 2352, dataOffset: 16),
      );
      final layout = await SectorCodec.detectLayout(file);
      expect(layout?.sectorSize, 2352);
      expect(layout?.userDataOffset, 16);
    });

    test('detects MODE2/2352 from the sector header', () async {
      final file = writeFile(
        'mode2.bin',
        buildImage(
          sectorCount: 20,
          sectorSize: 2352,
          dataOffset: 24,
          mode2: true,
        ),
      );
      final layout = await SectorCodec.detectLayout(file);
      expect(layout?.sectorSize, 2352);
      expect(layout?.userDataOffset, 24);
    });

    test('detects an already-cooked 2048 image', () async {
      final file = writeFile(
        'cooked.iso',
        buildImage(sectorCount: 20, sectorSize: 2048, dataOffset: 0),
      );
      final layout = await SectorCodec.detectLayout(file);
      expect(layout?.isAlreadyIso, isTrue);
    });

    test('rejects something that is not a disc image', () async {
      final file = writeFile('junk.bin', List.filled(5000, 0x41));
      expect(await SectorCodec.detectLayout(file), isNull);
    });

    test('converts raw sectors to exactly the right user data', () async {
      final source = writeFile(
        'raw.bin',
        buildImage(sectorCount: 40, sectorSize: 2352, dataOffset: 16),
      );
      final dest = File(p.join(tmp.path, 'out.iso'));

      await SectorCodec.convertToIso(
        source: source,
        destination: dest,
        layout: SectorLayout.mode1Raw,
      );

      expect(dest.lengthSync(), 40 * 2048);
      expect(dest.readAsBytesSync(), equals(expectedUserData(40)));
      expect(
        await SectorCodec.hasIso9660Descriptor(dest, SectorLayout.iso),
        isTrue,
      );
    });

    test('conversion spans many buffer refills without drift', () async {
      // 3000 sectors > the 1024-sector chunk, so this crosses buffer boundaries.
      final source = writeFile(
        'big.bin',
        buildImage(sectorCount: 3000, sectorSize: 2352, dataOffset: 16),
      );
      final dest = File(p.join(tmp.path, 'big.iso'));

      await SectorCodec.convertToIso(
        source: source,
        destination: dest,
        layout: SectorLayout.mode1Raw,
      );

      expect(dest.lengthSync(), 3000 * 2048);
      expect(dest.readAsBytesSync(), equals(expectedUserData(3000)));
    });

    test('progress reaches 100%', () async {
      final source = writeFile(
        'prog.bin',
        buildImage(sectorCount: 100, sectorSize: 2352, dataOffset: 16),
      );
      final updates = <ProgressUpdate>[];
      await SectorCodec.convertToIso(
        source: source,
        destination: File(p.join(tmp.path, 'prog.iso')),
        layout: SectorLayout.mode1Raw,
        onProgress: updates.add,
      );
      expect(updates.last.fraction, 1.0);
    });
  });

  group('DiscDetector', () {
    Future<DiscPlan> planFor(Map<String, List<int>> entries) async {
      final zip = buildZip('plan_${entries.length}_${entries.keys.first.hashCode}.zip', entries);
      return DiscDetector.plan(await ZipInspector.inspect(zip));
    }

    test('recognises a BIN/CUE rip', () async {
      final plan = await planFor({
        'game.bin': List.filled(300000, 1),
        'game.cue': utf8.encode('FILE "game.bin" BINARY\n TRACK 01 MODE1/2352\n'),
      });
      expect(plan.strategy, DiscStrategy.binCue);
      expect(plan.primaryEntry!.baseName, 'game.bin');
      expect(plan.cueEntry!.baseName, 'game.cue');
    });

    test('recognises a lone ISO', () async {
      final plan = await planFor({'game.iso': List.filled(300000, 1)});
      expect(plan.strategy, DiscStrategy.rawImage);
    });

    test('ignores small side files next to a big image', () async {
      final plan = await planFor({
        'game.iso': List.filled(500000, 1),
        'readme.txt': utf8.encode('notes'),
        'cover.png': List.filled(200, 2),
      });
      expect(plan.strategy, DiscStrategy.rawImage);
      expect(plan.primaryEntry!.baseName, 'game.iso');
      expect(plan.warnings, isNotEmpty);
    });

    test('packs loose files into a new image', () async {
      final plan = await planFor({
        'PSP_GAME/SYSDIR/EBOOT.BIN': List.filled(50000, 1),
        'PSP_GAME/PARAM.SFO': List.filled(400, 2),
      });
      expect(plan.strategy, DiscStrategy.packFiles);
      expect(plan.payloadEntries, hasLength(2));
    });

    test('refuses formats it cannot decode, with an explanation', () async {
      final plan = await planFor({'game.chd': List.filled(400000, 1)});
      expect(plan.strategy, DiscStrategy.unsupportedDiscFormat);
      expect(plan.isSupported, isFalse);
      expect(plan.reason, contains('CHD'));
    });

    test('warns about implausibly small images', () async {
      final plan = await planFor({'tiny.iso': List.filled(1000, 1)});
      expect(plan.strategy, DiscStrategy.rawImage);
      expect(plan.warnings.join(' '), contains('smaller than any real game'));
    });

    test('suggests an output name from the archive name', () {
      expect(
        DiscDetector.suggestOutputName('/sd/roms/Metal Gear Solid.zip'),
        'Metal Gear Solid.iso',
      );
    });
  });

  group('ZipToIsoConverter end to end', () {
    test('BIN/CUE rip becomes a true 2048-sector ISO', () async {
      final raw = buildImage(sectorCount: 60, sectorSize: 2352, dataOffset: 16);
      final zip = buildZip('rip.zip', {
        'Crash.bin': raw,
        'Crash.cue': utf8.encode(
          'FILE "Crash.bin" BINARY\n  TRACK 01 MODE1/2352\n    INDEX 01 00:00:00\n',
        ),
      });
      final out = File(p.join(tmp.path, 'Crash.iso'));

      final result = await ZipToIsoConverter.convert(
        source: zip,
        workingDirectory: Directory(p.join(tmp.path, 'work'))..createSync(),
        options: ConvertOptions(outputFile: out),
      );

      expect(result.strategy, DiscStrategy.binCue);
      expect(result.sizeInBytes, 60 * 2048);
      expect(out.readAsBytesSync(), equals(expectedUserData(60)));
      expect(result.details, contains('2048'));
    });

    test('an already-cooked ISO is copied unchanged', () async {
      final cooked = buildImage(sectorCount: 40, sectorSize: 2048, dataOffset: 0);
      final zip = buildZip('cooked.zip', {'game.iso': cooked});
      final out = File(p.join(tmp.path, 'game.iso'));

      final result = await ZipToIsoConverter.convert(
        source: zip,
        workingDirectory: Directory(p.join(tmp.path, 'work2'))..createSync(),
        options: ConvertOptions(outputFile: out),
      );

      expect(result.strategy, DiscStrategy.rawImage);
      expect(out.readAsBytesSync(), equals(cooked));
    });

    test('loose files are packed into a readable ISO', () async {
      skipUnlessIsoinfo();
      final zip = buildZip('loose.zip', {
        'PSP_GAME/SYSDIR/EBOOT.BIN': List.filled(9000, 3),
        'PSP_GAME/PARAM.SFO': List.filled(400, 4),
        'UMD_DATA.BIN': List.filled(64, 5),
      });
      final out = File(p.join(tmp.path, 'packed.iso'));

      final result = await ZipToIsoConverter.convert(
        source: zip,
        workingDirectory: Directory(p.join(tmp.path, 'work3'))..createSync(),
        options: ConvertOptions(outputFile: out, volumeName: 'PSPGAME'),
      );

      expect(result.strategy, DiscStrategy.packFiles);
      final listing = isoinfoList(out.path, joliet: true);
      expect(listing, contains('EBOOT.BIN'));
      expect(listing, contains('PARAM.SFO'));
      expect(listing, contains('UMD_DATA.BIN'));
    });

    test('rejects an archive with no disc data and explains why', () async {
      final zip = buildZip('junk.zip', {'notes.txt': utf8.encode('hello')});
      final out = File(p.join(tmp.path, 'junk.iso'));

      // Loose files are still packable — this should succeed, not throw.
      final result = await ZipToIsoConverter.convert(
        source: zip,
        workingDirectory: Directory(p.join(tmp.path, 'work4'))..createSync(),
        options: ConvertOptions(outputFile: out),
      );
      expect(result.strategy, DiscStrategy.packFiles);
    });

    test('refuses a CHD archive with a clear message', () async {
      final zip = buildZip('chd.zip', {'game.chd': List.filled(300000, 1)});
      await expectLater(
        ZipToIsoConverter.convert(
          source: zip,
          workingDirectory: Directory(p.join(tmp.path, 'work5'))..createSync(),
          options: ConvertOptions(outputFile: File(p.join(tmp.path, 'x.iso'))),
        ),
        throwsA(isA<DiscCoreException>()
            .having((e) => e.message, 'message', contains('CHD'))),
      );
    });

    test('cleans up its scratch directory even on failure', () async {
      final work = Directory(p.join(tmp.path, 'work6'))..createSync();
      final zip = buildZip('chd2.zip', {'game.chd': List.filled(300000, 1)});
      try {
        await ZipToIsoConverter.convert(
          source: zip,
          workingDirectory: work,
          options: ConvertOptions(outputFile: File(p.join(tmp.path, 'y.iso'))),
        );
      } on DiscCoreException {
        // expected
      }
      expect(work.listSync(), isEmpty);
    });

    test('deletes the source ZIP only when asked', () async {
      final cooked = buildImage(sectorCount: 40, sectorSize: 2048, dataOffset: 0);
      final zip = buildZip('del.zip', {'game.iso': cooked});

      final result = await ZipToIsoConverter.convert(
        source: zip,
        workingDirectory: Directory(p.join(tmp.path, 'work7'))..createSync(),
        options: ConvertOptions(
          outputFile: File(p.join(tmp.path, 'del.iso')),
          deleteSourceOnSuccess: true,
        ),
      );

      expect(result.sourceDeleted, isTrue);
      expect(zip.existsSync(), isFalse);
    });

    test('reports monotonic progress ending at 100%', () async {
      final raw = buildImage(sectorCount: 200, sectorSize: 2352, dataOffset: 16);
      final zip = buildZip('prog.zip', {
        'g.bin': raw,
        'g.cue': utf8.encode('FILE "g.bin" BINARY\n  TRACK 01 MODE1/2352\n'),
      });
      final updates = <ProgressUpdate>[];

      await ZipToIsoConverter.convert(
        source: zip,
        workingDirectory: Directory(p.join(tmp.path, 'work8'))..createSync(),
        options: ConvertOptions(outputFile: File(p.join(tmp.path, 'p.iso'))),
        onProgress: updates.add,
      );

      expect(updates, isNotEmpty);
      expect(updates.last.fraction, 1.0);
      expect(updates.map((u) => u.stage).toSet(), contains('Converting sectors'));
    });
  });
}
