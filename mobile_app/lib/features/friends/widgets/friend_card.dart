import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/sockets/presence_socket_service.dart';
import '../../../models/user.dart';

class FriendCard extends ConsumerWidget {
  const FriendCard({
    super.key,
    required this.user,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final User user;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final onlineIds = ref.watch(onlineUserIdsProvider);
    final isOnline = onlineIds.contains(user.id);

    return ListTile(
      onTap: onTap,
      leading: Stack(
        children: [
          CircleAvatar(
            backgroundImage: user.avatar != null ? CachedNetworkImageProvider(user.avatar!) : null,
            child: user.avatar == null ? Text(user.name.characters.first.toUpperCase()) : null,
          ),
          if (isOnline)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  border: Border.all(color: Theme.of(context).scaffoldBackgroundColor, width: 2),
                ),
              ),
            ),
        ],
      ),
      title: Text(user.name),
      subtitle: Text(subtitle ?? '@${user.username ?? ''}'),
      trailing: trailing,
    );
  }
}
