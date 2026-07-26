import 'dart:async';
import 'dart:io';
import 'dart:isolate';

import 'package:disc_core/disc_core.dart';

/// Request sent to the extraction isolate.
///
/// Every field is a plain value so the object can cross an isolate boundary.
class ExtractRequest {
  const ExtractRequest({
    required this.replyPort,
    required this.sourcePath,
    required this.destinationPath,
    required this.password,
    required this.extractNested,
    required this.deleteSource,
  });

  final SendPort replyPort;
  final String sourcePath;
  final String destinationPath;
  final String? password;
  final bool extractNested;
  final bool deleteSource;
}

/// Request sent to the conversion isolate.
class ConvertRequest {
  const ConvertRequest({
    required this.replyPort,
    required this.sourcePath,
    required this.outputPath,
    required this.workingDirectoryPath,
    required this.password,
    required this.volumeName,
    required this.deleteSource,
  });

  final SendPort replyPort;
  final String sourcePath;
  final String outputPath;
  final String workingDirectoryPath;
  final String? password;
  final String? volumeName;
  final bool deleteSource;
}

/// Envelope for a failed job. [DiscCoreException] itself is sendable, but
/// wrapping keeps the success/failure discrimination explicit.
class JobFailure {
  const JobFailure(this.message, {this.isPasswordFailure = false});

  final String message;
  final bool isPasswordFailure;
}

/// Handle to a running background job.
class JobHandle<T> {
  JobHandle._(this.result, this.progress, this._isolate);

  final Future<T> result;
  final Stream<ProgressUpdate> progress;
  final Isolate _isolate;

  /// Aborts the job. Partially written output is the caller's to clean up.
  void cancel() => _isolate.kill(priority: Isolate.immediate);
}

/// Runs ZIP and ISO work on a background isolate.
///
/// These jobs are CPU- and I/O-bound for minutes at a time on a phone. Running
/// them on the UI isolate would jank every frame, so each job gets its own
/// isolate and streams progress back over a port.
class BackgroundJobs {
  static Future<JobHandle<ExtractResult>> extract(
    ExtractRequest Function(SendPort) build,
  ) =>
      _spawn<ExtractResult, ExtractRequest>(_extractEntryPoint, build);

  static Future<JobHandle<ConvertResult>> convert(
    ConvertRequest Function(SendPort) build,
  ) =>
      _spawn<ConvertResult, ConvertRequest>(_convertEntryPoint, build);

  static Future<JobHandle<T>> _spawn<T, R>(
    void Function(R) entryPoint,
    R Function(SendPort) buildRequest,
  ) async {
    final receivePort = ReceivePort();
    final completer = Completer<T>();
    final progress = StreamController<ProgressUpdate>.broadcast();

    final isolate = await Isolate.spawn(
      entryPoint,
      buildRequest(receivePort.sendPort),
      onError: receivePort.sendPort,
      onExit: receivePort.sendPort,
      errorsAreFatal: true,
    );

    receivePort.listen((message) {
      if (message is Map<String, Object?>) {
        progress.add(ProgressUpdate.fromMap(message));
        return;
      }
      if (message is JobFailure) {
        if (!completer.isCompleted) {
          completer.completeError(
            DiscCoreException(
              message.message,
              isPasswordFailure: message.isPasswordFailure,
            ),
          );
        }
      } else if (message is T) {
        if (!completer.isCompleted) completer.complete(message);
      } else if (message is List && message.length == 2) {
        // Uncaught error forwarded by the isolate runtime.
        if (!completer.isCompleted) {
          completer.completeError(
            DiscCoreException('The job stopped unexpectedly: ${message.first}'),
          );
        }
      } else if (message == null) {
        // onExit fires with null. If nothing completed us, the isolate died.
        if (!completer.isCompleted) {
          completer.completeError(
            const DiscCoreException(
              'The job stopped before it finished. This usually means the '
              'device ran out of memory or storage.',
            ),
          );
        }
        receivePort.close();
        unawaited(progress.close());
      }
    });

    return JobHandle._(completer.future, progress.stream, isolate);
  }
}

void _extractEntryPoint(ExtractRequest request) {
  unawaited(_runExtract(request));
}

Future<void> _runExtract(ExtractRequest request) async {
  final sink = ThrottledPortSink(request.replyPort);
  try {
    final result = await ZipExtractor.extract(
      source: File(request.sourcePath),
      destination: Directory(request.destinationPath),
      options: ExtractOptions(
        password: request.password,
        extractNested: request.extractNested,
        deleteSourceOnSuccess: request.deleteSource,
      ),
      onProgress: sink.call,
    );
    request.replyPort.send(result);
  } on DiscCoreException catch (e) {
    request.replyPort.send(
      JobFailure(e.message, isPasswordFailure: e.isPasswordFailure),
    );
  } on FileSystemException catch (e) {
    request.replyPort.send(JobFailure(_describeFileSystemError(e)));
  } catch (e) {
    request.replyPort.send(JobFailure('Extraction failed: $e'));
  }
}

void _convertEntryPoint(ConvertRequest request) {
  unawaited(_runConvert(request));
}

Future<void> _runConvert(ConvertRequest request) async {
  final sink = ThrottledPortSink(request.replyPort);
  try {
    final result = await ZipToIsoConverter.convert(
      source: File(request.sourcePath),
      workingDirectory: Directory(request.workingDirectoryPath),
      options: ConvertOptions(
        outputFile: File(request.outputPath),
        password: request.password,
        volumeName: request.volumeName,
        deleteSourceOnSuccess: request.deleteSource,
      ),
      onProgress: sink.call,
    );
    request.replyPort.send(result);
  } on DiscCoreException catch (e) {
    request.replyPort.send(
      JobFailure(e.message, isPasswordFailure: e.isPasswordFailure),
    );
  } on FileSystemException catch (e) {
    request.replyPort.send(JobFailure(_describeFileSystemError(e)));
  } catch (e) {
    request.replyPort.send(JobFailure('Conversion failed: $e'));
  }
}

String _describeFileSystemError(FileSystemException e) {
  final errno = e.osError?.errorCode;
  if (errno == 28) {
    return 'There is not enough free space on the device to finish this job.';
  }
  if (errno == 13 || errno == 1) {
    return 'Permission denied writing to that folder. Choose a different '
        'output folder, or use the app\'s own storage.';
  }
  return 'A file error occurred: ${e.message}';
}
