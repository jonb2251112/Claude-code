import 'package:disc_core/disc_core.dart';
import 'package:flutter/material.dart';

import '../../controllers/convert_controller.dart';
import '../../models/job.dart';
import '../../services/feedback_service.dart';
import '../common/widgets.dart';

/// Tab 2 — inspect game archives and turn them into `.iso` files.
class ConvertPage extends StatelessWidget {
  const ConvertPage({
    super.key,
    required this.controller,
    required this.shareService,
  });

  final ConvertController controller;
  final ShareService shareService;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final jobs = controller.jobs.reversed.toList();
        final candidates = controller.candidates;

        return Scaffold(
          appBar: AppBar(
            title: const Text('ZIP to ISO'),
            actions: [
              if (jobs.any((j) => j.isFinished))
                IconButton(
                  tooltip: 'Clear finished',
                  icon: const Icon(Icons.cleaning_services_outlined),
                  onPressed: () {
                    controller.clearFinished();
                    Haptics.selection();
                  },
                ),
            ],
          ),
          floatingActionButton: candidates.isEmpty
              ? FloatingActionButton.extended(
                  onPressed: controller.inspecting
                      ? null
                      : () async {
                          await Haptics.impact();
                          await controller.pickAndInspect();
                        },
                  icon: const Icon(Icons.videogame_asset_outlined),
                  label: const Text('Select game ZIPs'),
                )
              : FloatingActionButton.extended(
                  onPressed:
                      controller.canConvert ? () => _convert(context) : null,
                  icon: controller.busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      : const Icon(Icons.album_outlined),
                  label: Text(
                    controller.busy
                        ? 'Converting…'
                        : 'Convert ${candidates.length}',
                  ),
                ),
          body: RefreshIndicator(
            onRefresh: () async {
              await controller.refreshCandidates();
              await Haptics.selection();
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (controller.banner != null)
                  SliverToBoxAdapter(
                    child: InfoBanner(
                      message: controller.banner!,
                      onDismiss: controller.dismissBanner,
                    ),
                  ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: DestinationCard(
                      path: controller.destination?.path,
                      enabled: !controller.busy,
                      onChange: controller.chooseDestination,
                      onReset: controller.useDefaultDestination,
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Card(
                      child: SwitchListTile(
                        value: controller.deleteOriginal,
                        onChanged: controller.busy
                            ? null
                            : (value) {
                                controller.setDeleteOriginal(value);
                                Haptics.selection();
                              },
                        title: const Text('Delete original after convert'),
                        subtitle: const Text('Only if conversion succeeds'),
                        secondary: const Icon(Icons.delete_outline),
                      ),
                    ),
                  ),
                ),
                if (controller.inspecting)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(16, 20, 16, 0),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2.4),
                          ),
                          SizedBox(width: 14),
                          Text('Reading archives…'),
                        ],
                      ),
                    ),
                  ),
                if (candidates.isEmpty && jobs.isEmpty && !controller.inspecting)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: Icons.album_outlined,
                      title: 'No game archives yet',
                      message:
                          'Pick ZIP files containing disc images or ROM sets. '
                          'The app reads each archive first and tells you '
                          'exactly how it will be converted before anything '
                          'is written.',
                      action: FilledButton.tonalIcon(
                        onPressed: controller.pickAndInspect,
                        icon: const Icon(Icons.add),
                        label: const Text('Choose files'),
                      ),
                    ),
                  ),
                if (candidates.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: SectionHeader(
                      title: 'READY TO CONVERT',
                      trailing: controller.busy
                          ? null
                          : TextButton.icon(
                              onPressed: controller.pickAndInspect,
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('Add'),
                            ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList.separated(
                      itemCount: candidates.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) => _CandidateCard(
                        candidate: candidates[index],
                        enabled: !controller.busy,
                        onRemove: () {
                          controller.removeCandidate(candidates[index]);
                          Haptics.selection();
                        },
                        onRename: (name) =>
                            controller.renameCandidate(candidates[index], name),
                      ),
                    ),
                  ),
                ],
                if (jobs.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: SectionHeader(
                      title: 'CONVERSIONS',
                      trailing: controller.busy
                          ? TextButton(
                              onPressed: () {
                                controller.cancelCurrent();
                                Haptics.failure();
                              },
                              child: const Text('Cancel'),
                            )
                          : null,
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
                    sliver: SliverList.separated(
                      itemCount: jobs.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final job = jobs[index];
                        return JobCard(
                          key: ValueKey('${job.id}-${job.status}'),
                          job: job,
                          onShare: job.outputPaths.isEmpty
                              ? null
                              : () => _share(context, job.outputPaths),
                        );
                      },
                    ),
                  ),
                ] else
                  const SliverToBoxAdapter(child: SizedBox(height: 120)),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _convert(BuildContext context) async {
    await Haptics.impact();
    final before = controller.jobs.length;

    await controller.convertAll(
      onPasswordNeeded: (name, {bool retry = false}) async {
        if (!context.mounted) return null;
        return showPasswordDialog(context, name, retry: retry);
      },
    );
    if (!context.mounted) return;

    final finished = controller.jobs.skip(before).toList();
    if (finished.isEmpty) return;

    final successes =
        finished.where((j) => j.status == JobStatus.success).toList();
    final failures = finished.where((j) => j.status == JobStatus.failure).length;

    if (failures == 0 && successes.isNotEmpty) {
      await Haptics.success();
      if (!context.mounted) return;
      showResultSnackBar(
        context,
        success: true,
        message: successes.length == 1
            ? 'Created ${successes.first.outputPaths.first.split('/').last}'
            : 'Created ${successes.length} ISO files',
        action: SnackBarAction(
          label: 'Share',
          onPressed: () => _share(
            context,
            successes.expand((j) => j.outputPaths).toList(),
          ),
        ),
      );
    } else {
      await Haptics.failure();
      if (!context.mounted) return;
      showResultSnackBar(
        context,
        success: false,
        message: successes.isEmpty
            ? (failures == 1
                ? 'Conversion failed'
                : 'All $failures conversions failed')
            : 'Converted ${successes.length}, failed $failures',
      );
    }
  }

  Future<void> _share(BuildContext context, List<String> paths) async {
    final shared = await shareService.shareFiles(paths, subject: 'ISO image');
    if (!context.mounted || shared) return;
    showResultSnackBar(
      context,
      success: false,
      message: 'That file is no longer available to share.',
    );
  }
}

