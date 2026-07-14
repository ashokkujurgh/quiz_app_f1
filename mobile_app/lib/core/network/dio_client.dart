import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../config/env.dart';
import '../storage/token_storage.dart';
import 'auth_interceptor.dart';

part 'dio_client.g.dart';

/// Overridden in main.dart once the persisted cookie jar has been created
/// (cookie jar creation is async, so it can't live inside a plain provider).
@Riverpod(keepAlive: true)
PersistCookieJar cookieJar(Ref ref) {
  throw UnimplementedError('cookieJarProvider must be overridden in main.dart');
}

@Riverpod(keepAlive: true)
TokenStorage tokenStorage(Ref ref) => TokenStorage();

BaseOptions _baseOptions() => BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    );

/// A Dio instance with the cookie jar attached but WITHOUT the auth
/// interceptor — used internally by AuthInterceptor to perform the refresh
/// call itself without risking recursive 401 handling.
@Riverpod(keepAlive: true)
Dio refreshDio(Ref ref) {
  final dio = Dio(_baseOptions());
  dio.interceptors.add(CookieManager(ref.watch(cookieJarProvider)));
  return dio;
}

@Riverpod(keepAlive: true)
AuthInterceptor authInterceptor(Ref ref) {
  return AuthInterceptor(
    tokenStorage: ref.watch(tokenStorageProvider),
    refreshDio: ref.watch(refreshDioProvider),
  );
}

/// The main Dio instance every repository should use: cookie jar + auth
/// header attach + 401 auto-refresh-and-retry.
@Riverpod(keepAlive: true)
Dio dio(Ref ref) {
  final dio = Dio(_baseOptions());
  dio.interceptors.add(CookieManager(ref.watch(cookieJarProvider)));
  dio.interceptors.add(ref.watch(authInterceptorProvider));
  return dio;
}
