// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_profile_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$userProfileControllerHash() =>
    r'cd417515a9483806ddb5028206bd7dd3b7087af8';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

abstract class _$UserProfileController
    extends BuildlessAutoDisposeAsyncNotifier<UserProfileData> {
  late final String userId;

  FutureOr<UserProfileData> build(String userId);
}

/// Public profile view of an arbitrary user — family(userId). Note: there's
/// no backend endpoint to list another user's friends (GET /api/friends only
/// returns the current user's own list), so unlike ProfileScreen (own
/// profile) this has no Friends tab.
///
/// Copied from [UserProfileController].
@ProviderFor(UserProfileController)
const userProfileControllerProvider = UserProfileControllerFamily();

/// Public profile view of an arbitrary user — family(userId). Note: there's
/// no backend endpoint to list another user's friends (GET /api/friends only
/// returns the current user's own list), so unlike ProfileScreen (own
/// profile) this has no Friends tab.
///
/// Copied from [UserProfileController].
class UserProfileControllerFamily extends Family<AsyncValue<UserProfileData>> {
  /// Public profile view of an arbitrary user — family(userId). Note: there's
  /// no backend endpoint to list another user's friends (GET /api/friends only
  /// returns the current user's own list), so unlike ProfileScreen (own
  /// profile) this has no Friends tab.
  ///
  /// Copied from [UserProfileController].
  const UserProfileControllerFamily();

  /// Public profile view of an arbitrary user — family(userId). Note: there's
  /// no backend endpoint to list another user's friends (GET /api/friends only
  /// returns the current user's own list), so unlike ProfileScreen (own
  /// profile) this has no Friends tab.
  ///
  /// Copied from [UserProfileController].
  UserProfileControllerProvider call(String userId) {
    return UserProfileControllerProvider(userId);
  }

  @override
  UserProfileControllerProvider getProviderOverride(
    covariant UserProfileControllerProvider provider,
  ) {
    return call(provider.userId);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'userProfileControllerProvider';
}

/// Public profile view of an arbitrary user — family(userId). Note: there's
/// no backend endpoint to list another user's friends (GET /api/friends only
/// returns the current user's own list), so unlike ProfileScreen (own
/// profile) this has no Friends tab.
///
/// Copied from [UserProfileController].
class UserProfileControllerProvider
    extends
        AutoDisposeAsyncNotifierProviderImpl<
          UserProfileController,
          UserProfileData
        > {
  /// Public profile view of an arbitrary user — family(userId). Note: there's
  /// no backend endpoint to list another user's friends (GET /api/friends only
  /// returns the current user's own list), so unlike ProfileScreen (own
  /// profile) this has no Friends tab.
  ///
  /// Copied from [UserProfileController].
  UserProfileControllerProvider(String userId)
    : this._internal(
        () => UserProfileController()..userId = userId,
        from: userProfileControllerProvider,
        name: r'userProfileControllerProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$userProfileControllerHash,
        dependencies: UserProfileControllerFamily._dependencies,
        allTransitiveDependencies:
            UserProfileControllerFamily._allTransitiveDependencies,
        userId: userId,
      );

  UserProfileControllerProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.userId,
  }) : super.internal();

  final String userId;

  @override
  FutureOr<UserProfileData> runNotifierBuild(
    covariant UserProfileController notifier,
  ) {
    return notifier.build(userId);
  }

  @override
  Override overrideWith(UserProfileController Function() create) {
    return ProviderOverride(
      origin: this,
      override: UserProfileControllerProvider._internal(
        () => create()..userId = userId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        userId: userId,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<
    UserProfileController,
    UserProfileData
  >
  createElement() {
    return _UserProfileControllerProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is UserProfileControllerProvider && other.userId == userId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, userId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin UserProfileControllerRef
    on AutoDisposeAsyncNotifierProviderRef<UserProfileData> {
  /// The parameter `userId` of this provider.
  String get userId;
}

class _UserProfileControllerProviderElement
    extends
        AutoDisposeAsyncNotifierProviderElement<
          UserProfileController,
          UserProfileData
        >
    with UserProfileControllerRef {
  _UserProfileControllerProviderElement(super.provider);

  @override
  String get userId => (origin as UserProfileControllerProvider).userId;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
