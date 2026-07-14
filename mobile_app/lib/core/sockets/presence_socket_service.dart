import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'socket_base.dart';

part 'presence_socket_service.g.dart';

/// Mirrors OnlineUsersContext.tsx: connects app-wide once authenticated to
/// auth-service's default Socket.IO namespace (path '/socket.io/'), tracking
/// which user IDs are currently online.
class PresenceSocketService {
  io.Socket? _socket;
  final _onlineIds = <String>{};
  void Function(Set<String>)? onSnapshot;

  Set<String> get onlineIds => Set.unmodifiable(_onlineIds);

  void connect(String accessToken) {
    disconnect();
    final socket = buildSocket(path: '/socket.io/', accessToken: accessToken);
    _socket = socket;

    socket.on('users:snapshot', (data) {
      final ids = (data?['onlineIds'] as List?)?.map((e) => e.toString()).toSet() ?? {};
      _onlineIds
        ..clear()
        ..addAll(ids);
      onSnapshot?.call(onlineIds);
    });

    socket.on('user:status', (data) {
      final userId = data?['userId']?.toString();
      final isOnline = data?['isOnline'] == true;
      if (userId == null) return;
      if (isOnline) {
        _onlineIds.add(userId);
      } else {
        _onlineIds.remove(userId);
      }
      onSnapshot?.call(onlineIds);
    });

    socket.connect();
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
    _onlineIds.clear();
  }
}

@Riverpod(keepAlive: true)
PresenceSocketService presenceSocketService(Ref ref) {
  final service = PresenceSocketService();
  ref.onDispose(service.disconnect);
  return service;
}

/// Reactive set of currently-online user IDs, for widgets like FriendCard /
/// ConversationTile to show an online dot via ref.watch.
@Riverpod(keepAlive: true)
class OnlineUserIds extends _$OnlineUserIds {
  @override
  Set<String> build() {
    final service = ref.watch(presenceSocketServiceProvider);
    service.onSnapshot = (ids) => state = ids;
    return service.onlineIds;
  }
}
