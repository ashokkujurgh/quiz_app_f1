import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

typedef NavigationCallback = void Function(String? url);

class NotificationService {
  static final _localNotifications = FlutterLocalNotificationsPlugin();
  static NavigationCallback? _navigationCallback;

  /// No backend notification service exists (verified: no notification-service
  /// in docker-compose.yml, and notificationsSlice.ts on the web app uses mock
  /// data) — so the Notifications feature is built entirely from the FCM
  /// messages this app actually receives, via this broadcast stream, rather
  /// than a REST-backed feed.
  static final _messageReceivedController = StreamController<RemoteMessage>.broadcast();
  static Stream<RemoteMessage> get onMessageReceived => _messageReceivedController.stream;

  /// Set when the app is launched (cold start) from a terminated state via a
  /// notification tap. Consumed once the router/auth state is actually ready
  /// to navigate, instead of firing on a blind delay.
  static String? _pendingInitialUrl;

  static String? consumePendingInitialUrl() {
    final url = _pendingInitialUrl;
    _pendingInitialUrl = null;
    return url;
  }

  static const _androidChannel = AndroidNotificationChannel(
    'meenzo_high_importance',
    'Meenzo Notifications',
    description: 'Quiz alerts, friend requests, and more',
    importance: Importance.high,
  );

  static Future<void> init() async {
    // Request permission
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Local notifications setup
    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (response) {
        _navigationCallback?.call(response.payload);
      },
    );

    // Create Android channel
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    // Foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      showLocalNotification(message);
      _messageReceivedController.add(message);
    });

    // App opened from notification (background → foreground)
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _messageReceivedController.add(message);
      final url = message.data['url'] as String?;
      _navigationCallback?.call(url);
    });

    // App launched from terminated state via notification. Stored rather
    // than fired immediately — the router/auth state isn't ready this early
    // in bootstrap; the shell consumes this once it is (see app_router.dart).
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      _pendingInitialUrl = initial.data['url'] as String?;
      _messageReceivedController.add(initial);
    }
  }

  static void setNavigationCallback(NavigationCallback cb) {
    _navigationCallback = cb;
  }

  static Future<void> showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final url = message.data['url'] as String?;

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          channelDescription: _androidChannel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: url,
    );
  }

  static Future<String?> getToken() => FirebaseMessaging.instance.getToken();
}
