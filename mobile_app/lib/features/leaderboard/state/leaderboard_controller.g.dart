// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leaderboard_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$globalLeaderboardHash() => r'27da5b2b5a12d62dda9401e8d5d1defcbd0b4558';

/// Reuses QuizRepository (already covers /api/quizzes/leaderboard/*) rather
/// than a separate repository — there's no additional leaderboard-specific
/// REST surface to wrap.
///
/// Copied from [globalLeaderboard].
@ProviderFor(globalLeaderboard)
final globalLeaderboardProvider =
    AutoDisposeFutureProvider<List<LeaderboardEntry>>.internal(
      globalLeaderboard,
      name: r'globalLeaderboardProvider',
      debugGetCreateSourceHash:
          const bool.fromEnvironment('dart.vm.product')
              ? null
              : _$globalLeaderboardHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef GlobalLeaderboardRef =
    AutoDisposeFutureProviderRef<List<LeaderboardEntry>>;
String _$quizLeaderboardHash() => r'79c58131bd8763debe8f3938a20a3fd5c0dcc5c9';

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

/// See also [quizLeaderboard].
@ProviderFor(quizLeaderboard)
const quizLeaderboardProvider = QuizLeaderboardFamily();

/// See also [quizLeaderboard].
class QuizLeaderboardFamily extends Family<AsyncValue<List<LeaderboardEntry>>> {
  /// See also [quizLeaderboard].
  const QuizLeaderboardFamily();

  /// See also [quizLeaderboard].
  QuizLeaderboardProvider call(String quizId) {
    return QuizLeaderboardProvider(quizId);
  }

  @override
  QuizLeaderboardProvider getProviderOverride(
    covariant QuizLeaderboardProvider provider,
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
  String? get name => r'quizLeaderboardProvider';
}

/// See also [quizLeaderboard].
class QuizLeaderboardProvider
    extends AutoDisposeFutureProvider<List<LeaderboardEntry>> {
  /// See also [quizLeaderboard].
  QuizLeaderboardProvider(String quizId)
    : this._internal(
        (ref) => quizLeaderboard(ref as QuizLeaderboardRef, quizId),
        from: quizLeaderboardProvider,
        name: r'quizLeaderboardProvider',
        debugGetCreateSourceHash:
            const bool.fromEnvironment('dart.vm.product')
                ? null
                : _$quizLeaderboardHash,
        dependencies: QuizLeaderboardFamily._dependencies,
        allTransitiveDependencies:
            QuizLeaderboardFamily._allTransitiveDependencies,
        quizId: quizId,
      );

  QuizLeaderboardProvider._internal(
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
  Override overrideWith(
    FutureOr<List<LeaderboardEntry>> Function(QuizLeaderboardRef provider)
    create,
  ) {
    return ProviderOverride(
      origin: this,
      override: QuizLeaderboardProvider._internal(
        (ref) => create(ref as QuizLeaderboardRef),
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
  AutoDisposeFutureProviderElement<List<LeaderboardEntry>> createElement() {
    return _QuizLeaderboardProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is QuizLeaderboardProvider && other.quizId == quizId;
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
mixin QuizLeaderboardRef
    on AutoDisposeFutureProviderRef<List<LeaderboardEntry>> {
  /// The parameter `quizId` of this provider.
  String get quizId;
}

class _QuizLeaderboardProviderElement
    extends AutoDisposeFutureProviderElement<List<LeaderboardEntry>>
    with QuizLeaderboardRef {
  _QuizLeaderboardProviderElement(super.provider);

  @override
  String get quizId => (origin as QuizLeaderboardProvider).quizId;
}

// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