/// Card describing one queued archive: what we found inside, what we will do
/// about it, and the output name the user can edit.
class _CandidateCard extends StatelessWidget {
  const _CandidateCard({
    required this.candidate,
    required this.enabled,
    required this.onRemove,
    required this.onRename,
  });

  final ConversionCandidate candidate;
  final bool enabled;
  final VoidCallback onRemove;
  final ValueChanged<String> onRename;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final plan = candidate.plan;
    final (label, icon, tone) = _describe(plan.strategy, scheme);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    candidate.sourceName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
                IconButton(
                  onPressed: enabled ? onRemove : null,
                  icon: const Icon(Icons.close, size: 20),
                  tooltip: 'Remove',
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(
                  avatar: Icon(icon, size: 16, color: tone),
                  label: Text(label),
                  labelStyle: Theme.of(context).textTheme.labelMedium,
                  visualDensity: VisualDensity.compact,
                  side: BorderSide(color: scheme.outlineVariant),
                ),
                Chip(
                  label: Text(formatBytes(candidate.sizeOnDisk)),
                  labelStyle: Theme.of(context).textTheme.labelMedium,
                  visualDensity: VisualDensity.compact,
                  side: BorderSide(color: scheme.outlineVariant),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              plan.reason,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    height: 1.45,
                  ),
            ),
            for (final warning in plan.warnings) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.tertiaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      size: 18,
                      color: scheme.onTertiaryContainer,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        warning,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onTertiaryContainer,
                              height: 1.45,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (plan.isSupported) ...[
              const SizedBox(height: 14),
              TextFormField(
                initialValue: candidate.outputName,
                enabled: enabled,
                onChanged: onRename,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Output file name',
                  prefixIcon: Icon(Icons.drive_file_rename_outline),
                  isDense: true,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  (String, IconData, Color) _describe(DiscStrategy strategy, ColorScheme scheme) {
    return switch (strategy) {
      DiscStrategy.binCue => ('BIN/CUE rip', Icons.album_outlined, scheme.primary),
      DiscStrategy.rawImage => ('Disc image', Icons.save_outlined, scheme.primary),
      DiscStrategy.packFiles =>
        ('File set', Icons.folder_outlined, scheme.secondary),
      DiscStrategy.unsupportedDiscFormat =>
        ('Not supported', Icons.block, scheme.error),
    };
  }
}
