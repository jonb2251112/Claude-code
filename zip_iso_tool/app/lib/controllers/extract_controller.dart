import 'dart:async';
import 'dart:io';

import 'package:disc_core/disc_core.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;

import '../models/job.dart';
import '../services/background_jobs.dart';
import '../services/storage_service.dart';

/// Asks the user for a password. Returns null when they cancel.
typedef PasswordPrompt = Future<String?> Function(String archiveName, {bool retry});

/// Drives the "Extract ZIP" tab.
class ExtractController extends ChangeNotifier {
  ExtractController(this._storage);

  final StorageService _storage;

  final List<Job> _jobs = [];
  List<Job> get jobs => List.unmodifiable(_jobs);

  Directory? _destination;
  Directory? get destination => _destination;

  bool _deleteOriginal = false;
  bool get deleteOriginal => _deleteOriginal;

  bool _extractNested = true;
  bool get extractNested => _extractNested;

  bool _busy = false;
  bool get busy => _busy;

  String? _banner;
  String? get banner => _banner;

  JobHandle<ExtractResult>? _current;

  bool get hasJobs => _jobs.isNotEmpty;
  bool get hasResults => _jobs.any((j) => j.status == JobStatus.success);

  Future<void> initialize() async {
    _destination = await _storage.defaultExtractDirectory();
    notifyListeners();
  }

  void setDeleteOriginal(bool value) {
    _deleteOriginal = value;
    notifyListeners();
  }

  void setExtractNested(bool value) {
    _extractNested = value;
    notifyListeners();
  }

  void dismissBanner() {
    _banner = null;
    notifyListeners();
  }

  void clearFinished() {
    _jobs.removeWhere((j) => j.isFinished);
    notifyListeners();
  }

  Future<void> chooseDestination() async {
    final choice = await _storage.pickOutputDirectory();
    if (choice.cancelled) return;
    if (choice.error != null) {
      _banner = choice.error;
      notifyListeners();
      return;
    }
    _destination = choice.directory;
    _banner = null;
    notifyListeners();
  }

  Future<void> useDefaultDestination() async {
    _destination = await _storage.defaultExtractDirectory();
    _banner = null;
    notifyListeners();
  }

  /// Picks archives and extracts them one after another.
  ///
  /// Jobs run sequentially rather than in parallel: two isolates inflating
  /// multi-gigabyte archives at once would thrash a phone's I/O and memory for
  /// no wall-clock gain.
  Future<void> pickAndExtract({required PasswordPrompt onPasswordNeeded}) async {
    if (_busy) return;
    await _storage.ensureStoragePermission();
    final files = await _storage.pickZipFiles();
    if (files.isEmpty) return;
    await extractFiles(files, onPasswordNeeded: onPasswordNeeded);
  }

  Future<void> extractFiles(
    List<File> files, {
    required PasswordPrompt onPasswordNeeded,
  }) async {
    if (_busy) return;
    _busy = true;
    _banner = null;

    final destination = _destination ??= await _storage.defaultExtractDirectory();
    for (final file in files) {
      _jobs.add(Job(
        id: '${file.path}#${DateTime.now().microsecondsSinceEpoch}',
        sourcePath: file.path,
      ));
    }
    notifyListeners();

    for (final file in files) {
      final index = _jobs.lastIndexWhere((j) => j.sourcePath == file.path);
      if (index < 0) continue;
      await _runOne(index, file, destination, onPasswordNeeded);
    }

    _busy = false;
    notifyListeners();
  }

  Future<void> _runOne(
    int index,
    File file,
    Directory destination,
    PasswordPrompt onPasswordNeeded,
  ) async {
    String? password;
    var retry = false;

    // Loop so a mistyped password re-prompts instead of failing the job.
    while (true) {
      final targetDirectory = await _storage.uniqueDirectory(
        destination,
        p.basenameWithoutExtension(file.path),
      );

      _jobs[index] = _jobs[index].copyWith(
        status: JobStatus.running,
        stage: 'Starting',
        errorMessage: '',
      );
      notifyListeners();

      try {
        final handle = await BackgroundJobs.extract(
          (port) => ExtractRequest(
            replyPort: port,
            sourcePath: file.path,
            destinationPath: targetDirectory.path,
            password: password,
            extractNested: _extractNested,
            deleteSource: _deleteOriginal,
          ),
        );
        _current = handle;

        final subscription = handle.progress.listen((update) {
          _jobs[index] = _jobs[index].applyProgress(update);
          notifyListeners();
        });

        final result = await handle.result;
        await subscription.cancel();
        _current = null;

        _jobs[index] = _jobs[index].copyWith(
          status: JobStatus.success,
          progress: 1,
          stage: 'Done',
          clearDetail: true,
          outputPaths: result.files.map((f) => f.path).toList(),
          sourceDeleted: result.sourceDeleted,
          summary: _summarize(result),
          needsPassword: false,
        );
        notifyListeners();
        return;
      } on DiscCoreException catch (e) {
        _current = null;
        if (e.isPasswordFailure) {
          // Remove the half-written folder before asking again.
          await _deleteQuietly(targetDirectory);
          final entered = await onPasswordNeeded(
            p.basename(file.path),
            retry: retry,
          );
          if (entered == null || entered.isEmpty) {
            _jobs[index] = _jobs[index].copyWith(
              status: JobStatus.cancelled,
              stage: 'Cancelled',
              clearDetail: true,
              errorMessage: 'Password required.',
              needsPassword: true,
            );
            notifyListeners();
            return;
          }
          password = entered;
          retry = true;
          continue;
        }

        await _deleteQuietly(targetDirectory);
        _jobs[index] = _jobs[index].copyWith(
          status: JobStatus.failure,
          stage: 'Failed',
          clearDetail: true,
          errorMessage: e.message,
        );
        notifyListeners();
        return;
      } catch (e) {
        _current = null;
        await _deleteQuietly(targetDirectory);
        _jobs[index] = _jobs[index].copyWith(
          status: JobStatus.failure,
          stage: 'Failed',
          clearDetail: true,
          errorMessage: 'Something went wrong: $e',
        );
        notifyListeners();
        return;
      }
    }
  }

  void cancelCurrent() {
    _current?.cancel();
    _current = null;
    for (var i = 0; i < _jobs.length; i++) {
      if (_jobs[i].isActive) {
        _jobs[i] = _jobs[i].copyWith(
          status: JobStatus.cancelled,
          stage: 'Cancelled',
          clearDetail: true,
        );
      }
    }
    _busy = false;
    notifyListeners();
  }

  String _summarize(ExtractResult result) {
    final parts = <String>[
      '${result.files.length} file${result.files.length == 1 ? '' : 's'}',
      formatBytes(result.totalBytes),
    ];
    if (result.nestedArchivesExpanded > 0) {
      parts.add('${result.nestedArchivesExpanded} nested ZIP'
          '${result.nestedArchivesExpanded == 1 ? '' : 's'} expanded');
    }
    if (result.sourceDeleted) parts.add('original deleted');
    return parts.join(' · ');
  }

  Future<void> _deleteQuietly(Directory directory) async {
    try {
      if (await directory.exists()) await directory.delete(recursive: true);
    } on FileSystemException {
      // Nothing useful to do; the next run picks a fresh unique name anyway.
    }
  }

  /// Every file produced by every successful job, for "share all".
  List<String> get allOutputs => [
        for (final job in _jobs)
          if (job.status == JobStatus.success) ...job.outputPaths,
      ];
}
