// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'active_thread_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$activeThreadControllerHash() =>
    r'd5b5615f27bde3fb279313ca9cb5ab44cc3d7dfc';

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

abstract class _$ActiveThreadController
    extends BuildlessAutoDisposeAsyncNotifier<ActiveThreadState> {
  late final String conversationId;

  FutureOr<ActiveThreadState> build(String conversationId);
}

/// See also [ActiveThreadController].
@ProviderFor(ActiveThreadController)
const activeThreadControllerProvider = ActiveThreadControllerFamily();

/// See also [ActiveThreadController].
class ActiveThreadControllerFamily
    extends Family<AsyncValue<ActiveThreadState>> {
  /// See also [ActiveThreadController].
  const ActiveThreadControllerFamily();

  /// See also [ActiveThreadController].
  ActiveThreadControllerProvider call(String conversationId) {
    return ActiveThreadControllerProvider(conversationId);
  }

  @override
  ActiveThreadControllerProvider getProviderOverride(
    covariant ActiveThreadControllerProvider provider,
  ) {
    return call(provider.conversationId);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'activeThreadControllerProvider';
}

/// See also [ActiveThreadController].
class ActiveThreadControllerProvider
    extends
        AutoDisposeAsyncNotifierProviderImpl<
          ActiveThreadController,
          ActiveThreadState
        > {
  /// See also [ActiveThreadController].
  ActiveThreadControllerProvider(String conversationId)
    : this._internal(
        () => ActiveThreadController()..conversationId = conversationId,
        from: activeThreadControllerProvider,
        name: r'activeThreadControllerProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$activeThreadControllerHash,
        dependencies: ActiveThreadControllerFamily._dependencies,
        allTransitiveDependencies:
            ActiveThreadControllerFamily._allTransitiveDependencies,
        conversationId: conversationId,
      );

  ActiveThreadControllerProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.conversationId,
  }) : super.internal();

  final String conversationId;

  @override
  FutureOr<ActiveThreadState> runNotifierBuild(
    covariant ActiveThreadController notifier,
  ) {
    return notifier.build(conversationId);
  }

  @override
  Override overrideWith(ActiveThreadController Function() create) {
    return ProviderOverride(
      origin: this,
      override: ActiveThreadControllerProvider._internal(
        () => create()..conversationId = conversationId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        conversationId: conversationId,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<
    ActiveThreadController,
    ActiveThreadState
  >
  createElement() {
    return _ActiveThreadControllerProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ActiveThreadControllerProvider &&
        other.conversationId == conversationId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, conversationId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ActiveThreadControllerRef
    on AutoDisposeAsyncNotifierProviderRef<ActiveThreadState> {
  /// The parameter `conversationId` of this provider.
  String get conversationId;
}

class _ActiveThreadControllerProviderElement
    extends
        AutoDisposeAsyncNotifierProviderElement<
          ActiveThreadController,
          ActiveThreadState
        >
    with ActiveThreadControllerRef {
  _ActiveThreadControllerProviderElement(super.provider);

  @override
  String get conversationId =>
      (origin as ActiveThreadControllerProvider).conversationId;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
