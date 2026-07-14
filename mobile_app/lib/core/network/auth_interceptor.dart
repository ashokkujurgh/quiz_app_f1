import 'package:dio/dio.dart';

import '../storage/token_storage.dart';

/// Mirrors quizapp/src/app/utils/apiFetch.ts's dedup-refresh contract:
/// concurrent 401s share one in-flight refresh Future, and a single retry is
/// attempted before giving up and logging out. Configured with callbacks
/// (rather than importing the auth controller directly) to avoid a circular
/// dependency between the network layer and the auth feature — the same
/// "configure once" indirection apiFetch.ts uses (_getToken/_onRefresh/_onLogout).
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this.tokenStorage,
    required this.refreshDio,
  });

  final TokenStorage tokenStorage;

  /// A plain Dio instance (same baseUrl + cookie jar, but WITHOUT this
  /// interceptor attached) used only for the refresh call itself, so the
  /// refresh request can't recursively trigger another refresh.
  final Dio refreshDio;

  /// Set once by the auth feature after both are constructed.
  Future<void> Function(String accessToken)? onTokenRefreshed;
  Future<void> Function()? onLogout;

  Future<String>? _inFlightRefresh;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await tokenStorage.readAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final isAuthEndpoint = err.requestOptions.path.contains('/api/auth/refresh') ||
        err.requestOptions.path.contains('/api/auth/login');
    final alreadyRetried = err.requestOptions.extra['retried'] == true;

    if (err.response?.statusCode != 401 || isAuthEndpoint || alreadyRetried) {
      handler.next(err);
      return;
    }

    try {
      final newToken = await _refreshOnce();
      final retryOptions = err.requestOptions
        ..headers['Authorization'] = 'Bearer $newToken'
        ..extra['retried'] = true;
      final response = await refreshDio.fetch(retryOptions);
      handler.resolve(response);
    } catch (_) {
      await onLogout?.call();
      handler.next(err);
    }
  }

  Future<String> _refreshOnce() {
    // Concurrent 401s share the same in-flight refresh call.
    return _inFlightRefresh ??= _doRefresh().whenComplete(() {
      _inFlightRefresh = null;
    });
  }

  Future<String> _doRefresh() async {
    final response = await refreshDio.post<Map<String, dynamic>>(
      '/api/auth/refresh',
      // Empty body — the refresh token travels via the httpOnly cookie
      // captured by the shared cookie jar, never as a request field.
      data: <String, dynamic>{},
    );
    final data = response.data;
    final newToken = data?['accessToken'] as String?;
    if (newToken == null) {
      throw DioException(requestOptions: response.requestOptions, response: response);
    }
    await tokenStorage.writeAccessToken(newToken);
    await onTokenRefreshed?.call(newToken);
    return newToken;
  }
}
