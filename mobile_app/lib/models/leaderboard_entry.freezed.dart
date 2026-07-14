// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'leaderboard_entry.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

LeaderboardEntry _$LeaderboardEntryFromJson(Map<String, dynamic> json) {
  return _LeaderboardEntry.fromJson(json);
}

/// @nodoc
mixin _$LeaderboardEntry {
  int get rank => throw _privateConstructorUsedError;
  String get userId => throw _privateConstructorUsedError;
  String get userName => throw _privateConstructorUsedError;
  String? get userAvatar =>
      throw _privateConstructorUsedError; // Per-quiz fields
  int get score => throw _privateConstructorUsedError;
  int get total => throw _privateConstructorUsedError;
  double get percentage => throw _privateConstructorUsedError;
  int get timeTaken =>
      throw _privateConstructorUsedError; // Global aggregate fields
  int? get totalGames => throw _privateConstructorUsedError;
  int? get totalScore => throw _privateConstructorUsedError;
  int? get totalQuestions => throw _privateConstructorUsedError;
  int? get avgPercentage => throw _privateConstructorUsedError;
  int? get perfectScores => throw _privateConstructorUsedError;

  /// Serializes this LeaderboardEntry to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LeaderboardEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LeaderboardEntryCopyWith<LeaderboardEntry> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LeaderboardEntryCopyWith<$Res> {
  factory $LeaderboardEntryCopyWith(
    LeaderboardEntry value,
    $Res Function(LeaderboardEntry) then,
  ) = _$LeaderboardEntryCopyWithImpl<$Res, LeaderboardEntry>;
  @useResult
  $Res call({
    int rank,
    String userId,
    String userName,
    String? userAvatar,
    int score,
    int total,
    double percentage,
    int timeTaken,
    int? totalGames,
    int? totalScore,
    int? totalQuestions,
    int? avgPercentage,
    int? perfectScores,
  });
}

