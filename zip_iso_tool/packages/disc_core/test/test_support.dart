import 'dart:io';

import 'package:test/test.dart';

bool _hasTool(String name) {
  try {
    final result = Process.runSync('which', [name]);
    return result.exitCode == 0;
  } on ProcessException {
    return false;
  }
}

final bool hasIsoinfo = _hasTool('isoinfo');
final bool has7z = _hasTool('7z');
final bool hasZip = _hasTool('zip');

void skipUnlessIsoinfo() {
  if (!hasIsoinfo) {
    markTestSkipped('isoinfo (genisoimage/cdrkit) is not installed');
  }
}

void skipUnless7z() {
  if (!has7z) {
    markTestSkipped('7z (p7zip) is not installed');
  }
}

String runTool(String executable, List<String> arguments) {
  final result = Process.runSync(executable, arguments);
  if (result.exitCode != 0) {
    throw StateError(
      '$executable ${arguments.join(' ')} failed (${result.exitCode}):\n'
      '${result.stdout}\n${result.stderr}',
    );
  }
  return '${result.stdout}';
}

/// Returns an `isoinfo -l` listing, optionally through the Joliet tree.
String isoinfoList(String path, {bool joliet = false}) {
  return runTool('isoinfo', [
    '-l',
    if (joliet) '-J',
    '-i',
    path,
  ]);
}
