import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/deep_link_resolver.dart';
import '../state/notifications_controller.dart';
import '../widgets/notification_tile.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () => ref.read(notificationsControllerProvider.notifier).markAllRead(),
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: notificationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load notifications: $err')),
        data: (notifications) => notifications.isEmpty
            ? const Center(child: Text('No notifications yet.'))
            : ListView.builder(
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final n = notifications[index];
                  return NotificationTile(
                    notification: n,
                    onTap: () {
                      ref.read(notificationsControllerProvider.notifier).markRead(n.id);
                      final path = resolveDeepLink(n.url);
                      if (path != null) context.push(path);
                    },
                  );
                },
              ),
      ),
    );
  }
}
