import 'package:disc_core/disc_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zip_tools/models/job.dart';
import 'package:zip_tools/theme/app_theme.dart';
import 'package:zip_tools/ui/common/widgets.dart';

Widget wrap(Widget child, {Brightness brightness = Brightness.light}) {
  return MaterialApp(
    theme: brightness == Brightness.light ? AppTheme.light() : AppTheme.dark(),
    home: Scaffold(body: child),
  );
}

void main() {
  group('formatBytes', () {
    test('scales through the units a file manager would show', () {
      expect(formatBytes(0), '0 B');
      expect(formatBytes(999), '999 B');
      expect(formatBytes(1024), '1.0 KB');
      expect(formatBytes(1024 * 1024), '1.0 MB');
      expect(formatBytes(5 * 1024 * 1024 * 1024), '5.0 GB');
      // Two significant digits stay readable at the top of each range.
      expect(formatBytes(20 * 1024 * 1024), '20 MB');
    });
  });

  group('Job', () {
    test('applyProgress maps a core update onto UI state', () {
      final job = Job(id: '1', sourcePath: '/tmp/game.zip');
      final updated = job.applyProgress(const ProgressUpdate(
        stage: 'Extracting',
        detail: 'disc.bin',
        processed: 50,
        total: 200,
      ));

      expect(updated.status, JobStatus.running);
      expect(updated.progress, 0.25);
      expect(updated.percent, 25);
      expect(updated.stage, 'Extracting');
      expect(updated.detail, 'disc.bin');
    });

    test('an unknown total leaves progress indeterminate', () {
      final job = Job(id: '1', sourcePath: '/tmp/a.zip')
          .applyProgress(const ProgressUpdate(stage: 'Reading'));
      expect(job.progress, isNull);
    });

    test('status predicates line up with the lifecycle', () {
      final running = Job(id: '1', sourcePath: '/a.zip', status: JobStatus.running);
      final done = running.copyWith(status: JobStatus.success);
      expect(running.isActive, isTrue);
      expect(running.isFinished, isFalse);
      expect(done.isFinished, isTrue);
      expect(done.isActive, isFalse);
    });

    test('clearDetail actually clears rather than keeping the old value', () {
      final job = Job(id: '1', sourcePath: '/a.zip', detail: 'old.bin');
      expect(job.copyWith(clearDetail: true).detail, isNull);
      expect(job.copyWith().detail, 'old.bin');
    });
  });

  group('JobCard', () {
    testWidgets('shows a percentage and the current stage while running',
        (tester) async {
      await tester.pumpWidget(wrap(JobCard(
        job: Job(
          id: '1',
          sourcePath: '/tmp/Final Fantasy.zip',
          status: JobStatus.running,
          progress: 0.42,
          stage: 'Extracting',
          detail: 'disc1.bin',
        ),
      )));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Final Fantasy.zip'), findsOneWidget);
      expect(find.text('42%'), findsOneWidget);
      expect(find.textContaining('Extracting'), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
    });

    testWidgets('renders an error message when the job failed', (tester) async {
      await tester.pumpWidget(wrap(JobCard(
        job: Job(
          id: '1',
          sourcePath: '/tmp/broken.zip',
          status: JobStatus.failure,
          errorMessage: 'This ZIP is corrupted.',
        ),
      )));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('This ZIP is corrupted.'), findsOneWidget);
      expect(find.byIcon(Icons.error), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsNothing);
    });

    testWidgets('offers share and details once a job succeeds', (tester) async {
      var shared = false;
      await tester.pumpWidget(wrap(JobCard(
        job: Job(
          id: '1',
          sourcePath: '/tmp/game.zip',
          status: JobStatus.success,
          summary: '3 files · 1.2 GB',
          outputPaths: const ['/out/a.bin', '/out/b.bin', '/out/c.bin'],
        ),
        onShare: () => shared = true,
        onShowFiles: () {},
      )));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('3 files · 1.2 GB'), findsOneWidget);
      expect(find.text('3 files'), findsOneWidget);

      await tester.tap(find.text('Share'));
      expect(shared, isTrue);
    });

    testWidgets('surfaces conversion warnings', (tester) async {
      await tester.pumpWidget(wrap(JobCard(
        job: Job(
          id: '1',
          sourcePath: '/tmp/rip.zip',
          status: JobStatus.success,
          warnings: const ['CD audio tracks will not be included.'],
        ),
      )));
      await tester.pump(const Duration(milliseconds: 300));

      expect(
        find.text('CD audio tracks will not be included.'),
        findsOneWidget,
      );
    });
  });

  group('EmptyState', () {
    testWidgets('renders its message and optional action', (tester) async {
      var tapped = false;
      await tester.pumpWidget(wrap(EmptyState(
        icon: Icons.album_outlined,
        title: 'No game archives yet',
        message: 'Pick ZIP files containing disc images.',
        action: FilledButton(
          onPressed: () => tapped = true,
          child: const Text('Choose files'),
        ),
      )));

      expect(find.text('No game archives yet'), findsOneWidget);
      await tester.tap(find.text('Choose files'));
      expect(tapped, isTrue);
    });
  });

  group('DestinationCard', () {
    testWidgets('shortens long sandbox paths', (tester) async {
      await tester.pumpWidget(wrap(DestinationCard(
        path: '/data/user/0/com.example.zip_tools/app_flutter/ZipTools/ISO',
        onChange: () {},
        onReset: () {},
      )));

      expect(find.text('…/app_flutter/ZipTools/ISO'), findsOneWidget);
      expect(find.text('Saving to'), findsOneWidget);
    });

    testWidgets('shows a placeholder before the directory resolves',
        (tester) async {
      await tester.pumpWidget(wrap(DestinationCard(
        path: null,
        onChange: () {},
        onReset: () {},
      )));
      expect(find.text('Preparing…'), findsOneWidget);
    });
  });

  group('password dialog', () {
    testWidgets('returns the typed password', (tester) async {
      String? result;
      await tester.pumpWidget(MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: ElevatedButton(
              onPressed: () async {
                result = await showPasswordDialog(context, 'locked.zip');
              },
              child: const Text('open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(find.text('Password required'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'hunter2');
      await tester.tap(find.text('Unlock'));
      await tester.pumpAndSettle();

      expect(result, 'hunter2');
    });

    testWidgets('says so when re-prompting after a wrong password',
        (tester) async {
      String? result = 'unset';
      await tester.pumpWidget(MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: ElevatedButton(
              onPressed: () async {
                result = await showPasswordDialog(
                  context,
                  'locked.zip',
                  retry: true,
                );
              },
              child: const Text('open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(find.text('Wrong password'), findsOneWidget);
      expect(find.text('Incorrect password'), findsOneWidget);

      await tester.tap(find.text('Skip'));
      await tester.pumpAndSettle();
      expect(result, isNull);
    });
  });

  group('theme', () {
    test('light and dark schemes are both derived and distinct', () {
      final light = AppTheme.light();
      final dark = AppTheme.dark();
      expect(light.colorScheme.brightness, Brightness.light);
      expect(dark.colorScheme.brightness, Brightness.dark);
      expect(light.useMaterial3, isTrue);
      expect(dark.useMaterial3, isTrue);
      expect(light.colorScheme.surface, isNot(dark.colorScheme.surface));
    });

    testWidgets('cards and banners render in dark mode', (tester) async {
      await tester.pumpWidget(wrap(
        Column(
          children: [
            InfoBanner(message: 'Folder is not writable', onDismiss: () {}),
            JobCard(
              job: Job(
                id: '1',
                sourcePath: '/tmp/a.zip',
                status: JobStatus.success,
                summary: 'done',
              ),
            ),
          ],
        ),
        brightness: Brightness.dark,
      ));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Folder is not writable'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
