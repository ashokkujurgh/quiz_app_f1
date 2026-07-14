import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';

/// Persisted cookie jar so the httpOnly refreshToken cookie set by
/// auth-service (see authController.ts sendAuthResponse) is captured and
/// replayed automatically, the same way a browser's credentials:'include'
/// behaves for the web app. Persisted to disk so it survives app restarts.
Future<PersistCookieJar> createCookieJar() async {
  final dir = await getApplicationSupportDirectory();
  return PersistCookieJar(
    storage: FileStorage('${dir.path}/.cookies/'),
    ignoreExpires: false,
  );
}
