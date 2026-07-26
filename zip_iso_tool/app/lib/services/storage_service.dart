import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

/// Where files can be written, and how to get permission to write there.
///
/// Android's scoped storage and iOS's sandbox mean the only universally
/// writable location is the app's own documents directory. Anything the user
/// picks is best-effort: we probe it before starting a long job rather than
/// failing an hour in.
class StorageService {
  Directory? _documents;
  Directory? _scratch;

  /// The app's documents directory — always writable, visible to the iOS Files
  /// app and to Android's file manager when the manifest opts in.
  Future<Directory> documentsDirectory() async {
    final cached = _documents;
    if (cached != null) return cached;
    final dir = await getApplicationDocumentsDirectory();
    final target = Directory(p.join(dir.path, 'ZipTools'));
    await target.create(recursive: true);
    return _documents = target;
  }

  /// Default destination for extracted archives.
  Future<Directory> defaultExtractDirectory() async {
    final docs = await documentsDirectory();
    final dir = Directory(p.join(docs.path, 'Extracted'));
    await dir.create(recursive: true);
    return dir;
  }

  /// Default destination for generated ISOs.
  Future<Directory> defaultIsoDirectory() async {
    final docs = await documentsDirectory();
    final dir = Directory(p.join(docs.path, 'ISO'));
    await dir.create(recursive: true);
    return dir;
  }

  /// Scratch space for intermediate files. Cleared on demand, and never shown
  /// to the user.
  Future<Directory> scratchDirectory() async {
    final cached = _scratch;
    if (cached != null) return cached;
    final base = await getTemporaryDirectory();
    final dir = Directory(p.join(base.path, 'ziptools_work'));
    await dir.create(recursive: true);
    return _scratch = dir;
  }

  Future<void> clearScratch() async {
    final dir = await scratchDirectory();
    if (!await dir.exists()) return;
    await for (final entity in dir.list()) {
      try {
        await entity.delete(recursive: true);
      } on FileSystemException {
        // A file still held open by a dying isolate is not worth reporting.
      }
    }
  }

  /// Asks the OS for the storage permission the running Android version
  /// actually needs. Returns true when we may proceed.
  ///
  /// Android 13+ (API 33) does not require any permission for the system file
  /// picker or for app-private directories, so we never nag there.
  Future<bool> ensureStoragePermission() async {
    if (!Platform.isAndroid) return true;
    final status = await Permission.storage.status;
    if (status.isGranted || status.isPermanentlyDenied || status.isRestricted) {
      // `isPermanentlyDenied` on modern Android usually means the permission
      // is simply not applicable; the picker still works through SAF.
      return true;
    }
    final result = await Permission.storage.request();
    return result.isGranted || result.isPermanentlyDenied;
  }

  /// Opens the system picker limited to `.zip` files.
  ///
  /// Returns the picked paths. Entries the platform could not resolve to a
  /// real path are dropped — file_picker copies SAF/iCloud items into a cache
  /// directory for us, so a null path means the pick genuinely failed.
  Future<List<File>> pickZipFiles({bool allowMultiple = true}) async {
    final result = await FilePicker.pickFiles(
      allowMultiple: allowMultiple,
      type: FileType.custom,
      allowedExtensions: const ['zip'],
      dialogTitle: 'Select ZIP files',
    );
    if (result == null) return const [];
    return result.files
        .map((f) => f.path)
        .whereType<String>()
        .map(File.new)
        .toList();
  }

  /// Lets the user choose an output folder, returning it only if we can
  /// actually write there.
  ///
  /// On Android a picked folder may be a SAF tree we cannot write to with the
  /// plain `dart:io` API. Probing with a real temporary file is the only
  /// reliable way to find out, and it is far better to find out now.
  Future<DirectoryChoice> pickOutputDirectory() async {
    final path = await FilePicker.getDirectoryPath(
      dialogTitle: 'Choose an output folder',
    );
    if (path == null) return const DirectoryChoice.cancelled();
    if (path == '/') {
      return const DirectoryChoice.unwritable(
        'That folder is protected by Android and cannot be written to. '
        'Pick a folder inside Documents or Downloads instead.',
      );
    }

    final directory = Directory(path);
    if (await isWritable(directory)) {
      return DirectoryChoice.selected(directory);
    }
    return const DirectoryChoice.unwritable(
      'The app is not allowed to write to that folder. Pick another one, or '
      'leave the default so files are saved in the app\'s own storage.',
    );
  }

  /// Writes and deletes a probe file to confirm the directory is usable.
  Future<bool> isWritable(Directory directory) async {
    try {
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }
      final probe = File(
        p.join(directory.path, '.ziptools_write_test_${DateTime.now().microsecondsSinceEpoch}'),
      );
      await probe.writeAsString('ok', flush: true);
      await probe.delete();
      return true;
    } on FileSystemException {
      return false;
    }
  }

  /// Returns a path in [directory] based on [preferredName] that does not
  /// already exist, appending " (2)", " (3)" and so on.
  Future<File> uniqueFile(Directory directory, String preferredName) async {
    final extension = p.extension(preferredName);
    final stem = p.basenameWithoutExtension(preferredName);
    var candidate = File(p.join(directory.path, preferredName));
    var counter = 2;
    while (await candidate.exists()) {
      candidate = File(p.join(directory.path, '$stem ($counter)$extension'));
      counter++;
    }
    return candidate;
  }

  /// Same idea for directories.
  Future<Directory> uniqueDirectory(Directory parent, String preferredName) async {
    var candidate = Directory(p.join(parent.path, preferredName));
    var counter = 2;
    while (await candidate.exists()) {
      candidate = Directory(p.join(parent.path, '$preferredName ($counter)'));
      counter++;
    }
    return candidate;
  }

  /// Free space is not exposed by dart:io, so this is a best-effort check used
  /// only to warn before very large jobs.
  Future<int?> freeSpaceBytes(Directory directory) async {
    if (!Platform.isAndroid && !Platform.isIOS) return null;
    try {
      final result = await Process.run('df', ['-k', directory.path]);
      if (result.exitCode != 0) return null;
      final lines = const LineSplitter().convert('${result.stdout}');
      if (lines.length < 2) return null;
      final columns = lines[1].split(RegExp(r'\s+'));
      if (columns.length < 4) return null;
      final availableKb = int.tryParse(columns[3]);
      return availableKb == null ? null : availableKb * 1024;
    } on ProcessException {
      return null;
    }
  }
}

/// Outcome of asking the user for an output folder.
class DirectoryChoice {
  const DirectoryChoice.selected(Directory this.directory)
      : cancelled = false,
        error = null;
  const DirectoryChoice.cancelled()
      : directory = null,
        cancelled = true,
        error = null;
  const DirectoryChoice.unwritable(String this.error)
      : directory = null,
        cancelled = false;

  final Directory? directory;
  final bool cancelled;
  final String? error;
}
