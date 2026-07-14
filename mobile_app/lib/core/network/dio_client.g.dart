// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dio_client.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$cookieJarHash() => r'1745f64c97d2f4d4f4fa67534b6fb9569f9e9732';

/// Overridden in main.dart once the persisted cookie jar has been created
/// (cookie jar creation is async, so it can't live inside a plain provider).
///
/// Copied from [cookieJar].
@ProviderFor(cookieJar)
final cookieJarProvider = Provider<PersistCookieJar>.internal(
  cookieJar,
  name: r'cookieJarProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$cookieJarHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef CookieJarRef = ProviderRef<PersistCookieJar>;
String _$tokenStorageHash() => r'a42816fb1cf5af728e44ff5c48bfcaf5dc6b12aa';

/// See also [tokenStorage].
@ProviderFor(tokenStorage)
final tokenStorageProvider = Provider<TokenStorage>.internal(
  tokenStorage,
  name: r'tokenStorageProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$tokenStorageHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef TokenStorageRef = ProviderRef<TokenStorage>;
String _$refreshDioHash() => r'c94b407dde0a76fe2536abc2551a4ed0dec6ec31';

/// A Dio instance with the cookie jar attached but WITHOUT the auth
/// interceptor — used internally by AuthInterceptor to perform the refresh
/// call itself without risking recursive 401 handling.
///
/// Copied from [refreshDio].
@ProviderFor(refreshDio)
final refreshDioProvider = Provider<Dio>.internal(
  refreshDio,
  name: r'refreshDioProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$refreshDioHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef RefreshDioRef = ProviderRef<Dio>;
String _$authInterceptorHash() => r'e51ac960b78c1ccd9a9093d0dc26d7de62828551';

/// See also [authInterceptor].
@ProviderFor(authInterceptor)
final authInterceptorProvider = Provider<AuthInterceptor>.internal(
  authInterceptor,
  name: r'authInterceptorProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$authInterceptorHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef AuthInterceptorRef = ProviderRef<AuthInterceptor>;
String _$dioHash() => r'6c962c232222efdb2c25cfe23efd1bb2ff23b2a6';

/// The main Dio instance every repository should use: cookie jar + auth
/// header attach + 401 auto-refresh-and-retry.
///
/// Copied from [dio].
@ProviderFor(dio)
final dioProvider = Provider<Dio>.internal(
  dio,
  name: r'dioProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$dioHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef DioRef = ProviderRef<Dio>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
