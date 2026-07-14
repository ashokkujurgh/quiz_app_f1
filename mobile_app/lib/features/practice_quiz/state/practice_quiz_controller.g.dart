// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'practice_quiz_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$practiceQuizControllerHash() =>
    r'6d464fea7d82d6893f8b484407b5fb4714c21419';

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

abstract class _$PracticeQuizController
    extends BuildlessAutoDisposeAsyncNotifier<PracticeQuizState> {
  late final String subTopicId;

  FutureOr<PracticeQuizState> build(String subTopicId);
}

/// See also [PracticeQuizController].
@ProviderFor(PracticeQuizController)
const practiceQuizControllerProvider = PracticeQuizControllerFamily();

/// See also [PracticeQuizController].
class PracticeQuizControllerFamily
    extends Family<AsyncValue<PracticeQuizState>> {
  /// See also [PracticeQuizController].
  const PracticeQuizControllerFamily();

  /// See also [PracticeQuizController].
  PracticeQuizControllerProvider call(String subTopicId) {
    return PracticeQuizControllerProvider(subTopicId);
  }

  @override
  PracticeQuizControllerProvider getProviderOverride(
    covariant PracticeQuizControllerProvider provider,
  ) {
    return call(provider.subTopicId);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'practiceQuizControllerProvider';
}

/// See also [PracticeQuizController].
class PracticeQuizControllerProvider
    extends
        AutoDisposeAsyncNotifierProviderImpl<
          PracticeQuizController,
          PracticeQuizState
        > {
  /// See also [PracticeQuizController].
  PracticeQuizControllerProvider(String subTopicId)
    : this._internal(
        () => PracticeQuizController()..subTopicId = subTopicId,
        from: practiceQuizControllerProvider,
        name: r'practiceQuizControllerProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$practiceQuizControllerHash,
        dependencies: PracticeQuizControllerFamily._dependencies,
        allTransitiveDependencies:
            PracticeQuizControllerFamily._allTransitiveDependencies,
        subTopicId: subTopicId,
      );

  PracticeQuizControllerProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.subTopicId,
  }) : super.internal();

  final String subTopicId;

  @override
  FutureOr<PracticeQuizState> runNotifierBuild(
    covariant PracticeQuizController notifier,
  ) {
    return notifier.build(subTopicId);
  }

  @override
  Override overrideWith(PracticeQuizController Function() create) {
    return ProviderOverride(
      origin: this,
      override: PracticeQuizControllerProvider._internal(
        () => create()..subTopicId = subTopicId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        subTopicId: subTopicId,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<
    PracticeQuizController,
    PracticeQuizState
  >
  createElement() {
    return _PracticeQuizControllerProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is PracticeQuizControllerProvider &&
        other.subTopicId == subTopicId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, subTopicId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin PracticeQuizControllerRef
    on AutoDisposeAsyncNotifierProviderRef<PracticeQuizState> {
  /// The parameter `subTopicId` of this provider.
  String get subTopicId;
}

class _PracticeQuizControllerProviderElement
    extends
        AutoDisposeAsyncNotifierProviderElement<
          PracticeQuizController,
          PracticeQuizState
        >
    with PracticeQuizControllerRef {
  _PracticeQuizControllerProviderElement(super.provider);

  @override
  String get subTopicId =>
      (origin as PracticeQuizControllerProvider).subTopicId;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
