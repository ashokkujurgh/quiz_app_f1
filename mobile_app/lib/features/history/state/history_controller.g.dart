// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'history_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$historyControllerHash() => r'7d720f24ccc8a9cfc735411525b0867a2e2d3909';

/// Reuses QuizRepository rather than a new repository — every endpoint this
/// needs (/my/history for the quiz list, /:id/my-history for per-quiz
/// score+rank) already exists there.
///
/// Copied from [HistoryController].
@ProviderFor(HistoryController)
final historyControllerProvider = AutoDisposeAsyncNotifierProvider<
  HistoryController,
  List<HistoryEntry>
>.internal(
  HistoryController.new,
  name: r'historyControllerProvider',
  debugGetCreateSourceHash:
      const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$historyControllerHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$HistoryController = AutoDisposeAsyncNotifier<List<HistoryEntry>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
