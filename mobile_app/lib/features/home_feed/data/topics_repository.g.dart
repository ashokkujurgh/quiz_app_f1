// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'topics_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$topicsRepositoryHash() => r'd046b1f6bc73c8c9194aaf1e6b2016328bca797a';

/// See also [topicsRepository].
@ProviderFor(topicsRepository)
final topicsRepositoryProvider = Provider<TopicsRepository>.internal(
  topicsRepository,
  name: r'topicsRepositoryProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$topicsRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef TopicsRepositoryRef = ProviderRef<TopicsRepository>;
String _$activeTopicsHash() => r'9b226c7b88346a88e388cf86fe9b4c02ad17c633';

/// See also [activeTopics].
@ProviderFor(activeTopics)
final activeTopicsProvider = AutoDisposeFutureProvider<List<Topic>>.internal(
  activeTopics,
  name: r'activeTopicsProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product') ? null : _$activeTopicsHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ActiveTopicsRef = AutoDisposeFutureProviderRef<List<Topic>>;
String _$subTopicsForHash() => r'356f3b21715abc8e27b77343f95c1d49941244c0';

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

/// See also [subTopicsFor].
@ProviderFor(subTopicsFor)
const subTopicsForProvider = SubTopicsForFamily();

/// See also [subTopicsFor].
class SubTopicsForFamily extends Family<AsyncValue<List<SubTopic>>> {
  /// See also [subTopicsFor].
  const SubTopicsForFamily();

  /// See also [subTopicsFor].
  SubTopicsForProvider call(String topicId) {
    return SubTopicsForProvider(topicId);
  }

  @override
  SubTopicsForProvider getProviderOverride(
    covariant SubTopicsForProvider provider,
  ) {
    return call(provider.topicId);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'subTopicsForProvider';
}

/// See also [subTopicsFor].
class SubTopicsForProvider extends AutoDisposeFutureProvider<List<SubTopic>> {
  /// See also [subTopicsFor].
  SubTopicsForProvider(String topicId)
    : this._internal(
        (ref) => subTopicsFor(ref as SubTopicsForRef, topicId),
        from: subTopicsForProvider,
        name: r'subTopicsForProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$subTopicsForHash,
        dependencies: SubTopicsForFamily._dependencies,
        allTransitiveDependencies:
            SubTopicsForFamily._allTransitiveDependencies,
        topicId: topicId,
      );

  SubTopicsForProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.topicId,
  }) : super.internal();

  final String topicId;

  @override
  Override overrideWith(
    FutureOr<List<SubTopic>> Function(SubTopicsForRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: SubTopicsForProvider._internal(
        (ref) => create(ref as SubTopicsForRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        topicId: topicId,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<SubTopic>> createElement() {
    return _SubTopicsForProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is SubTopicsForProvider && other.topicId == topicId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, topicId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin SubTopicsForRef on AutoDisposeFutureProviderRef<List<SubTopic>> {
  /// The parameter `topicId` of this provider.
  String get topicId;
}

class _SubTopicsForProviderElement
    extends AutoDisposeFutureProviderElement<List<SubTopic>>
    with SubTopicsForRef {
  _SubTopicsForProviderElement(super.provider);

  @override
  String get topicId => (origin as SubTopicsForProvider).topicId;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
