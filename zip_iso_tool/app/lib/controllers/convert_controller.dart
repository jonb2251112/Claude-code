import 'dart:async';
import 'dart:io';

import 'package:disc_core/disc_core.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;

import '../models/job.dart';
import '../services/background_jobs.dart';
import '../services/storage_service.dart';
import 'extract_controller.dart' show PasswordPrompt;

/// One archive queued for conversion, with the plan we detected for it.
class ConversionCandidate {
  ConversionCandidate({
    required this.file,
    required this.plan,
    required this.outputName,
    required this.sizeOnDisk,
  });

  final File file;
  final DiscPlan plan;
  final int sizeOnDisk;

  /// Editable output file name, pre-filled from the archive's name.
  String outputName;

  String get sourceName => p.basename(file.path);
}

/// Drives the "ZIP to ISO" tab.
class ConvertController extends ChangeNotifier {
  ConvertController(this._storage);

  final StorageService _storage;

  final List<ConversionCandidate> _candidates = [];
  List<ConversionCandidate> get candidates => List.unmodifiable(_candidates);

  final List<Job> _jobs = [];
  List<Job> get jobs => List.unmodifiable(_jobs);

  Directory? _destination;
  Directory? get destination => _destination;

  bool _deleteOriginal = false;
  bool get deleteOriginal => _deleteOriginal;

  bool _busy = false;
  bool get busy => _busy;

  bool _inspecting = false;
  bool get inspecting => _inspecting;

  String? _banner;
  String? get banner => _banner;

  JobHandle<ConvertResult>? _current;

  bool get hasCandidates => _candidates.isNotEmpty;
  bool get canConvert =>
      !_busy && _candidates.any((c) => c.plan.isSupported);

  Future<void> initialize() async {
    _destination = await _storage.defaultIsoDirectory();
    notifyListeners();
  }

  void setDeleteOriginal(bool value) {
    _deleteOriginal = value;
    notifyListeners();
  }

  void dismissBanner() {
    _banner = null;
    notifyListeners();
  }

  void removeCandidate(ConversionCandidate candidate) {
    _candidates.remove(candidate);
    notifyListeners();
  }

  void renameCandidate(ConversionCandidate candidate, String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;
    candidate.outputName =
        trimmed.toLowerCase().endsWith('.iso') ? trimmed : '$trimmed.iso';
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
    _destination = await _storage.defaultIsoDirectory();
    _banner = null;
    notifyListeners();
  }

  /// Picks archives and works out, from their central directories alone, what
  /// each one contains. This is fast even for huge files because nothing is
  /// decompressed — so the user sees a real plan before committing.
  Future<void> pickAndInspect() async {
    if (_busy || _inspecting) return;
    await _storage.ensureStoragePermission();
    final files = await _storage.pickZipFiles();
    if (files.isEmpty) return;

    _inspecting = true;
    _banner = null;
    notifyListeners();

    for (final file in files) {
      if (_candidates.any((c) => c.file.path == file.path)) continue;
      try {
        final summary = await ZipInspector.inspect(file);
        _candidates.add(ConversionCandidate(
          file: file,
          plan: DiscDetector.plan(summary),
          outputName: DiscDetector.suggestOutputName(file.path),
          sizeOnDisk: await file.length(),
        ));
      } on DiscCoreException catch (e) {
        _candidates.add(ConversionCandidate(
          file: file,
          plan: DiscPlan(
            strategy: DiscStrategy.unsupportedDiscFormat,
            reason: e.message,
          ),
          outputName: DiscDetector.suggestOutputName(file.path),
          sizeOnDisk: await file.length().catchError((_) => 0),
        ));
      }
      notifyListeners();
    }

    _inspecting = false;
    notifyListeners();
  }

