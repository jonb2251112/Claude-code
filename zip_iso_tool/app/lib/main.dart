import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'controllers/convert_controller.dart';
import 'controllers/extract_controller.dart';
import 'services/feedback_service.dart';
import 'services/storage_service.dart';
import 'theme/app_theme.dart';
import 'ui/home_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const ZipToolsApp());
}

class ZipToolsApp extends StatefulWidget {
  const ZipToolsApp({super.key});

  @override
  State<ZipToolsApp> createState() => _ZipToolsAppState();
}

class _ZipToolsAppState extends State<ZipToolsApp> {
  late final StorageService _storage;
  late final ExtractController _extract;
  late final ConvertController _convert;
  final ShareService _share = const ShareService();

  @override
  void initState() {
    super.initState();
    _storage = StorageService();
    _extract = ExtractController(_storage);
    _convert = ConvertController(_storage);
    // Resolving the documents directory is async; the UI renders a
    // "Preparing…" destination until these land, which is a single frame.
    _extract.initialize();
    _convert.initialize();
    // Anything left in scratch from a previous run (a crash, a force-quit) is
    // dead weight.
    _storage.clearScratch();
  }

  @override
  void dispose() {
    _extract.dispose();
    _convert.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ZIP Tools',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      home: HomeShell(
        extractController: _extract,
        convertController: _convert,
        shareService: _share,
      ),
    );
  }
}
