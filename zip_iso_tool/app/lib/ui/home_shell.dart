import 'package:flutter/material.dart';

import '../controllers/convert_controller.dart';
import '../controllers/extract_controller.dart';
import '../services/feedback_service.dart';
import '../theme/app_theme.dart';
import 'convert/convert_page.dart';
import 'extract/extract_page.dart';

/// Two-tab shell with a Material 3 navigation bar.
///
/// Both pages stay alive across tab switches so a running job's progress is
/// never lost when the user looks at the other tab.
class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.extractController,
    required this.convertController,
    required this.shareService,
  });

  final ExtractController extractController;
  final ConvertController convertController;
  final ShareService shareService;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  final PageController _pageController = PageController();
  int _index = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goTo(int index) {
    if (index == _index) return;
    Haptics.selection();
    _pageController.animateToPage(
      index,
      duration: Motion.medium,
      curve: Motion.emphasized,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // A PageView keeps both tabs mounted — so a running job's progress
      // survives a tab switch — and adds swipe navigation for free.
      body: PageView(
        controller: _pageController,
        onPageChanged: (index) => setState(() => _index = index),
        children: [
          ExtractPage(
            controller: widget.extractController,
            shareService: widget.shareService,
          ),
          ConvertPage(
            controller: widget.convertController,
            shareService: widget.shareService,
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _goTo,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.folder_zip_outlined),
            selectedIcon: Icon(Icons.folder_zip),
            label: 'Extract ZIP',
          ),
          NavigationDestination(
            icon: Icon(Icons.album_outlined),
            selectedIcon: Icon(Icons.album),
            label: 'ZIP to ISO',
          ),
        ],
      ),
    );
  }
}
