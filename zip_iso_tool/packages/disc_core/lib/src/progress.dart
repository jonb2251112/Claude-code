import 'dart:isolate';

/// A single progress update emitted by a long-running core operation.
///
/// [processed] and [total] are in bytes when the operation is byte-oriented,
/// otherwise in items. [total] is `null` while the size is still unknown, in
/// which case the UI should render an indeterminate indicator.
class ProgressUpdate {
  const ProgressUpdate({
    required this.stage,
    this.detail,
    this.processed = 0,
    this.total,
  });

  /// Coarse phase of the operation, e.g. `Extracting` or `Writing image`.
  final String stage;

  /// Fine-grained detail, usually the name of the file being handled.
  final String? detail;

  final int processed;
  final int? total;

  /// Fraction in `[0, 1]`, or `null` when the operation is indeterminate.
  double? get fraction {
    final t = total;
    if (t == null || t <= 0) return null;
    final f = processed / t;
    return f.isNaN ? null : f.clamp(0.0, 1.0);
  }

  Map<String, Object?> toMap() => {
        'stage': stage,
        'detail': detail,
        'processed': processed,
        'total': total,
      };

  static ProgressUpdate fromMap(Map<String, Object?> map) => ProgressUpdate(
        stage: map['stage'] as String,
        detail: map['detail'] as String?,
        processed: map['processed'] as int? ?? 0,
        total: map['total'] as int?,
      );

  @override
  String toString() =>
      'ProgressUpdate($stage, $detail, $processed/${total ?? '?'})';
}

/// Callback used by the core to report progress. Implementations must be cheap
/// and must not throw.
typedef ProgressSink = void Function(ProgressUpdate update);

/// A [ProgressSink] that drops everything. Handy in tests.
void discardProgress(ProgressUpdate _) {}

/// Wraps a [SendPort] as a [ProgressSink], throttled so that a fast loop over
/// thousands of small files cannot flood the receiving isolate's event queue.
class ThrottledPortSink {
  ThrottledPortSink(this.port, {this.minInterval = const Duration(milliseconds: 60)});

  final SendPort port;
  final Duration minInterval;
  final Stopwatch _since = Stopwatch()..start();
  bool _sentAnything = false;

  void call(ProgressUpdate update) {
    // Always let the first update and any completed update through, so the UI
    // never gets stuck one frame short of 100%.
    final isTerminal = update.total != null && update.processed >= update.total!;
    if (_sentAnything && !isTerminal && _since.elapsed < minInterval) return;
    _since.reset();
    _sentAnything = true;
    port.send(update.toMap());
  }
}

/// Error raised by core operations with a message that is safe to show to a
/// user verbatim.
class DiscCoreException implements Exception {
  const DiscCoreException(this.message, {this.isPasswordFailure = false});

  final String message;

  /// True when the operation failed specifically because a ZIP password was
  /// missing or wrong, which the UI turns into a re-prompt instead of an error.
  final bool isPasswordFailure;

  @override
  String toString() => message;
}
