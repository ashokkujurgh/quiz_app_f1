import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/routing/route_paths.dart';
import '../../../models/user.dart';
import '../../auth/state/auth_controller.dart';
import '../../profile/data/profile_repository.dart';
import '../state/settings_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _bioController = TextEditingController();
  bool _saving = false;
  String? _error;
  String? _success;

  // Client-side-only toggles — the backend has no corresponding fields for
  // these today (see settings_controller.dart), so they aren't persisted.
  bool _notifyFriendRequests = true;
  bool _notifyLikesComments = true;
  bool _notifyMessages = true;
  bool _showOnlineStatus = true;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authControllerProvider).valueOrNull;
    _nameController.text = user?.name ?? '';
    _usernameController.text = user?.username ?? '';
    _bioController.text = user?.bio ?? '';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _saveAccount() async {
    setState(() {
      _saving = true;
      _error = null;
      _success = null;
    });
    try {
      await ref.read(profileRepositoryProvider).updateProfile(
            name: _nameController.text.trim(),
            username: _usernameController.text.trim(),
            bio: _bioController.text.trim(),
          );
      ref.invalidate(authControllerProvider);
      if (mounted) setState(() => _success = 'Saved!');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(settingsControllerProvider).valueOrNull ?? ThemeMode.system;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const _SectionHeader('Appearance'),
          RadioListTile<ThemeMode>(
            title: const Text('System default'),
            value: ThemeMode.system,
            groupValue: themeMode,
            onChanged: (m) => ref.read(settingsControllerProvider.notifier).setThemeMode(m!),
          ),
          RadioListTile<ThemeMode>(
            title: const Text('Light'),
            value: ThemeMode.light,
            groupValue: themeMode,
            onChanged: (m) => ref.read(settingsControllerProvider.notifier).setThemeMode(m!),
          ),
          RadioListTile<ThemeMode>(
            title: const Text('Dark'),
            value: ThemeMode.dark,
            groupValue: themeMode,
            onChanged: (m) => ref.read(settingsControllerProvider.notifier).setThemeMode(m!),
          ),
          const Divider(),
          const _SectionHeader('Account'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                if (_success != null) Text(_success!, style: const TextStyle(color: Colors.green)),
                TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Full name')),
                const SizedBox(height: 8),
                TextField(controller: _usernameController, decoration: const InputDecoration(labelText: 'Username')),
                const SizedBox(height: 8),
                TextField(controller: _bioController, maxLines: 2, decoration: const InputDecoration(labelText: 'Bio')),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _saveAccount,
                    child: _saving
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save Changes'),
                  ),
                ),
              ],
            ),
          ),
          const Divider(),
          const _SectionHeader('Notifications'),
          SwitchListTile(
            title: const Text('Friend requests'),
            value: _notifyFriendRequests,
            onChanged: (v) => setState(() => _notifyFriendRequests = v),
          ),
          SwitchListTile(
            title: const Text('Likes & comments'),
            value: _notifyLikesComments,
            onChanged: (v) => setState(() => _notifyLikesComments = v),
          ),
          SwitchListTile(
            title: const Text('Messages'),
            value: _notifyMessages,
            onChanged: (v) => setState(() => _notifyMessages = v),
          ),
          const Divider(),
          const _SectionHeader('Privacy'),
          SwitchListTile(
            title: const Text('Show online status'),
            value: _showOnlineStatus,
            onChanged: (v) => setState(() => _showOnlineStatus = v),
          ),
          if (ref.watch(authControllerProvider).valueOrNull?.isAdmin == true) ...[
            const Divider(),
            ListTile(
              leading: const Icon(Icons.admin_panel_settings_outlined),
              title: const Text('Admin Dashboard'),
              onTap: () => context.push(RoutePaths.admin),
            ),
          ],
          const Divider(),
          ListTile(
            leading: Icon(Icons.logout, color: Theme.of(context).colorScheme.error),
            title: Text('Sign Out', style: TextStyle(color: Theme.of(context).colorScheme.error)),
            onTap: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go(RoutePaths.login);
            },
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
    );
  }
}
