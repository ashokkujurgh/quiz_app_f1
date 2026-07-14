import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/user.dart';
import '../data/admin_repository.dart';

part 'admin_dashboard_controller.g.dart';

class AdminUsersState {
  AdminUsersState({required this.users, required this.total, this.busyIds = const {}});
  final List<User> users;
  final int total;
  final Set<String> busyIds;

  AdminUsersState copyWith({List<User>? users, int? total, Set<String>? busyIds}) {
    return AdminUsersState(
      users: users ?? this.users,
      total: total ?? this.total,
      busyIds: busyIds ?? this.busyIds,
    );
  }
}

@riverpod
class AdminDashboardController extends _$AdminDashboardController {
  @override
  Future<AdminUsersState> build() async {
    final page = await ref.read(adminRepositoryProvider).getUsers();
    return AdminUsersState(users: page.users, total: page.total);
  }

  Future<void> search(String query) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final page = await ref.read(adminRepositoryProvider).getUsers(search: query);
      return AdminUsersState(users: page.users, total: page.total);
    });
  }

  Future<void> toggleStatus(User user) async {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(busyIds: {...current.busyIds, user.id}));
    try {
      await ref.read(adminRepositoryProvider).toggleUserStatus(user.id);
      final page = await ref.read(adminRepositoryProvider).getUsers();
      state = AsyncData(AdminUsersState(users: page.users, total: page.total));
    } finally {
      final latest = state.value;
      if (latest != null) {
        state = AsyncData(latest.copyWith(busyIds: latest.busyIds.where((b) => b != user.id).toSet()));
      }
    }
  }
}
