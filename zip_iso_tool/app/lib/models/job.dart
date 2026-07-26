import 'package:disc_core/disc_core.dart';
import 'package:path/path.dart' as p;

enum JobStatus { queued, running, success, failure, cancelled }

/// UI-facing state for one archive being processed. Shared by both tabs so the
/// job list widget only has to understand one shape.
class Job {
  Job({
    required this.id,
    required this.sourcePath,
    this.status = JobStatus.queued,
    this.progress,
    this.stage,
    this.detail,
    this.errorMessage,
    this.warnings = const [],
    this.outputPaths = const [],
    this.summary,
    this.needsPassword = false,
    this.sourceDeleted = false,
  });

  final String id;
  final String sourcePath;

  final JobStatus status;

  /// `null` while the total size is unknown — render indeterminate.
  final double? progress;

  final String? stage;
  final String? detail;
  final String? errorMessage;
  final List<String> warnings;

  /// Files produced: every extracted file, or the single generated ISO.
  final List<String> outputPaths;

  /// One-line description of the outcome.
  final String? summary;

  final bool needsPassword;
  final bool sourceDeleted;

  String get sourceName => p.basename(sourcePath);

  bool get isFinished =>
      status == JobStatus.success ||
      status == JobStatus.failure ||
      status == JobStatus.cancelled;

  bool get isActive => status == JobStatus.running || status == JobStatus.queued;

  int get percent => ((progress ?? 0) * 100).round();

  Job copyWith({
    JobStatus? status,
    double? progress,
    bool clearProgress = false,
    String? stage,
    String? detail,
    bool clearDetail = false,
    String? errorMessage,
    List<String>? warnings,
    List<String>? outputPaths,
    String? summary,
    bool? needsPassword,
    bool? sourceDeleted,
  }) {
    return Job(
      id: id,
      sourcePath: sourcePath,
      status: status ?? this.status,
      progress: clearProgress ? null : (progress ?? this.progress),
      stage: stage ?? this.stage,
      detail: clearDetail ? null : (detail ?? this.detail),
      errorMessage: errorMessage ?? this.errorMessage,
      warnings: warnings ?? this.warnings,
      outputPaths: outputPaths ?? this.outputPaths,
      summary: summary ?? this.summary,
      needsPassword: needsPassword ?? this.needsPassword,
      sourceDeleted: sourceDeleted ?? this.sourceDeleted,
    );
  }

  Job applyProgress(ProgressUpdate update) => copyWith(
        status: JobStatus.running,
        progress: update.fraction,
        clearProgress: update.fraction == null,
        stage: update.stage,
        detail: update.detail,
        clearDetail: update.detail == null,
      );
}

/// Formats a byte count the way a file manager would.
String formatBytes(int bytes) {
  if (bytes < 1024) return '$bytes B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  var value = bytes / 1024;
  var unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return '${value.toStringAsFixed(value >= 10 ? 0 : 1)} ${units[unit]}';
}
