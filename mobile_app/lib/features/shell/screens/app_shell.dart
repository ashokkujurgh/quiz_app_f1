import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/offline_banner.dart';
import '../widgets/bottom_nav_bar.dart';

/// Hosts the 5 bottom-nav tab branches (Home/Quizzes/Friends/Messages/Profile)
/// via StatefulShellRoute.indexedStack, so each tab keeps its own navigation
/// stack and scroll position when switching tabs — mirrors AppLayout.tsx.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return OfflineBanner(
      child: Scaffold(
        body: navigationShell,
        bottomNavigationBar: BottomNavBar(
          currentIndex: navigationShell.currentIndex,
          onTap: (index) => navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          ),
        ),
      ),
    );
  }
}