/// @nodoc
class _$LeaderboardEntryCopyWithImpl<$Res, $Val extends LeaderboardEntry>
    implements $LeaderboardEntryCopyWith<$Res> {
  _$LeaderboardEntryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LeaderboardEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? rank = null,
    Object? userId = null,
    Object? userName = null,
    Object? userAvatar = freezed,
    Object? score = null,
    Object? total = null,
    Object? percentage = null,
    Object? timeTaken = null,
    Object? totalGames = freezed,
    Object? totalScore = freezed,
    Object? totalQuestions = freezed,
    Object? avgPercentage = freezed,
    Object? perfectScores = freezed,
  }) {
    return _then(
      _value.copyWith(
            rank:
                null == rank
                    ? _value.rank
                    : rank // ignore: cast_nullable_to_non_nullable
                        as int,
            userId:
                null == userId
                    ? _value.userId
                    : userId // ignore: cast_nullable_to_non_nullable
                        as String,
            userName:
                null == userName
                    ? _value.userName
                    : userName // ignore: cast_nullable_to_non_nullable
                        as String,
            userAvatar:
                freezed == userAvatar
                    ? _value.userAvatar
                    : userAvatar // ignore: cast_nullable_to_non_nullable
                        as String?,
            score:
                null == score
                    ? _value.score
                    : score // ignore: cast_nullable_to_non_nullable
                        as int,
            total:
                null == total
                    ? _value.total
                    : total // ignore: cast_nullable_to_non_nullable
                        as int,
            percentage:
                null == percentage
                    ? _value.percentage
                    : percentage // ignore: cast_nullable_to_non_nullable
                        as double,
            timeTaken:
                null == timeTaken
                    ? _value.timeTaken
                    : timeTaken // ignore: cast_nullable_to_non_nullable
                        as int,
            totalGames:
                freezed == totalGames
                    ? _value.totalGames
                    : totalGames // ignore: cast_nullable_to_non_nullable
                        as int?,
            totalScore:
                freezed == totalScore
                    ? _value.totalScore
                    : totalScore // ignore: cast_nullable_to_non_nullable
                        as int?,
            totalQuestions:
                freezed == totalQuestions
                    ? _value.totalQuestions
                    : totalQuestions // ignore: cast_nullable_to_non_nullable
                        as int?,
            avgPercentage:
                freezed == avgPercentage
                    ? _value.avgPercentage
                    : avgPercentage // ignore: cast_nullable_to_non_nullable
                        as int?,
            perfectScores:
                freezed == perfectScores
                    ? _value.perfectScores
                    : perfectScores // ignore: cast_nullable_to_non_nullable
                        as int?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$LeaderboardEntryImplCopyWith<$Res>
    implements $LeaderboardEntryCopyWith<$Res> {
  factory _$$LeaderboardEntryImplCopyWith(
    _$LeaderboardEntryImpl value,
    $Res Function(_$LeaderboardEntryImpl) then,
  ) = __$$LeaderboardEntryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int rank,
    String userId,
    String userName,
    String? userAvatar,
    int score,
    int total,
    double percentage,
    int timeTaken,
    int? totalGames,
    int? totalScore,
    int? totalQuestions,
    int? avgPercentage,
    int? perfectScores,
  });
}

/// @nodoc
class __$$LeaderboardEntryImplCopyWithImpl<$Res>
    extends _$LeaderboardEntryCopyWithImpl<$Res, _$LeaderboardEntryImpl>
    implements _$$LeaderboardEntryImplCopyWith<$Res> {
  __$$LeaderboardEntryImplCopyWithImpl(
    _$LeaderboardEntryImpl _value,
    $Res Function(_$LeaderboardEntryImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of LeaderboardEntry
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? rank = null,
    Object? userId = null,
    Object? userName = null,
    Object? userAvatar = freezed,
    Object? score = null,
    Object? total = null,
    Object? percentage = null,
    Object? timeTaken = null,
    Object? totalGames = freezed,
    Object? totalScore = freezed,
    Object? totalQuestions = freezed,
    Object? avgPercentage = freezed,
    Object? perfectScores = freezed,
  }) {
    return _then(
      _$LeaderboardEntryImpl(
        rank:
            null == rank
                ? _value.rank
                : rank // ignore: cast_nullable_to_non_nullable
                    as int,
        userId:
            null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                    as String,
        userName:
            null == userName
                ? _value.userName
                : userName // ignore: cast_nullable_to_non_nullable
                    as String,
        userAvatar:
            freezed == userAvatar
                ? _value.userAvatar
                : userAvatar // ignore: cast_nullable_to_non_nullable
                    as String?,
        score:
            null == score
                ? _value.score
                : score // ignore: cast_nullable_to_non_nullable
                    as int,
        total:
            null == total
                ? _value.total
                : total // ignore: cast_nullable_to_non_nullable
                    as int,
        percentage:
            null == percentage
                ? _value.percentage
                : percentage // ignore: cast_nullable_to_non_nullable
                    as double,
        timeTaken:
            null == timeTaken
                ? _value.timeTaken
                : timeTaken // ignore: cast_nullable_to_non_nullable
                    as int,
        totalGames:
            freezed == totalGames
                ? _value.totalGames
                : totalGames // ignore: cast_nullable_to_non_nullable
                    as int?,
        totalScore:
            freezed == totalScore
                ? _value.totalScore
                : totalScore // ignore: cast_nullable_to_non_nullable
                    as int?,
        totalQuestions:
            freezed == totalQuestions
                ? _value.totalQuestions
                : totalQuestions // ignore: cast_nullable_to_non_nullable
                    as int?,
        avgPercentage:
            freezed == avgPercentage
                ? _value.avgPercentage
                : avgPercentage // ignore: cast_nullable_to_non_nullable
                    as int?,
        perfectScores:
            freezed == perfectScores
                ? _value.perfectScores
                : perfectScores // ignore: cast_nullable_to_non_nullable
                    as int?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$LeaderboardEntryImpl implements _LeaderboardEntry {
  const _$LeaderboardEntryImpl({
    required this.rank,
    required this.userId,
    required this.userName,
    this.userAvatar,
    this.score = 0,
    this.total = 0,
    this.percentage = 0,
    this.timeTaken = 0,
    this.totalGames,
    this.totalScore,
    this.totalQuestions,
    this.avgPercentage,
    this.perfectScores,
  });

  factory _$LeaderboardEntryImpl.fromJson(Map<String, dynamic> json) =>
      _$$LeaderboardEntryImplFromJson(json);

  @override
  final int rank;
  @override
  final String userId;
  @override
  final String userName;
  @override
  final String? userAvatar;
  // Per-quiz fields
  @override
  @JsonKey()
  final int score;
  @override
  @JsonKey()
  final int total;
  @override
  @JsonKey()
  final double percentage;
  @override
  @JsonKey()
  final int timeTaken;
  // Global aggregate fields
  @override
  final int? totalGames;
  @override
  final int? totalScore;
  @override
  final int? totalQuestions;
  @override
  final int? avgPercentage;
  @override
  final int? perfectScores;

  @override
  String toString() {
    return 'LeaderboardEntry(rank: $rank, userId: $userId, userName: $userName, userAvatar: $userAvatar, score: $score, total: $total, percentage: $percentage, timeTaken: $timeTaken, totalGames: $totalGames, totalScore: $totalScore, totalQuestions: $totalQuestions, avgPercentage: $avgPercentage, perfectScores: $perfectScores)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LeaderboardEntryImpl &&
            (identical(other.rank, rank) || other.rank == rank) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.userName, userName) ||
                other.userName == userName) &&
            (identical(other.userAvatar, userAvatar) ||
                other.userAvatar == userAvatar) &&
            (identical(other.score, score) || other.score == score) &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.percentage, percentage) ||
                other.percentage == percentage) &&
            (identical(other.timeTaken, timeTaken) ||
                other.timeTaken == timeTaken) &&
            (identical(other.totalGames, totalGames) ||
                other.totalGames == totalGames) &&
            (identical(other.totalScore, totalScore) ||
                other.totalScore == totalScore) &&
            (identical(other.totalQuestions, totalQuestions) ||
                other.totalQuestions == totalQuestions) &&
            (identical(other.avgPercentage, avgPercentage) ||
                other.avgPercentage == avgPercentage) &&
            (identical(other.perfectScores, perfectScores) ||
                other.perfectScores == perfectScores));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    rank,
    userId,
    userName,
    userAvatar,
    score,
    total,
    percentage,
    timeTaken,
    totalGames,
    totalScore,
    totalQuestions,
    avgPercentage,
    perfectScores,
  );

  /// Create a copy of LeaderboardEntry
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LeaderboardEntryImplCopyWith<_$LeaderboardEntryImpl> get copyWith =>
      __$$LeaderboardEntryImplCopyWithImpl<_$LeaderboardEntryImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$LeaderboardEntryImplToJson(this);
  }
}

abstract class _LeaderboardEntry implements LeaderboardEntry {
  const factory _LeaderboardEntry({
    required final int rank,
    required final String userId,
    required final String userName,
    final String? userAvatar,
    final int score,
    final int total,
    final double percentage,
    final int timeTaken,
    final int? totalGames,
    final int? totalScore,
    final int? totalQuestions,
    final int? avgPercentage,
    final int? perfectScores,
  }) = _$LeaderboardEntryImpl;

  factory _LeaderboardEntry.fromJson(Map<String, dynamic> json) =
      _$LeaderboardEntryImpl.fromJson;

  @override
  int get rank;
  @override
  String get userId;
  @override
  String get userName;
  @override
  String? get userAvatar; // Per-quiz fields
  @override
  int get score;
  @override
  int get total;
  @override
  double get percentage;
  @override
  int get timeTaken; // Global aggregate fields
  @override
  int? get totalGames;
  @override
  int? get totalScore;
  @override
  int? get totalQuestions;
  @override
  int? get avgPercentage;
  @override
  int? get perfectScores;

  /// Create a copy of LeaderboardEntry
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LeaderboardEntryImplCopyWith<_$LeaderboardEntryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
