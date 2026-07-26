/// Pure-Dart core used by the ZIP Tools Flutter app.
///
/// Nothing in this library imports `dart:ui` or `package:flutter`, so every
/// piece of it can run inside a background isolate and be unit-tested with
/// `dart test`.
library;

export 'src/progress.dart';
export 'src/zip/zip_inspector.dart';
export 'src/zip/zip_extractor.dart';
export 'src/disc/cue_sheet.dart';
export 'src/disc/sector_codec.dart';
export 'src/disc/disc_detector.dart';
export 'src/disc/zip_to_iso.dart';
export 'src/iso/iso_writer.dart';
