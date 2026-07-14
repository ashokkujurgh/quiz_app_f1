import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/sockets/presence_socket_service.dart';
import '../../../models/user.dart';
import '../../../services/notification_service.dart';
import '../data/auth_repository.dart';

part 'auth_controller.g.dart';

/// null = unauthenticated. Anything else = the logged-in user.
/// Wraps User? in AsyncValue so screens can distinguish "still checking
/// stored session on cold start" (loading) from "confirmed logged out".
@Riverpod(keepAlive: true)
class AuthController extends _$AuthController {
  @override
  Future<User?> build() async {
    // Wire the network-layer interceptor's callbacks to this controller once,
    // the same "configure once" indirection apiFetch.ts uses, so the network
    // layer never has to import the auth feature directly.
    final interceptor = ref.watch(authInterceptorProvider);
    interceptor.onTokenRefreshed = (_) async {};
    interceptor.onLogout = () async => _clearLocalSession();

    return _restoreSession();
  }

  Future<User?> _restoreSession() async {
    final tokenStorage = ref.read(tokenStorageProvider);
    final token = await tokenStorage.readAccessToken();
    if (token == null) return null;

    try {
      final user = await ref.read(authRepositoryProvider).me();
      await _onAuthenticated(user);
      return user;
    } catch (_) {
      // Stored token is stale/invalid and refresh already failed inside the
      // interceptor by the time me() throws — treat as logged out.
      await tokenStorage.clear();
      return null;
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final result = await ref.read(authRepositoryProvider).login(
            email: email,
            password: password,
          );
      await ref.read(tokenStorageProvider).writeAccessToken(result.accessToken);
      await _onAuthenticated(result.user);
      return result.user;
    });
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) {
    return ref.read(authRepositoryProvider).register(
          name: name,
          email: email,
          password: password,
        );
  }

  Future<void> forgotPassword(String email) =>
      ref.read(authRepositoryProvider).forgotPassword(email);

  Future<void> resetPassword({required String token, required String newPassword}) =>
      ref.read(authRepositoryProvider).resetPassword(token: token, newPassword: newPassword);

  Future<void> verifyEmail(String token) => ref.read(authRepositoryProvider).verifyEmail(token);

  Future<void> resendVerification(String email) =>
      ref.read(authRepositoryProvider).resendVerification(email);

  /// Applies an already-obtained {accessToken, user} pair — used by admin
  /// login, which hits a separate /api/admin/login endpoint but shares the
  /// same TokenStorage slot and User.role field for authorization, rather
  /// than needing a second parallel auth stack.
  Future<void> applySession(String accessToken, User user) async {
    state = const AsyncLoading();
    await ref.read(tokenStorageProvider).writeAccessToken(accessToken);
    await _onAuthenticated(user);
    state = AsyncData(user);
  }

  Future<void> logout() async {
    final repo = ref.read(authRepositoryProvider);
    await repo.markOffline();
    final fcmToken = await NotificationService.getToken();
    if (fcmToken != null) await repo.unregisterFcmToken(fcmToken);
    await repo.logout();
    await _clearLocalSession();
  }

  Future<void> _onAuthenticated(User user) async {
    state = AsyncData(user);
    ref.read(presenceSocketServiceProvider).connect(
          (await ref.read(tokenStorageProvider).readAccessToken())!,
        );
    await ref.read(authRepositoryProvider).markOnline();
    final fcmToken = await NotificationService.getToken();
    if (fcmToken != null) {
      await ref.read(authRepositoryProvider).registerFcmToken(fcmToken);
    }
  }

  Future<void> _clearLocalSession() async {
    await ref.read(tokenStorageProvider).clear();
    ref.read(presenceSocketServiceProvider).disconnect();
    state = const AsyncData(null);
  }
}

/// Convenience for widgets that just need a synchronous authenticated check
/// (e.g. router redirect), collapsing the loading state to "not yet known".
@riverpod
bool isAuthenticated(Ref ref) {
  final auth = ref.watch(authControllerProvider);
  return auth.valueOrNull != null;
}
