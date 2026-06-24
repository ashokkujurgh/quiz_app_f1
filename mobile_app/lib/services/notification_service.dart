import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

typedef NavigationCallback = void Function(String? url);

class NotificationService {
  static final _localNotifications = FlutterLocalNotificationsPlugin();
  static NavigationCallback? _navigationCallback;

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
    });

    // App opened from notification (background → foreground)
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final url = message.data['url'] as String?;
      _navigationCallback?.call(url);
    });

    // App launched from terminated state via notification
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      final url = initial.data['url'] as String?;
      // Delay so the WebView is ready
      Future.delayed(const Duration(seconds: 2), () => _navigationCallback?.call(url));
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
