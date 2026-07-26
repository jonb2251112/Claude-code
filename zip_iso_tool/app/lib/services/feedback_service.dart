import 'dart:io';

import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

/// Haptic feedback with meaning attached, so call sites read as intent rather
/// than as a vibration pattern.
class Haptics {
  const Haptics._();

  /// A job finished successfully.
  static Future<void> success() async {
    await HapticFeedback.mediumImpact();
    await Future<void>.delayed(const Duration(milliseconds: 90));
    await HapticFeedback.lightImpact();
  }

  /// A job failed, or input was rejected.
  static Future<void> failure() async {
    await HapticFeedback.heavyImpact();
    await Future<void>.delayed(const Duration(milliseconds: 110));
    await HapticFeedback.heavyImpact();
  }

  /// A discrete UI action landed — tab change, selection, toggle.
  static Future<void> selection() => HapticFeedback.selectionClick();

  /// Something started.
  static Future<void> impact() => HapticFeedback.lightImpact();
}

/// Wrapper over the system share sheet.
class ShareService {
  const ShareService();

  /// Shares one or more files. Returns false when there is nothing to share.
  Future<bool> shareFiles(
    List<String> paths, {
    String? subject,
    String? text,
  }) async {
    final existing = <XFile>[];
    for (final path in paths) {
      if (await File(path).exists()) existing.add(XFile(path));
    }
    if (existing.isEmpty) return false;

    await SharePlus.instance.share(
      ShareParams(
        files: existing,
        subject: subject,
        text: text,
      ),
    );
    return true;
  }
}
