// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'post_detail_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$postDetailControllerHash() =>
    r'a93aa5e3aadd09a2e16620eabf00e007dfab52d0';

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

abstract class _$PostDetailController
    extends BuildlessAutoDisposeAsyncNotifier<PostDetailState> {
  late final String idOrSlug;

  FutureOr<PostDetailState> build(String idOrSlug);
}

/// See also [PostDetailController].
@ProviderFor(PostDetailController)
const postDetailControllerProvider = PostDetailControllerFamily();

/// See also [PostDetailController].
class PostDetailControllerFamily extends Family<AsyncValue<PostDetailState>> {
  /// See also [PostDetailController].
  const PostDetailControllerFamily();

  /// See also [PostDetailController].
  PostDetailControllerProvider call(String idOrSlug) {
    return PostDetailControllerProvider(idOrSlug);
  }

  @override
  PostDetailControllerProvider getProviderOverride(
    covariant PostDetailControllerProvider provider,
  ) {
    return call(provider.idOrSlug);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'postDetailControllerProvider';
}

/// See also [PostDetailController].
class PostDetailControllerProvider
    extends
        AutoDisposeAsyncNotifierProviderImpl<
          PostDetailController,
          PostDetailState
        > {
  /// See also [PostDetailController].
  PostDetailControllerProvider(String idOrSlug)
    : this._internal(
        () => PostDetailController()..idOrSlug = idOrSlug,
        from: postDetailControllerProvider,
        name: r'postDetailControllerProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$postDetailControllerHash,
        dependencies: PostDetailControllerFamily._dependencies,
        allTransitiveDependencies:
            PostDetailControllerFamily._allTransitiveDependencies,
        idOrSlug: idOrSlug,
      );

  PostDetailControllerProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.idOrSlug,
  }) : super.internal();

  final String idOrSlug;

  @override
  FutureOr<PostDetailState> runNotifierBuild(
    covariant PostDetailController notifier,
  ) {
    return notifier.build(idOrSlug);
  }

  @override
  Override overrideWith(PostDetailController Function() create) {
    return ProviderOverride(
      origin: this,
      override: PostDetailControllerProvider._internal(
        () => create()..idOrSlug = idOrSlug,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        idOrSlug: idOrSlug,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<PostDetailController, PostDetailState>
  createElement() {
    return _PostDetailControllerProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is PostDetailControllerProvider && other.idOrSlug == idOrSlug;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, idOrSlug.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin PostDetailControllerRef
    on AutoDisposeAsyncNotifierProviderRef<PostDetailState> {
  /// The parameter `idOrSlug` of this provider.
  String get idOrSlug;
}

class _PostDetailControllerProviderElement
    extends
        AutoDisposeAsyncNotifierProviderElement<
          PostDetailController,
          PostDetailState
        >
    with PostDetailControllerRef {
  _PostDetailControllerProviderElement(super.provider);

  @override
  String get idOrSlug => (origin as PostDetailControllerProvider).idOrSlug;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
