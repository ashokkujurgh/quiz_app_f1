import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../../models/app_notification.dart';
import '../../../services/notification_service.dart';

part 'notifications_controller.g.dart';

const _prefsKey = 'meenzo_local_notifications';
const _maxStored = 100;
const _uuid = Uuid();

@riverpod
class NotificationsController extends _$NotificationsController {
  StreamSubscription<dynamic>? _sub;

  @override
  Future<List<AppNotification>> build() async {
    _sub?.cancel();
    _sub = NotificationService.onMessageReceived.listen(_onMessageReceived);
    ref.onDispose(() => _sub?.cancel());
    return _load();
  }

  Future<List<AppNotification>> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw == null) return [];
    final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    return list.map(AppNotification.fromJson).toList();
  }

  Future<void> _save(List<AppNotification> notifications) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(notifications.map((n) => n.toJson()).toList()));
  }

  void _onMessageReceived(dynamic message) {
    final current = state.value ?? [];
    final notification = AppNotification(
      id: _uuid.v4(),
      title: message.notification?.title as String?,
      body: message.notification?.body as String?,
      url: (message.data as Map?)?['url'] as String?,
      receivedAt: DateTime.now().toIso8601String(),
    );
    final updated = [notification, ...current].take(_maxStored).toList();
    state = AsyncData(updated);
    _save(updated);
  }

  Future<void> markRead(String id) async {
    final current = state.value;
    if (current == null) return;
    final updated = current.map((n) => n.id == id ? n.copyWith(read: true) : n).toList();
    state = AsyncData(updated);
    await _save(updated);
  }

  Future<void> markAllRead() async {
    final current = state.value;
    if (current == null) return;
    final updated = current.map((n) => n.copyWith(read: true)).toList();
    state = AsyncData(updated);
    await _save(updated);
  }
}

@riverpod
int unreadNotificationsCount(Ref ref) {
  final notifications = ref.watch(notificationsControllerProvider).valueOrNull ?? [];
  return notifications.where((n) => !n.read).length;
}
