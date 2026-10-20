/// App-wide constants for the Meenzo WebView wrapper.
class AppConfig {
  static const String siteOrigin = 'https://meenzo.com';
  static const String startUrl = '$siteOrigin/home';

  /// Hosts that stay inside the app; everything else opens externally.
  static const Set<String> internalHosts = {'meenzo.com', 'www.meenzo.com'};

  static const String notificationChannelId = 'meenzo_default';
  static const String notificationChannelName = 'Meenzo notifications';
  static const String notificationChannelDescription =
      'New posts, comments, messages, friend requests and live quizzes';

  static bool isInternal(Uri uri) =>
      (uri.scheme == 'https' || uri.scheme == 'http') &&
      internalHosts.contains(uri.host.toLowerCase());
}
