import 'package:flutter/material.dart';

import '../../controllers/extract_controller.dart';
import '../../models/job.dart';
import '../../services/feedback_service.dart';
import '../../theme/app_theme.dart';
import '../common/widgets.dart';

/// Tab 1 — pick ZIP archives and unpack them.
class ExtractPage extends StatelessWidget {
  const ExtractPage({
    super.key,
    required this.controller,
    required this.shareService,
  });

  final ExtractController controller;
  final ShareService shareService;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final jobs = controller.jobs.reversed.toList();

        return Scaffold(
          appBar: AppBar(
            title: const Text('Extract ZIP'),
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
          floatingActionButton: FloatingActionButton.extended(
            onPressed: controller.busy ? null : () => _pick(context),
            icon: controller.busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  )
                : const Icon(Icons.folder_zip_outlined),
            label: Text(controller.busy ? 'Working…' : 'Select ZIP files'),
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              await controller.initialize();
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
                      child: Column(
                        children: [
                          SwitchListTile(
                            value: controller.extractNested,
                            onChanged: controller.busy
                                ? null
                                : (value) {
                                    controller.setExtractNested(value);
                                    Haptics.selection();
                                  },
                            title: const Text('Expand nested ZIPs'),
                            subtitle: const Text(
                              'Unpack archives found inside the archive',
                            ),
                            secondary: const Icon(Icons.account_tree_outlined),
                          ),
                          const Divider(height: 1, indent: 16, endIndent: 16),
                          SwitchListTile(
                            value: controller.deleteOriginal,
                            onChanged: controller.busy
                                ? null
                                : (value) {
                                    controller.setDeleteOriginal(value);
                                    Haptics.selection();
                                  },
                            title: const Text('Delete original after extract'),
                            subtitle: const Text(
                              'Only if extraction succeeds',
                            ),
                            secondary: const Icon(Icons.delete_outline),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (jobs.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: Icons.folder_zip_outlined,
                      title: 'No archives yet',
                      message:
                          'Pick one or more .zip files and they will be '
                          'unpacked into the folder above. Password-protected '
                          'and nested archives are handled too.',
                    ),
                  )
                else ...[
                  SliverToBoxAdapter(
                    child: SectionHeader(
                      title: 'ARCHIVES',
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
                        return AnimatedSwitcher(
                          duration: Motion.medium,
                          switchInCurve: Motion.emphasized,
                          child: JobCard(
                            key: ValueKey('${job.id}-${job.status}'),
                            job: job,
                            onShare: job.outputPaths.isEmpty
                                ? null
                                : () => _share(context, job.outputPaths),
                            onShowFiles: job.outputPaths.isEmpty
                                ? null
                                : () => showFileListSheet(
                                      context,
                                      title: job.sourceName,
                                      paths: job.outputPaths,
                                      onShare: (paths) =>
                                          _share(context, paths),
                                    ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pick(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    await Haptics.impact();

    final before = controller.jobs.length;
    await controller.pickAndExtract(
      onPasswordNeeded: (name, {bool retry = false}) async {
        if (!context.mounted) return null;
        return showPasswordDialog(context, name, retry: retry);
      },
    );
    if (!context.mounted) return;

    final finished = controller.jobs.skip(before).toList();
    if (finished.isEmpty) return;

    final failures = finished.where((j) => j.status == JobStatus.failure).length;
    final successes =
        finished.where((j) => j.status == JobStatus.success).length;

    if (failures == 0 && successes > 0) {
      await Haptics.success();
      if (!context.mounted) return;
      showResultSnackBar(
        context,
        success: true,
        message: successes == 1
            ? 'Extracted ${finished.first.sourceName}'
            : 'Extracted $successes archives',
        action: SnackBarAction(
          label: 'Share',
          onPressed: () => _share(context, controller.allOutputs),
        ),
      );
    } else if (successes == 0 && failures > 0) {
      await Haptics.failure();
      if (!context.mounted) return;
      showResultSnackBar(
        context,
        success: false,
        message: failures == 1
            ? 'Could not extract ${finished.first.sourceName}'
            : 'Failed to extract $failures archives',
      );
    } else if (failures > 0) {
      await Haptics.failure();
      if (!context.mounted) return;
      showResultSnackBar(
        context,
        success: false,
        message: 'Extracted $successes, failed $failures',
      );
    }
    messenger.hideCurrentMaterialBanner();
  }

  Future<void> _share(BuildContext context, List<String> paths) async {
    if (paths.isEmpty) return;
    // Share sheets choke on huge selections; cap it and say so.
    const limit = 30;
    final selection = paths.take(limit).toList();
    final shared = await shareService.shareFiles(
      selection,
      subject: 'Extracted files',
    );
    if (!context.mounted) return;
    if (!shared) {
      showResultSnackBar(
        context,
        success: false,
        message: 'Those files are no longer available to share.',
      );
    } else if (paths.length > limit) {
      showResultSnackBar(
        context,
        success: true,
        message: 'Shared the first $limit of ${paths.length} files.',
      );
    }
  }
}
