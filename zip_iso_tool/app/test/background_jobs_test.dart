import 'dart:convert';
import 'dart:io';

import 'package:disc_core/disc_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:zip_tools/services/background_jobs.dart';

/// These exercise the real isolate plumbing — spawn, progress streaming,
/// result transfer and error translation across the port — rather than mocking
/// it. The protocol is easy to break silently, and a broken protocol means a
/// job that hangs forever with a spinner.
void main() {
  late Directory tmp;

  setUp(() => tmp = Directory.systemTemp.createTempSync('bg_jobs_test'));
  tearDown(() => tmp.deleteSync(recursive: true));

  File buildZip(
    String name,
    Map<String, List<int>> entries, {
    String? password,
  }) {
    final stage = Directory(p.join(tmp.path, 'stage_$name'))
      ..createSync(recursive: true);
    for (final e in entries.entries) {
      final f = File(p.join(stage.path, e.key));
      f.parent.createSync(recursive: true);
      f.writeAsBytesSync(e.value);
    }
    final zipPath = p.join(tmp.path, name);
    final result = Process.runSync(
      'zip',
      ['-r', '-q', if (password != null) ...['-P', password], zipPath, '.'],
      workingDirectory: stage.path,
    );
    if (result.exitCode != 0) {
      throw StateError('zip failed: ${result.stdout}${result.stderr}');
    }
    return File(zipPath);
  }

  bool hasZip() {
    try {
      return Process.runSync('which', ['zip']).exitCode == 0;
    } on ProcessException {
      return false;
    }
  }

  test('extraction runs in an isolate and returns its result', () async {
    if (!hasZip()) return markTestSkipped('the `zip` tool is not installed');

    final zip = buildZip('job.zip', {
      'a.txt': utf8.encode('hello'),
      'nested/b.bin': List.filled(4000, 7),
    });
    final dest = Directory(p.join(tmp.path, 'out'));

    final updates = <ProgressUpdate>[];
    final handle = await BackgroundJobs.extract(
      (port) => ExtractRequest(
        replyPort: port,
        sourcePath: zip.path,
        destinationPath: dest.path,
        password: null,
        extractNested: true,
        deleteSource: false,
      ),
    );
    handle.progress.listen(updates.add);
    final result = await handle.result;

    expect(result.files, hasLength(2));
    expect(File(p.join(dest.path, 'a.txt')).readAsStringSync(), 'hello');
    expect(updates, isNotEmpty, reason: 'progress must cross the port');
    expect(updates.last.fraction, 1.0);
  });

  test('a core error crosses the port as a DiscCoreException', () async {
    final notZip = File(p.join(tmp.path, 'fake.zip'))
      ..writeAsBytesSync(List.filled(4096, 0x41));

    final handle = await BackgroundJobs.extract(
      (port) => ExtractRequest(
        replyPort: port,
        sourcePath: notZip.path,
        destinationPath: p.join(tmp.path, 'out2'),
        password: null,
        extractNested: false,
        deleteSource: false,
      ),
    );

    await expectLater(
      handle.result,
      throwsA(isA<DiscCoreException>().having(
        (e) => e.message,
        'message',
        contains('ZIP'),
      )),
    );
  });

  test('a password failure keeps its flag across the port', () async {
    if (!hasZip()) return markTestSkipped('the `zip` tool is not installed');

    final zip = buildZip(
      'locked.zip',
      {'a.txt': utf8.encode('secret')},
      password: 'letmein',
    );

    final handle = await BackgroundJobs.extract(
      (port) => ExtractRequest(
        replyPort: port,
        sourcePath: zip.path,
        destinationPath: p.join(tmp.path, 'out3'),
        password: null,
        extractNested: false,
        deleteSource: false,
      ),
    );

    await expectLater(
      handle.result,
      throwsA(isA<DiscCoreException>()
          .having((e) => e.isPasswordFailure, 'isPasswordFailure', isTrue)),
    );
  });

  test('conversion streams progress and returns an ISO', () async {
    if (!hasZip()) return markTestSkipped('the `zip` tool is not installed');

    // A minimal cooked 2048-byte-sector image with a CD001 descriptor.
    final image = List.filled(40 * 2048, 0);
    const magic = [0x01, 0x43, 0x44, 0x30, 0x30, 0x31, 0x01];
    for (var i = 0; i < magic.length; i++) {
      image[16 * 2048 + i] = magic[i];
    }
    final zip = buildZip('disc.zip', {'game.iso': image});
    final out = File(p.join(tmp.path, 'game.iso'));

    final handle = await BackgroundJobs.convert(
      (port) => ConvertRequest(
        replyPort: port,
        sourcePath: zip.path,
        outputPath: out.path,
        workingDirectoryPath: (Directory(p.join(tmp.path, 'work'))
              ..createSync())
            .path,
        password: null,
        volumeName: 'GAME',
        deleteSource: false,
      ),
    );

    final updates = <ProgressUpdate>[];
    handle.progress.listen(updates.add);
    final result = await handle.result;

    expect(result.strategy, DiscStrategy.rawImage);
    expect(out.lengthSync(), 40 * 2048);
    expect(updates, isNotEmpty);
  });
}
