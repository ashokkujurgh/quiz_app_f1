import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../state/admin_dashboard_controller.dart';
import '../widgets/simple_table.dart';

/// User management — the only admin surface with real backend support today
/// (verified against auth-service/src/routes/admin.ts: login/me/users
/// list+create/status-toggle). No dashboard stats or chart endpoints exist
/// server-side, so this deliberately doesn't show fabricated KPI cards.
class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stateAsync = ref.watch(adminDashboardControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('User Management'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(hintText: 'Search users…', prefixIcon: Icon(Icons.search)),
              onSubmitted: (v) => ref.read(adminDashboardControllerProvider.notifier).search(v),
            ),
          ),
        ),
      ),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load users: $err')),
        data: (state) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text('${state.total} total users', style: Theme.of(context).textTheme.bodySmall),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: state.users.length,
                itemBuilder: (context, index) {
                  final user = state.users[index];
                  return UserManagementTile(
                    user: user,
                    busy: state.busyIds.contains(user.id),
                    onToggleStatus: () => ref.read(adminDashboardControllerProvider.notifier).toggleStatus(user),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
