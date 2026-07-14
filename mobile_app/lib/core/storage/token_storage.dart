import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure storage for the access token and a cached minimal user JSON blob.
///
/// The refresh token is intentionally NOT stored here — it lives only in the
/// httpOnly cookie captured by the Dio cookie jar (see cookie_jar_provider.dart),
/// matching the same trust boundary the web app relies on. Verified against
/// backend/auth-service/src/controllers/authController.ts: sendAuthResponse()
/// returns {success, accessToken, user} in the JSON body and sets the refresh
/// token only via Set-Cookie.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'meenzo_access_token';
  static const _cachedUserKey = 'meenzo_cached_user';

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  Future<void> writeAccessToken(String token) =>
      _storage.write(key: _accessTokenKey, value: token);

  Future<Map<String, dynamic>?> readCachedUser() async {
    final raw = await _storage.read(key: _cachedUserKey);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> writeCachedUser(Map<String, dynamic> user) =>
      _storage.write(key: _cachedUserKey, value: jsonEncode(user));

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _cachedUserKey);
  }
}
