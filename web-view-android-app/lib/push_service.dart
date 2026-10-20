import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'config.dart';

/// Runs in a background isolate when a push arrives while the app is in the
/// background or terminated. Messages with a `notification` block (all the
/// backend sends today) are shown by Android itself; this only covers
/// data-only messages that carry a title/body in `data`.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  if (message.notification != null) return;
  final title = message.data['title'];
  if (title is! String || title.isEmpty) return;
  await PushService._initLocalNotifications(onTap: null);
  await PushService._showLocal(title, message.data['body'] as String?, message.data);
}

/// Firebase Cloud Messaging setup: permission, token, foreground display and
/// turning notification taps into URLs for the WebView.
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  static final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  final _openUrl = StreamController<String>.broadcast();
  final _token = StreamController<String>.broadcast();

  /// URLs to open in the WebView because the user tapped a notification.
  Stream<String> get onOpenUrl => _openUrl.stream;

  /// Fires whenever the FCM token is first known or refreshed.
  Stream<String> get onToken => _token.stream;

  String? currentToken;

  /// URL from the notification that launched the app from a terminated state.
  String? initialUrl;

  Future<void> init() async {
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    await _initLocalNotifications(onTap: (payload) => _emitFromData(_decode(payload)));

    final messaging = FirebaseMessaging.instance;

    // Foreground: Android doesn't display FCM notifications itself, so show one locally.
    FirebaseMessaging.onMessage.listen((message) {
      final n = message.notification;
      final title = n?.title ?? message.data['title'] as String?;
      if (title == null) return;
      _showLocal(title, n?.body ?? message.data['body'] as String?, message.data);
    });

    // Background → tapped notification brought the app to the front.
    FirebaseMessaging.onMessageOpenedApp.listen((m) => _emitFromData(m.data));

    // Terminated → app launched by tapping a notification.
    final initial = await messaging.getInitialMessage();
    if (initial != null) initialUrl = urlForData(initial.data);
    final launch = await _local.getNotificationAppLaunchDetails();
    if (initialUrl == null && launch?.didNotificationLaunchApp == true) {
      initialUrl = urlForData(_decode(launch!.notificationResponse?.payload));
    }

    // getToken/onTokenRefresh give the classic registration token, which is what
    // the backend's firebase-admin sendEachForMulticast() expects — the newer
    // register()/onRegistered flow returns an installation ID instead.
    // ignore: deprecated_member_use
    messaging.onTokenRefresh.listen(_setToken);
    // Not awaited: the permission prompt shouldn't hold up opening the site.
    unawaited(_requestPermissionAndToken(messaging));
  }

  Future<void> _requestPermissionAndToken(FirebaseMessaging messaging) async {
    try {
      // Android 13+ shows the POST_NOTIFICATIONS prompt; older versions grant it automatically.
      await messaging.requestPermission(alert: true, badge: true, sound: true);
      // ignore: deprecated_member_use
      final token = await messaging.getToken();
      if (token != null) _setToken(token);
    } catch (e) {
      debugPrint('[Push] permission/token failed: $e');
    }
  }

  void _setToken(String token) {
    currentToken = token;
    _token.add(token);
  }

  void _emitFromData(Map<String, dynamic> data) {
    final url = urlForData(data);
    if (url != null) _openUrl.add(url);
  }

  /// Maps a push `data` payload to a page on the site. An explicit `url` or
  /// `link` wins; otherwise the `type` values the backend services send today
  /// are mapped to their pages.
  static String? urlForData(Map<String, dynamic> data) {
    final explicit = data['url'] ?? data['link'];
    if (explicit is String && explicit.isNotEmpty) {
      return Uri.parse(AppConfig.siteOrigin).resolve(explicit).toString();
    }
    String? path;
    switch (data['type']) {
      case 'new_post':
      case 'new_comment':
        final postId = data['postId'];
        path = postId is String && postId.isNotEmpty
            ? '/posts/${Uri.encodeComponent(postId)}'
            : '/home';
      case 'quiz_started':
        final quizId = data['quizId'];
        path = quizId is String && quizId.isNotEmpty
            ? '/quiz/play/${Uri.encodeComponent(quizId)}'
            : '/quizzes';
      case 'quiz_reminder':
        path = '/quizzes';
      case 'new_message':
        path = '/messages';
      case 'friend_request':
      case 'friend_accepted':
        path = '/friends';
    }
    return path == null ? null : '${AppConfig.siteOrigin}$path';
  }

  static Map<String, dynamic> _decode(String? payload) {
    if (payload == null || payload.isEmpty) return const {};
    try {
      final v = jsonDecode(payload);
      return v is Map<String, dynamic> ? v : const {};
    } catch (_) {
      return const {};
    }
  }

  static Future<void> _initLocalNotifications({required void Function(String?)? onTap}) async {
    await _local.initialize(
      const InitializationSettings(android: AndroidInitializationSettings('ic_notification')),
      onDidReceiveNotificationResponse: onTap == null ? null : (r) => onTap(r.payload),
    );
    await _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          AppConfig.notificationChannelId,
          AppConfig.notificationChannelName,
          description: AppConfig.notificationChannelDescription,
          importance: Importance.high,
        ));
  }

  static Future<void> _showLocal(String title, String? body, Map<String, dynamic> data) {
    return _local.show(
      DateTime.now().millisecondsSinceEpoch.remainder(1 << 31),
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          AppConfig.notificationChannelId,
          AppConfig.notificationChannelName,
          channelDescription: AppConfig.notificationChannelDescription,
          importance: Importance.high,
          priority: Priority.high,
          icon: 'ic_notification',
        ),
      ),
      payload: jsonEncode(data),
    );
  }
}
