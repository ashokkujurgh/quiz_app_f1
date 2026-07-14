import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../models/user.dart';
import '../data/friends_repository.dart';

part 'friends_controller.g.dart';

class FriendsState {
  FriendsState({
    required this.friends,
    required this.incoming,
    required this.outgoing,
    required this.suggestions,
    this.busyIds = const {},
  });

  final List<User> friends;
  final List<FriendRequestItem> incoming;
  final List<FriendRequestItem> outgoing;
  final List<User> suggestions;
  final Set<String> busyIds;

  FriendsState copyWith({
    List<User>? friends,
    List<FriendRequestItem>? incoming,
    List<FriendRequestItem>? outgoing,
    List<User>? suggestions,
    Set<String>? busyIds,
  }) {
    return FriendsState(
      friends: friends ?? this.friends,
      incoming: incoming ?? this.incoming,
      outgoing: outgoing ?? this.outgoing,
      suggestions: suggestions ?? this.suggestions,
      busyIds: busyIds ?? this.busyIds,
    );
  }
}

@riverpod
class FriendsController extends _$FriendsController {
  @override
  Future<FriendsState> build() async {
    final repo = ref.read(friendsRepositoryProvider);
    final results = await Future.wait([
      repo.getFriends(),
      repo.getIncomingRequests(),
      repo.getOutgoingRequests(),
      repo.getSuggestions(),
    ]);
    return FriendsState(
      friends: results[0] as List<User>,
      incoming: results[1] as List<FriendRequestItem>,
      outgoing: results[2] as List<FriendRequestItem>,
      suggestions: results[3] as List<User>,
    );
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> _withBusy(String id, Future<void> Function() action) async {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(busyIds: {...current.busyIds, id}));
    try {
      await action();
    } finally {
      final latest = state.value;
      if (latest != null) {
        state = AsyncData(latest.copyWith(busyIds: latest.busyIds.where((b) => b != id).toSet()));
      }
    }
  }

  Future<void> sendRequest(User user) async {
    await _withBusy(user.id, () async {
      await ref.read(friendsRepositoryProvider).sendRequest(user.id);
      final current = state.value!;
      state = AsyncData(current.copyWith(
        suggestions: current.suggestions.where((u) => u.id != user.id).toList(),
        outgoing: [...current.outgoing, FriendRequestItem(requestId: user.id, user: user, createdAt: '')],
      ));
    });
  }

  Future<void> acceptRequest(FriendRequestItem request) async {
    await _withBusy(request.requestId, () async {
      await ref.read(friendsRepositoryProvider).acceptRequest(request.requestId);
      final current = state.value!;
      state = AsyncData(current.copyWith(
        incoming: current.incoming.where((r) => r.requestId != request.requestId).toList(),
        friends: [...current.friends, request.user],
      ));
    });
  }

  Future<void> declineRequest(FriendRequestItem request) async {
    await _withBusy(request.requestId, () async {
      await ref.read(friendsRepositoryProvider).declineRequest(request.requestId);
      final current = state.value!;
      state = AsyncData(current.copyWith(
        incoming: current.incoming.where((r) => r.requestId != request.requestId).toList(),
      ));
    });
  }

  Future<void> cancelRequest(FriendRequestItem request) async {
    await _withBusy(request.user.id, () async {
      await ref.read(friendsRepositoryProvider).cancelRequest(request.user.id);
      final current = state.value!;
      state = AsyncData(current.copyWith(
        outgoing: current.outgoing.where((r) => r.user.id != request.user.id).toList(),
      ));
    });
  }

  Future<void> unfriend(User user) async {
    await _withBusy(user.id, () async {
      await ref.read(friendsRepositoryProvider).unfriend(user.id);
      final current = state.value!;
      state = AsyncData(current.copyWith(friends: current.friends.where((f) => f.id != user.id).toList()));
    });
  }
}
