import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_notification.freezed.dart';
part 'app_notification.g.dart';

/// Locally-persisted record of an FCM push this device actually received —
/// there's no backend notification-service/REST feed to back this feature
/// (verified: absent from docker-compose.yml; the web app's equivalent slice
/// uses mock data), so this is the closest honest equivalent.
@freezed
class AppNotification with _$AppNotification {
  const factory AppNotification({
    required String id,
    String? title,
    String? body,
    String? url,
    required String receivedAt,
    @Default(false) bool read,
  }) = _AppNotification;

  factory AppNotification.fromJson(Map<String, dynamic> json) => _$AppNotificationFromJson(json);
}
