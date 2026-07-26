import 'package:flutter/material.dart';

import '../../models/job.dart';
import '../../theme/app_theme.dart';

/// Full-height placeholder shown when a tab has nothing to display yet.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: scheme.secondaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 44, color: scheme.onSecondaryContainer),
            ),
            const SizedBox(height: 24),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                    height: 1.45,
                  ),
            ),
            if (action != null) ...[
              const SizedBox(height: 24),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// Dismissible inline message used for non-fatal problems (unwritable folder,
/// nothing convertible) that would be lost in a snackbar.
class InfoBanner extends StatelessWidget {
  const InfoBanner({
    super.key,
    required this.message,
    required this.onDismiss,
    this.icon = Icons.info_outline,
    this.tone = BannerTone.warning,
  });

  final String message;
  final VoidCallback onDismiss;
  final IconData icon;
  final BannerTone tone;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (background, foreground) = switch (tone) {
      BannerTone.warning => (scheme.tertiaryContainer, scheme.onTertiaryContainer),
      BannerTone.error => (scheme.errorContainer, scheme.onErrorContainer),
      BannerTone.info => (scheme.secondaryContainer, scheme.onSecondaryContainer),
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Material(
        color: background,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 4, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: foreground),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: foreground, height: 1.4),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18),
                color: foreground,
                onPressed: onDismiss,
                tooltip: 'Dismiss',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum BannerTone { info, warning, error }

/// Section heading with an optional trailing action.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 8, 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                  ),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Row showing the current output folder with buttons to change or reset it.
class DestinationCard extends StatelessWidget {
  const DestinationCard({
    super.key,
    required this.path,
    required this.onChange,
    required this.onReset,
    this.enabled = true,
  });

  final String? path;
  final VoidCallback onChange;
  final VoidCallback onReset;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
        child: Row(
          children: [
            Icon(Icons.folder_outlined, color: scheme.primary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Saving to',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    path == null ? 'Preparing…' : _prettyPath(path!),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              enabled: enabled,
              tooltip: 'Change output folder',
              icon: const Icon(Icons.more_vert),
              onSelected: (value) {
                if (value == 'change') onChange();
                if (value == 'reset') onReset();
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'change', child: Text('Choose folder…')),
                PopupMenuItem(value: 'reset', child: Text('Use app storage')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Absolute sandbox paths are long and meaningless to a user; show the tail.
  static String _prettyPath(String path) {
    final segments = path.split('/').where((s) => s.isNotEmpty).toList();
    if (segments.length <= 3) return path;
    return '…/${segments.sublist(segments.length - 3).join('/')}';
  }
}

/// Progress + status card for one job. Animates between running and finished
/// states so a list of jobs reads as a live queue rather than a log.
class JobCard extends StatelessWidget {
  const JobCard({
    super.key,
    required this.job,
    this.onShare,
    this.onShowFiles,
  });

  final Job job;
  final VoidCallback? onShare;
  final VoidCallback? onShowFiles;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (icon, color) = switch (job.status) {
      JobStatus.success => (Icons.check_circle, scheme.primary),
      JobStatus.failure => (Icons.error, scheme.error),
      JobStatus.cancelled => (Icons.remove_circle_outline, scheme.outline),
      _ => (Icons.hourglass_top, scheme.secondary),
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    job.sourceName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
                if (job.status == JobStatus.running)
                  Text(
                    job.progress == null ? '' : '${job.percent}%',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: scheme.primary,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
              ],
            ),
            AnimatedSize(
              duration: Motion.medium,
              curve: Motion.emphasized,
              alignment: Alignment.topCenter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (job.status == JobStatus.running) ...[
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: TweenAnimationBuilder<double>(
                        // Tweening between reported values keeps the bar
                        // gliding instead of stepping on every isolate message.
                        tween: Tween(end: job.progress ?? 0),
                        duration: Motion.fast,
                        curve: Curves.linear,
                        builder: (context, value, _) => LinearProgressIndicator(
                          value: job.progress == null ? null : value,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      [job.stage, job.detail]
                          .whereType<String>()
                          .where((s) => s.isNotEmpty)
                          .join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                  if (job.summary != null && job.status == JobStatus.success) ...[
                    const SizedBox(height: 8),
                    Text(
                      job.summary!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                            height: 1.4,
                          ),
                    ),
                  ],
                  if (job.errorMessage != null &&
                      job.errorMessage!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    _MessageBox(
                      text: job.errorMessage!,
                      background: scheme.errorContainer,
                      foreground: scheme.onErrorContainer,
                      icon: Icons.error_outline,
                    ),
                  ],
                  for (final warning in job.warnings) ...[
                    const SizedBox(height: 8),
                    _MessageBox(
                      text: warning,
                      background: scheme.tertiaryContainer,
                      foreground: scheme.onTertiaryContainer,
                      icon: Icons.warning_amber_rounded,
                    ),
                  ],
                  if (job.status == JobStatus.success &&
                      (onShare != null || onShowFiles != null)) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        if (onShowFiles != null)
                          TextButton.icon(
                            onPressed: onShowFiles,
                            icon: const Icon(Icons.list_alt, size: 18),
                            label: Text(
                              job.outputPaths.length == 1
                                  ? 'Details'
                                  : '${job.outputPaths.length} files',
                            ),
                          ),
                        const Spacer(),
                        if (onShare != null)
                          FilledButton.tonalIcon(
                            onPressed: onShare,
                            icon: const Icon(Icons.ios_share, size: 18),
                            label: const Text('Share'),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 40),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({
    required this.text,
    required this.background,
    required this.foreground,
    required this.icon,
  });

  final String text;
  final Color background;
  final Color foreground;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: foreground),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: foreground, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}

/// Asks for a ZIP password. Returns null if the user cancels.
Future<String?> showPasswordDialog(
  BuildContext context,
  String archiveName, {
  bool retry = false,
}) {
  final controller = TextEditingController();
  var obscure = true;

  return showDialog<String>(
    context: context,
    barrierDismissible: false,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        icon: const Icon(Icons.lock_outline),
        title: Text(retry ? 'Wrong password' : 'Password required'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              retry
                  ? 'That password did not unlock "$archiveName". Try again.'
                  : '"$archiveName" is encrypted. Enter its password to '
                      'continue.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.45,
                  ),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: controller,
              autofocus: true,
              obscureText: obscure,
              textInputAction: TextInputAction.done,
              onSubmitted: (value) => Navigator.of(context).pop(value),
              decoration: InputDecoration(
                labelText: 'Password',
                errorText: retry ? 'Incorrect password' : null,
                suffixIcon: IconButton(
                  icon: Icon(obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => obscure = !obscure),
                  tooltip: obscure ? 'Show password' : 'Hide password',
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Skip'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Unlock'),
          ),
        ],
      ),
    ),
  );
}

/// Bottom sheet listing the files a job produced.
Future<void> showFileListSheet(
  BuildContext context, {
  required String title,
  required List<String> paths,
  required void Function(List<String> paths) onShare,
}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      builder: (context, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
                IconButton(
                  onPressed: () => onShare(paths),
                  icon: const Icon(Icons.ios_share),
                  tooltip: 'Share all',
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              controller: scrollController,
              itemCount: paths.length,
              itemBuilder: (context, index) {
                final path = paths[index];
                return ListTile(
                  leading: const Icon(Icons.insert_drive_file_outlined),
                  title: Text(
                    path.split('/').last,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    path,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.ios_share, size: 20),
                    onPressed: () => onShare([path]),
                    tooltip: 'Share this file',
                  ),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}

/// Snackbar helper that keeps success/error styling consistent.
void showResultSnackBar(
  BuildContext context, {
  required String message,
  required bool success,
  SnackBarAction? action,
}) {
  final scheme = Theme.of(context).colorScheme;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              success ? Icons.check_circle_outline : Icons.error_outline,
              color: success ? scheme.onInverseSurface : scheme.onError,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: success ? null : scheme.error,
        duration: Duration(seconds: success ? 4 : 6),
        action: action,
      ),
    );
}
