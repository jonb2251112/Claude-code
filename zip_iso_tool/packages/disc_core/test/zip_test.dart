import 'dart:convert';
import 'dart:io';

import 'package:disc_core/disc_core.dart';
import 'package:path/path.dart' as p;
import 'package:test/test.dart';


void main() {
  late Directory tmp;

  setUp(() => tmp = Directory.systemTemp.createTempSync('zip_test'));
  tearDown(() => tmp.deleteSync(recursive: true));

  /// Builds a real ZIP with the system `zip` tool so we are testing against
  /// archives produced by a third party, not by our own writer.
  File buildZip(
    String name,
    Map<String, List<int>> entries, {
    String? password,
    List<String> extraArgs = const [],
  }) {
    final stage = Directory(p.join(tmp.path, 'stage_$name'))
      ..createSync(recursive: true);
    for (final entry in entries.entries) {
      final file = File(p.join(stage.path, entry.key));
      file.parent.createSync(recursive: true);
      file.writeAsBytesSync(entry.value);
    }
    final zipPath = p.join(tmp.path, name);
    final result = Process.runSync(
      'zip',
      [
        '-r',
        '-q',
        if (password != null) ...['-P', password],
        ...extraArgs,
        zipPath,
        '.',
      ],
      workingDirectory: stage.path,
    );
    if (result.exitCode != 0) {
      throw StateError('zip failed: ${result.stdout}${result.stderr}');
    }
    return File(zipPath);
  }

  group('ZipInspector', () {
    test('reads entries and sizes without decompressing', () async {
      final zip = buildZip('plain.zip', {
        'readme.txt': utf8.encode('hello'),
        'data/payload.bin': List.filled(5000, 7),
      });

      final summary = await ZipInspector.inspect(zip);
      final names = summary.files.map((f) => f.name).toList();

      expect(names, containsAll(['readme.txt', 'data/payload.bin']));
      expect(summary.isEncrypted, isFalse);
      expect(summary.totalUncompressedSize, 5 + 5000);
      expect(summary.fileCount, 2);
    });

    test('flags password-protected archives', () async {
      final zip = buildZip(
        'secret.zip',
        {'secret.txt': utf8.encode('classified')},
        password: 'hunter2',
      );

      final summary = await ZipInspector.inspect(zip);
      expect(summary.isEncrypted, isTrue);
      expect(summary.files.single.isEncrypted, isTrue);
    });

    test('rejects a file that is not a ZIP', () async {
      final notZip = File(p.join(tmp.path, 'fake.zip'))
        ..writeAsBytesSync(List.filled(4096, 0x41));
      await expectLater(
        ZipInspector.inspect(notZip),
        throwsA(
          isA<DiscCoreException>().having(
            (e) => e.message,
            'message',
            contains('end-of-archive'),
          ),
        ),
      );
    });

    test('rejects a truncated ZIP', () async {
      final zip = buildZip('trunc.zip', {'a.bin': List.filled(4000, 3)});
      final bytes = zip.readAsBytesSync();
      // Keep the tail (so the EOCD is found) but destroy the middle by
      // declaring a central directory that runs past the end.
      final broken = File(p.join(tmp.path, 'broken.zip'))
        ..writeAsBytesSync(bytes.sublist(bytes.length - 100));
      await expectLater(
        ZipInspector.inspect(broken),
        throwsA(isA<DiscCoreException>()),
      );
    });
  });

  group('ZipExtractor', () {
    test('extracts files and preserves folder structure', () async {
      final zip = buildZip('tree.zip', {
        'top.txt': utf8.encode('top'),
        'sub/inner.txt': utf8.encode('inner'),
        'sub/deeper/leaf.bin': List.filled(300, 9),
      });
      final dest = Directory(p.join(tmp.path, 'out'));

      final result = await ZipExtractor.extract(source: zip, destination: dest);

      expect(result.files.length, 3);
      expect(File(p.join(dest.path, 'top.txt')).readAsStringSync(), 'top');
      expect(
        File(p.join(dest.path, 'sub', 'deeper', 'leaf.bin')).lengthSync(),
        300,
      );
    });

    test('reports progress that ends at 100%', () async {
      final zip = buildZip('progress.zip', {
        'a.bin': List.filled(20000, 1),
        'b.bin': List.filled(20000, 2),
      });
      final updates = <ProgressUpdate>[];

      await ZipExtractor.extract(
        source: zip,
        destination: Directory(p.join(tmp.path, 'out')),
        onProgress: updates.add,
      );

      expect(updates, isNotEmpty);
      expect(updates.last.fraction, 1.0);
      expect(updates.every((u) => (u.fraction ?? 0) <= 1.0), isTrue);
    });

    test('expands nested ZIPs into folders', () async {
      final inner = buildZip('inner.zip', {'deep.txt': utf8.encode('deep')});
      final outer = buildZip('outer.zip', {
        'inner.zip': inner.readAsBytesSync(),
        'sibling.txt': utf8.encode('sibling'),
      });
      final dest = Directory(p.join(tmp.path, 'nested_out'));

      final result = await ZipExtractor.extract(
        source: outer,
        destination: dest,
        options: const ExtractOptions(extractNested: true),
      );

      expect(result.nestedArchivesExpanded, 1);
      expect(
        File(p.join(dest.path, 'inner', 'deep.txt')).readAsStringSync(),
        'deep',
      );
      expect(File(p.join(dest.path, 'inner.zip')).existsSync(), isFalse,
          reason: 'the inner archive is consumed once expanded');
      expect(result.files.any((f) => f.nestingDepth == 1), isTrue);
    });

    test('leaves nested ZIPs alone when the option is off', () async {
      final inner = buildZip('inner2.zip', {'deep.txt': utf8.encode('deep')});
      final outer = buildZip('outer2.zip', {'inner2.zip': inner.readAsBytesSync()});
      final dest = Directory(p.join(tmp.path, 'flat_out'));

      final result = await ZipExtractor.extract(
        source: outer,
        destination: dest,
        options: const ExtractOptions(extractNested: false),
      );

      expect(result.nestedArchivesExpanded, 0);
      expect(File(p.join(dest.path, 'inner2.zip')).existsSync(), isTrue);
    });

    test('asks for a password before touching an encrypted archive', () async {
      final zip = buildZip(
        'locked.zip',
        {'a.txt': utf8.encode('secret')},
        password: 'letmein',
      );

      await expectLater(
        ZipExtractor.extract(
          source: zip,
          destination: Directory(p.join(tmp.path, 'locked_out')),
        ),
        throwsA(
          isA<DiscCoreException>()
              .having((e) => e.isPasswordFailure, 'isPasswordFailure', isTrue),
        ),
      );
    });

    test('extracts an encrypted archive with the right password', () async {
      final zip = buildZip(
        'locked2.zip',
        {'a.txt': utf8.encode('secret payload')},
        password: 'letmein',
      );
      final dest = Directory(p.join(tmp.path, 'unlocked'));

      final result = await ZipExtractor.extract(
        source: zip,
        destination: dest,
        options: const ExtractOptions(password: 'letmein'),
      );

      expect(result.files, hasLength(1));
      expect(
        File(p.join(dest.path, 'a.txt')).readAsStringSync(),
        'secret payload',
      );
    });

    test('reports a wrong password as a password failure', () async {
      final zip = buildZip(
        'locked3.zip',
        {'a.txt': utf8.encode('secret payload that is long enough to checksum')},
        password: 'letmein',
      );

      await expectLater(
        ZipExtractor.extract(
          source: zip,
          destination: Directory(p.join(tmp.path, 'wrongpw')),
          options: const ExtractOptions(password: 'notthepassword'),
        ),
        throwsA(
          isA<DiscCoreException>()
              .having((e) => e.isPasswordFailure, 'isPasswordFailure', isTrue),
        ),
      );
    });

    test('deletes the source only when asked', () async {
      final zip = buildZip('doomed.zip', {'a.txt': utf8.encode('bye')});
      final result = await ZipExtractor.extract(
        source: zip,
        destination: Directory(p.join(tmp.path, 'del_out')),
        options: const ExtractOptions(deleteSourceOnSuccess: true),
      );

      expect(result.sourceDeleted, isTrue);
      expect(zip.existsSync(), isFalse);
    });

    test('refuses to write outside the destination (zip slip)', () async {
      // Craft an archive whose entry name escapes the destination directory.
      final evil = File(p.join(tmp.path, 'evil.zip'));
      final stage = Directory(p.join(tmp.path, 'evil_stage'))
        ..createSync(recursive: true);
      File(p.join(stage.path, 'ok.txt')).writeAsStringSync('fine');
      Process.runSync('zip', ['-q', evil.path, 'ok.txt'],
          workingDirectory: stage.path);
      // Append an entry with a traversing name using zip's own path handling.
      final outside = Directory(p.join(tmp.path, 'outside'))..createSync();
      File(p.join(outside.path, 'pwned.txt')).writeAsStringSync('escaped');
      Process.runSync(
        'zip',
        ['-q', evil.path, '../outside/pwned.txt'],
        workingDirectory: stage.path,
      );

      final dest = Directory(p.join(tmp.path, 'safe_out'));
      final result = await ZipExtractor.extract(source: evil, destination: dest);

      for (final file in result.files) {
        expect(
          p.isWithin(dest.path, file.path),
          isTrue,
          reason: '${file.path} escaped the destination',
        );
      }
      expect(File(p.join(tmp.path, 'pwned.txt')).existsSync(), isFalse);
    });
  });
}
