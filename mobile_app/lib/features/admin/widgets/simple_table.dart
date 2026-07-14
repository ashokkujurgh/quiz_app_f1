import 'package:flutter/material.dart';

import '../../../models/user.dart';

class UserManagementTile extends StatelessWidget {
  const UserManagementTile({super.key, required this.user, required this.busy, required this.onToggleStatus});

  final User user;
  final bool busy;
  final VoidCallback onToggleStatus;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(child: Text(user.name.characters.first.toUpperCase())),
      title: Text(user.name),
      subtitle: Text('${user.email} · ${user.role}'),
      trailing: Wrap(
        spacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Chip(
            label: Text(user.isActive ? 'Active' : 'Disabled'),
            backgroundColor: user.isActive ? Colors.green.withValues(alpha: 0.15) : Colors.red.withValues(alpha: 0.15),
            visualDensity: VisualDensity.compact,
          ),
          if (busy)
            const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
          else
            IconButton(
              icon: Icon(user.isActive ? Icons.block : Icons.check_circle_outline),
              tooltip: user.isActive ? 'Disable user' : 'Enable user',
              onPressed: onToggleStatus,
            ),
        ],
      ),
    );
  }
}
