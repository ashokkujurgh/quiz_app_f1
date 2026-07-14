import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/sockets/message_socket_service.dart';

part 'messages_socket_provider.g.dart';

/// Deliberately NOT keepAlive — auto-disposed once nothing in the Messages
/// feature is watching it, so the socket connects when entering the tab and
/// disconnects on leaving. Shared by conversations_controller and whichever
/// active_thread_controller instance is open, so there's exactly one
/// connection per visit to the feature, with each controller subscribing to
/// the broadcast streams it cares about independently.
@riverpod
Future<MessageSocketService> messagesSocket(Ref ref) async {
  final token = await ref.watch(tokenStorageProvider).readAccessToken();
  final service = MessageSocketService();
  ref.onDispose(service.dispose);
  if (token != null) {
    service.connect(token);
  }
  return service;
}
