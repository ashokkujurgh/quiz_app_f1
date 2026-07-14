import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../../models/app_notification.dart';

class NotificationTile extends StatelessWidget {
  const NotificationTile({super.key, required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
        child: const Icon(Icons.notifications_outlined),
      ),
      title: Text(notification.title ?? 'Meenzo', style: TextStyle(fontWeight: notification.read ? FontWeight.normal : FontWeight.w700)),
      subtitle: Text(notification.body ?? ''),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            timeago.format(DateTime.tryParse(notification.receivedAt) ?? DateTime.now()),
            style: theme.textTheme.bodySmall,
          ),
          if (!notification.read) ...[
            const SizedBox(height: 4),
            Container(width: 8, height: 8, decoration: BoxDecoration(color: theme.colorScheme.primary, shape: BoxShape.circle)),
          ],
        ],
      ),
    );
  }
}
