// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_play_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$quizPlayControllerHash() =>
    r'bf74768a72d3053ef5bd6262fcbfef757cad44b9';

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

abstract class _$QuizPlayController
    extends BuildlessAutoDisposeNotifier<QuizPlayState> {
  late final String quizId;

  QuizPlayState build(String quizId);
}

/// See also [QuizPlayController].
@ProviderFor(QuizPlayController)
const quizPlayControllerProvider = QuizPlayControllerFamily();

/// See also [QuizPlayController].
class QuizPlayControllerFamily extends Family<QuizPlayState> {
  /// See also [QuizPlayController].
  const QuizPlayControllerFamily();

  /// See also [QuizPlayController].
  QuizPlayControllerProvider call(String quizId) {
    return QuizPlayControllerProvider(quizId);
  }

  @override
  QuizPlayControllerProvider getProviderOverride(
    covariant QuizPlayControllerProvider provider,
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
  String? get name => r'quizPlayControllerProvider';
}

/// See also [QuizPlayController].
class QuizPlayControllerProvider
    extends AutoDisposeNotifierProviderImpl<QuizPlayController, QuizPlayState> {
  /// See also [QuizPlayController].
  QuizPlayControllerProvider(String quizId)
    : this._internal(
        () => QuizPlayController()..quizId = quizId,
        from: quizPlayControllerProvider,
        name: r'quizPlayControllerProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$quizPlayControllerHash,
        dependencies: QuizPlayControllerFamily._dependencies,
        allTransitiveDependencies:
            QuizPlayControllerFamily._allTransitiveDependencies,
        quizId: quizId,
      );

  QuizPlayControllerProvider._internal(
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
  QuizPlayState runNotifierBuild(covariant QuizPlayController notifier) {
    return notifier.build(quizId);
  }

  @override
  Override overrideWith(QuizPlayController Function() create) {
    return ProviderOverride(
      origin: this,
      override: QuizPlayControllerProvider._internal(
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
  AutoDisposeNotifierProviderElement<QuizPlayController, QuizPlayState>
  createElement() {
    return _QuizPlayControllerProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is QuizPlayControllerProvider && other.quizId == quizId;
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
mixin QuizPlayControllerRef on AutoDisposeNotifierProviderRef<QuizPlayState> {
  /// The parameter `quizId` of this provider.
  String get quizId;
}

class _QuizPlayControllerProviderElement
    extends
        AutoDisposeNotifierProviderElement<QuizPlayController, QuizPlayState>
    with QuizPlayControllerRef {
  _QuizPlayControllerProviderElement(super.provider);

  @override
  String get quizId => (origin as QuizPlayControllerProvider).quizId;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
