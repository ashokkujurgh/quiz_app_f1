// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_result_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$quizResultControllerHash() =>
    r'4ade4461a78742a33a373f1769166ec1eadae393';

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

abstract class _$QuizResultController
    extends BuildlessAutoDisposeAsyncNotifier<QuizResultData> {
  late final String quizId;

  FutureOr<QuizResultData> build(String quizId);
}

/// See also [QuizResultController].
@ProviderFor(QuizResultController)
const quizResultControllerProvider = QuizResultControllerFamily();

/// See also [QuizResultController].
class QuizResultControllerFamily extends Family<AsyncValue<QuizResultData>> {
  /// See also [QuizResultController].
  const QuizResultControllerFamily();

  /// See also [QuizResultController].
  QuizResultControllerProvider call(String quizId) {
    return QuizResultControllerProvider(quizId);
  }

  @override
  QuizResultControllerProvider getProviderOverride(
    covariant QuizResultControllerProvider provider,
  ) {
    return call(provider.quizId);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'quizResultControllerProvider';
}

/// See also [QuizResultController].
class QuizResultControllerProvider
    extends
        AutoDisposeAsyncNotifierProviderImpl<
          QuizResultController,
          QuizResultData
        > {
  /// See also [QuizResultController].
  QuizResultControllerProvider(String quizId)
    : this._internal(
        () => QuizResultController()..quizId = quizId,
        from: quizResultControllerProvider,
        name: r'quizResultControllerProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$quizResultControllerHash,
        dependencies: QuizResultControllerFamily._dependencies,
        allTransitiveDependencies:
            QuizResultControllerFamily._allTransitiveDependencies,
        quizId: quizId,
      );

  QuizResultControllerProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.quizId,
  }) : super.internal();

  final String quizId;

  @override
  FutureOr<QuizResultData> runNotifierBuild(
    covariant QuizResultController notifier,
  ) {
    return notifier.build(quizId);
  }

  @override
  Override overrideWith(QuizResultController Function() create) {
    return ProviderOverride(
      origin: this,
      override: QuizResultControllerProvider._internal(
        () => create()..quizId = quizId,
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        quizId: quizId,
      ),
    );
  }

  @override
  AutoDisposeAsyncNotifierProviderElement<QuizResultController, QuizResultData>
  createElement() {
    return _QuizResultControllerProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is QuizResultControllerProvider && other.quizId == quizId;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, quizId.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin QuizResultControllerRef
    on AutoDisposeAsyncNotifierProviderRef<QuizResultData> {
  /// The parameter `quizId` of this provider.
  String get quizId;
}

class _QuizResultControllerProviderElement
    extends
        AutoDisposeAsyncNotifierProviderElement<
          QuizResultController,
          QuizResultData
        >
    with QuizResultControllerRef {
  _QuizResultControllerProviderElement(super.provider);

  @override
  String get quizId => (origin as QuizResultControllerProvider).quizId;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
