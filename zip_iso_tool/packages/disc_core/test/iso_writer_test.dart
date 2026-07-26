import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:disc_core/disc_core.dart';
import 'package:path/path.dart' as p;
import 'package:test/test.dart';

import 'test_support.dart';

void main() {
  late Directory tmp;

  setUp(() => tmp = Directory.systemTemp.createTempSync('iso_writer_test'));
  tearDown(() => tmp.deleteSync(recursive: true));

  File makeFile(String relative, List<int> bytes) {
    final file = File(p.join(tmp.path, 'src', relative));
    file.parent.createSync(recursive: true);
    file.writeAsBytesSync(bytes);
    return file;
  }

  List<IsoSourceFile> sourcesFrom(Map<String, List<int>> spec) {
    return spec.entries
        .map((e) => IsoSourceFile(
              file: makeFile(e.key, e.value),
              relativePath: e.key,
            ))
        .toList();
  }

  group('structure', () {
    test('writes a sector-aligned image with the standard descriptors', () async {
      final out = File(p.join(tmp.path, 'out.iso'));
      await IsoWriter.write(
        files: sourcesFrom({'HELLO.TXT': utf8.encode('hello world')}),
        output: out,
        volumeName: 'TEST',
      );

      final bytes = await out.readAsBytes();
      expect(bytes.length % 2048, 0, reason: 'image must be sector aligned');

      // 16 empty system sectors, then PVD / SVD / terminator.
      expect(bytes.sublist(0, 16 * 2048).every((b) => b == 0), isTrue);
      expect(bytes[16 * 2048], 1, reason: 'primary volume descriptor');
      expect(ascii.decode(bytes.sublist(16 * 2048 + 1, 16 * 2048 + 6)), 'CD001');
      expect(bytes[17 * 2048], 2, reason: 'supplementary (Joliet) descriptor');
      expect(ascii.decode(bytes.sublist(17 * 2048 + 1, 17 * 2048 + 6)), 'CD001');
      expect(bytes[18 * 2048], 0xFF, reason: 'descriptor set terminator');

      // Joliet escape sequence "%/E".
      expect(bytes.sublist(17 * 2048 + 88, 17 * 2048 + 91), [0x25, 0x2F, 0x45]);
    });

    test('declared volume size matches the real file length', () async {
      final out = File(p.join(tmp.path, 'out.iso'));
      await IsoWriter.write(
        files: sourcesFrom({
          'a.bin': List.filled(5000, 1),
          'sub/b.bin': List.filled(3000, 2),
          'sub/deep/c.bin': List.filled(100, 3),
        }),
        output: out,
      );

      final bytes = await out.readAsBytes();
      final pvd = ByteData.sublistView(bytes, 16 * 2048);
      final sectorsLe = pvd.getUint32(80, Endian.little);
      final sectorsBe = pvd.getUint32(84, Endian.big);

      expect(sectorsLe, sectorsBe, reason: 'both-endian fields must agree');
      expect(sectorsLe * 2048, bytes.length);
    });

    test('both-endian path table size fields agree', () async {
      final out = File(p.join(tmp.path, 'out.iso'));
      await IsoWriter.write(
        files: sourcesFrom({'dir1/x.txt': [1], 'dir2/y.txt': [2]}),
        output: out,
      );
      final bytes = await out.readAsBytes();
      final pvd = ByteData.sublistView(bytes, 16 * 2048);
      expect(pvd.getUint32(132, Endian.little), pvd.getUint32(136, Endian.big));
      expect(pvd.getUint16(128, Endian.little), 2048);
    });
  });

  group('isoinfo compatibility', () {
    test('a flat image lists every file with correct sizes', () async {
      skipUnlessIsoinfo();
      final out = File(p.join(tmp.path, 'flat.iso'));
      await IsoWriter.write(
        files: sourcesFrom({
          'GAME.BIN': List.filled(4096, 0xAB),
          'README.TXT': utf8.encode('notes'),
        }),
        output: out,
        volumeName: 'FLATVOL',
      );

      final listing = isoinfoList(out.path);
      expect(listing, contains('GAME.BIN'));
      expect(listing, contains('README.TXT'));

      final header = runTool('isoinfo', ['-d', '-i', out.path]);
      expect(header, contains('FLATVOL'));
      expect(header, contains('Joliet'));
    });

    test('nested directories survive the round trip', () async {
      skipUnlessIsoinfo();
      final out = File(p.join(tmp.path, 'nested.iso'));
      await IsoWriter.write(
        files: sourcesFrom({
          'PSP_GAME/SYSDIR/EBOOT.BIN': List.filled(2048 * 3, 7),
          'PSP_GAME/PARAM.SFO': List.filled(500, 8),
          'UMD_DATA.BIN': List.filled(64, 9),
        }),
        output: out,
      );

      final listing = isoinfoList(out.path, joliet: false);
      expect(listing, contains('PSP_GAME'));
      expect(listing, contains('SYSDIR'));
      expect(listing, contains('EBOOT.BIN'));
      expect(listing, contains('UMD_DATA.BIN'));
    });

    test('Joliet names keep original case and length', () async {
      skipUnlessIsoinfo();
      final out = File(p.join(tmp.path, 'joliet.iso'));
      await IsoWriter.write(
        files: sourcesFrom({
          'Final Fantasy VII (Disc 1).bin': List.filled(2048, 1),
          'Cover Art/front cover.png': List.filled(512, 2),
        }),
        output: out,
      );

      final joliet = isoinfoList(out.path, joliet: true);
      expect(joliet, contains('Final Fantasy VII (Disc 1).bin'));
      expect(joliet, contains('Cover Art'));
      expect(joliet, contains('front cover.png'));

      // The primary hierarchy must still be legal 8.3-ish uppercase.
      final primary = isoinfoList(out.path, joliet: false);
      expect(primary, contains('FINAL_FANTASY_VII__DISC_1_.BIN'.substring(0, 20)));
      expect(primary, isNot(contains('Final Fantasy')));
    });

    test('file contents are byte-identical after extraction', () async {
      skipUnless7z();
      final out = File(p.join(tmp.path, 'content.iso'));
      final payload = Uint8List.fromList(
        List.generate(9000, (i) => (i * 31 + 7) % 256),
      );
      await IsoWriter.write(
        files: sourcesFrom({
          'DATA/PAYLOAD.BIN': payload,
          'SMALL.TXT': utf8.encode('x'),
        }),
        output: out,
      );

      final dest = Directory(p.join(tmp.path, 'unpacked'))..createSync();
      runTool('7z', ['x', '-y', '-o${dest.path}', out.path]);

      final extracted = File(p.join(dest.path, 'DATA', 'PAYLOAD.BIN'));
      expect(extracted.existsSync(), isTrue,
          reason: '7z listing:\n${runTool('7z', ['l', out.path])}');
      expect(extracted.readAsBytesSync(), equals(payload),
          reason: 'payload must survive sector padding exactly');
      expect(extracted.lengthSync(), payload.length,
          reason: 'trailing zero padding must not be counted in file size');
    });

    test('many files spill correctly across directory sectors', () async {
      skipUnlessIsoinfo();
      // Enough entries that the root directory extent needs several sectors,
      // which exercises the "records may not straddle a sector" rule.
      final spec = <String, List<int>>{};
      for (var i = 0; i < 120; i++) {
        spec['track_${i.toString().padLeft(3, '0')}_of_the_set.dat'] = [i % 256];
      }
      final out = File(p.join(tmp.path, 'many.iso'));
      await IsoWriter.write(files: sourcesFrom(spec), output: out);

      final listing = isoinfoList(out.path, joliet: true);
      for (final name in spec.keys) {
        expect(listing, contains(name), reason: 'missing $name');
      }
    });
  });

  group('errors', () {
    test('refuses an empty file list', () {
      expect(
        () => IsoWriter.write(
          files: const [],
          output: File(p.join(tmp.path, 'x.iso')),
        ),
        throwsA(isA<DiscCoreException>()),
      );
    });

    test('zero-byte files are written without consuming sectors', () async {
      final out = File(p.join(tmp.path, 'empty.iso'));
      final result = await IsoWriter.write(
        files: sourcesFrom({'EMPTY.BIN': const [], 'REAL.BIN': [1, 2, 3]}),
        output: out,
      );
      expect(result.fileCount, 2);
      expect(out.lengthSync() % 2048, 0);
    });
  });
}
