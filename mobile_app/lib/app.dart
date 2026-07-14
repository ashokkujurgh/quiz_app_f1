import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/routing/app_router.dart';
import 'core/routing/deep_link_resolver.dart';
import 'core/theme/app_theme.dart';
import 'features/settings/state/settings_controller.dart';
import 'services/notification_service.dart';

class MeenzoApp extends ConsumerStatefulWidget {
  const MeenzoApp({super.key});

  @override
  ConsumerState<MeenzoApp> createState() => _MeenzoAppState();
}

class _MeenzoAppState extends ConsumerState<MeenzoApp> {
  @override
  void initState() {
    super.initState();
    final router = ref.read(appRouterProvider);
    NotificationService.setNavigationCallback((url) {
      final path = resolveDeepLink(url);
      if (path != null) router.go(path);
    });
    // Handle the case where the app was launched cold from a terminated
    // state via a notification tap.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      consumePendingDeepLink(router);
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(settingsControllerProvider).valueOrNull ?? ThemeMode.system;

    return MaterialApp.router(
      title: 'Meenzo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