  /// Re-reads every queued archive, e.g. after a pull-to-refresh.
  Future<void> refreshCandidates() async {
    if (_busy || _inspecting) return;
    final files = _candidates.map((c) => c.file).toList();
    _candidates.clear();
    notifyListeners();
    if (files.isEmpty) return;

    _inspecting = true;
    notifyListeners();
    for (final file in files) {
      if (!await file.exists()) continue;
      try {
        final summary = await ZipInspector.inspect(file);
        _candidates.add(ConversionCandidate(
          file: file,
          plan: DiscDetector.plan(summary),
          outputName: DiscDetector.suggestOutputName(file.path),
          sizeOnDisk: await file.length(),
        ));
      } on DiscCoreException catch (e) {
        _candidates.add(ConversionCandidate(
          file: file,
          plan: DiscPlan(
            strategy: DiscStrategy.unsupportedDiscFormat,
            reason: e.message,
          ),
          outputName: DiscDetector.suggestOutputName(file.path),
          sizeOnDisk: 0,
        ));
      }
    }
    _inspecting = false;
    notifyListeners();
  }

  Future<void> convertAll({required PasswordPrompt onPasswordNeeded}) async {
    if (_busy) return;
    final convertible =
        _candidates.where((c) => c.plan.isSupported).toList(growable: false);
    if (convertible.isEmpty) {
      _banner = 'None of the selected archives can be converted to ISO.';
      notifyListeners();
      return;
    }

    _busy = true;
    _banner = null;
    final destination = _destination ??= await _storage.defaultIsoDirectory();
    final scratch = await _storage.scratchDirectory();

    for (final candidate in convertible) {
      _jobs.add(Job(
        id: '${candidate.file.path}#${DateTime.now().microsecondsSinceEpoch}',
        sourcePath: candidate.file.path,
      ));
    }
    notifyListeners();

    for (final candidate in convertible) {
      final index =
          _jobs.lastIndexWhere((j) => j.sourcePath == candidate.file.path);
      if (index < 0) continue;
      await _runOne(index, candidate, destination, scratch, onPasswordNeeded);
    }

    // Successfully converted archives leave the queue; failures stay so the
    // user can see what happened and retry.
    _candidates.removeWhere((candidate) => _jobs.any((job) =>
        job.sourcePath == candidate.file.path &&
        job.status == JobStatus.success));

    _busy = false;
    notifyListeners();
    unawaited(_storage.clearScratch());
  }

  Future<void> _runOne(
    int index,
    ConversionCandidate candidate,
    Directory destination,
    Directory scratch,
    PasswordPrompt onPasswordNeeded,
  ) async {
    String? password;
    var retry = false;

    while (true) {
      final output = await _storage.uniqueFile(destination, candidate.outputName);

      _jobs[index] = _jobs[index].copyWith(
        status: JobStatus.running,
        stage: 'Starting',
        errorMessage: '',
        warnings: candidate.plan.warnings,
      );
      notifyListeners();

      try {
        final handle = await BackgroundJobs.convert(
          (port) => ConvertRequest(
            replyPort: port,
            sourcePath: candidate.file.path,
            outputPath: output.path,
            workingDirectoryPath: scratch.path,
            password: password,
            volumeName: p.basenameWithoutExtension(candidate.outputName),
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
          outputPaths: [result.outputPath],
          summary: '${formatBytes(result.sizeInBytes)} · ${result.details}',
          warnings: result.warnings,
          sourceDeleted: result.sourceDeleted,
        );
        notifyListeners();
        return;
      } on DiscCoreException catch (e) {
        _current = null;
        await _deleteQuietly(output);
        if (e.isPasswordFailure) {
          final entered = await onPasswordNeeded(
            candidate.sourceName,
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
        await _deleteQuietly(output);
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
    unawaited(_storage.clearScratch());
  }

  Future<void> _deleteQuietly(File file) async {
    try {
      if (await file.exists()) await file.delete();
    } on FileSystemException {
      // A partial ISO left behind is untidy but not worth surfacing.
    }
  }

  List<String> get allOutputs => [
        for (final job in _jobs)
          if (job.status == JobStatus.success) ...job.outputPaths,
      ];
}
