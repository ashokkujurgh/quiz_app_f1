// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'quiz_result.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

TopPlayer _$TopPlayerFromJson(Map<String, dynamic> json) {
  return _TopPlayer.fromJson(json);
}

/// @nodoc
mixin _$TopPlayer {
  int? get rank => throw _privateConstructorUsedError;
  String? get name => throw _privateConstructorUsedError;
  int get score => throw _privateConstructorUsedError;
  int get total => throw _privateConstructorUsedError;
  double get percentage => throw _privateConstructorUsedError;

  /// Serializes this TopPlayer to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TopPlayer
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TopPlayerCopyWith<TopPlayer> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TopPlayerCopyWith<$Res> {
  factory $TopPlayerCopyWith(TopPlayer value, $Res Function(TopPlayer) then) =
      _$TopPlayerCopyWithImpl<$Res, TopPlayer>;
  @useResult
  $Res call({int? rank, String? name, int score, int total, double percentage});
}

/// @nodoc
class _$TopPlayerCopyWithImpl<$Res, $Val extends TopPlayer>
    implements $TopPlayerCopyWith<$Res> {
  _$TopPlayerCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TopPlayer
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? rank = freezed,
    Object? name = freezed,
    Object? score = null,
    Object? total = null,
    Object? percentage = null,
  }) {
    return _then(
      _value.copyWith(
            rank:
                freezed == rank
                    ? _value.rank
                    : rank // ignore: cast_nullable_to_non_nullable
                        as int?,
            name:
                freezed == name
                    ? _value.name
                    : name // ignore: cast_nullable_to_non_nullable
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
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$TopPlayerImplCopyWith<$Res>
    implements $TopPlayerCopyWith<$Res> {
  factory _$$TopPlayerImplCopyWith(
    _$TopPlayerImpl value,
    $Res Function(_$TopPlayerImpl) then,
  ) = __$$TopPlayerImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({int? rank, String? name, int score, int total, double percentage});
}

/// @nodoc
class __$$TopPlayerImplCopyWithImpl<$Res>
    extends _$TopPlayerCopyWithImpl<$Res, _$TopPlayerImpl>
    implements _$$TopPlayerImplCopyWith<$Res> {
  __$$TopPlayerImplCopyWithImpl(
    _$TopPlayerImpl _value,
    $Res Function(_$TopPlayerImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of TopPlayer
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? rank = freezed,
    Object? name = freezed,
    Object? score = null,
    Object? total = null,
    Object? percentage = null,
  }) {
    return _then(
      _$TopPlayerImpl(
        rank:
            freezed == rank
                ? _value.rank
                : rank // ignore: cast_nullable_to_non_nullable
                    as int?,
        name:
            freezed == name
                ? _value.name
                : name // ignore: cast_nullable_to_non_nullable
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
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$TopPlayerImpl implements _TopPlayer {
  const _$TopPlayerImpl({
    this.rank,
    this.name,
    this.score = 0,
    this.total = 0,
    this.percentage = 0,
  });

  factory _$TopPlayerImpl.fromJson(Map<String, dynamic> json) =>
      _$$TopPlayerImplFromJson(json);

  @override
  final int? rank;
  @override
  final String? name;
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
  String toString() {
    return 'TopPlayer(rank: $rank, name: $name, score: $score, total: $total, percentage: $percentage)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TopPlayerImpl &&
            (identical(other.rank, rank) || other.rank == rank) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.score, score) || other.score == score) &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.percentage, percentage) ||
                other.percentage == percentage));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, rank, name, score, total, percentage);

  /// Create a copy of TopPlayer
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TopPlayerImplCopyWith<_$TopPlayerImpl> get copyWith =>
      __$$TopPlayerImplCopyWithImpl<_$TopPlayerImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TopPlayerImplToJson(this);
  }
}

abstract class _TopPlayer implements TopPlayer {
  const factory _TopPlayer({
    final int? rank,
    final String? name,
    final int score,
    final int total,
    final double percentage,
  }) = _$TopPlayerImpl;

  factory _TopPlayer.fromJson(Map<String, dynamic> json) =
      _$TopPlayerImpl.fromJson;

  @override
  int? get rank;
  @override
  String? get name;
  @override
  int get score;
  @override
  int get total;
  @override
  double get percentage;

  /// Create a copy of TopPlayer
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TopPlayerImplCopyWith<_$TopPlayerImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

QuizResult _$QuizResultFromJson(Map<String, dynamic> json) {
  return _QuizResult.fromJson(json);
}

/// @nodoc
mixin _$QuizResult {
  String get quizId => throw _privateConstructorUsedError;
  String get quizTitle => throw _privateConstructorUsedError;
  String? get category => throw _privateConstructorUsedError;
  int get score => throw _privateConstructorUsedError;
  int get total => throw _privateConstructorUsedError;
  double get percentage => throw _privateConstructorUsedError;
  int? get rank => throw _privateConstructorUsedError;
  int get duration => throw _privateConstructorUsedError;
  String? get date => throw _privateConstructorUsedError;
  List<int> get answers => throw _privateConstructorUsedError;
  int? get playerCount => throw _privateConstructorUsedError;
  double? get avgPercentage => throw _privateConstructorUsedError;
  List<TopPlayer> get topPlayers => throw _privateConstructorUsedError;

  /// Serializes this QuizResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of QuizResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $QuizResultCopyWith<QuizResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $QuizResultCopyWith<$Res> {
  factory $QuizResultCopyWith(
    QuizResult value,
    $Res Function(QuizResult) then,
  ) = _$QuizResultCopyWithImpl<$Res, QuizResult>;
  @useResult
  $Res call({
    String quizId,
    String quizTitle,
    String? category,
    int score,
    int total,
    double percentage,
    int? rank,
    int duration,
    String? date,
    List<int> answers,
    int? playerCount,
    double? avgPercentage,
    List<TopPlayer> topPlayers,
  });
}

/// @nodoc
class _$QuizResultCopyWithImpl<$Res, $Val extends QuizResult>
    implements $QuizResultCopyWith<$Res> {
  _$QuizResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of QuizResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? quizId = null,
    Object? quizTitle = null,
    Object? category = freezed,
    Object? score = null,
    Object? total = null,
    Object? percentage = null,
    Object? rank = freezed,
    Object? duration = null,
    Object? date = freezed,
    Object? answers = null,
    Object? playerCount = freezed,
    Object? avgPercentage = freezed,
    Object? topPlayers = null,
  }) {
    return _then(
      _value.copyWith(
            quizId:
                null == quizId
                    ? _value.quizId
                    : quizId // ignore: cast_nullable_to_non_nullable
                        as String,
            quizTitle:
                null == quizTitle
                    ? _value.quizTitle
                    : quizTitle // ignore: cast_nullable_to_non_nullable
                        as String,
            category:
                freezed == category
                    ? _value.category
                    : category // ignore: cast_nullable_to_non_nullable
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
            rank:
                freezed == rank
                    ? _value.rank
                    : rank // ignore: cast_nullable_to_non_nullable
                        as int?,
            duration:
                null == duration
                    ? _value.duration
                    : duration // ignore: cast_nullable_to_non_nullable
                        as int,
            date:
                freezed == date
                    ? _value.date
                    : date // ignore: cast_nullable_to_non_nullable
                        as String?,
            answers:
                null == answers
                    ? _value.answers
                    : answers // ignore: cast_nullable_to_non_nullable
                        as List<int>,
            playerCount:
                freezed == playerCount
                    ? _value.playerCount
                    : playerCount // ignore: cast_nullable_to_non_nullable
                        as int?,
            avgPercentage:
                freezed == avgPercentage
                    ? _value.avgPercentage
                    : avgPercentage // ignore: cast_nullable_to_non_nullable
                        as double?,
            topPlayers:
                null == topPlayers
                    ? _value.topPlayers
                    : topPlayers // ignore: cast_nullable_to_non_nullable
                        as List<TopPlayer>,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$QuizResultImplCopyWith<$Res>
    implements $QuizResultCopyWith<$Res> {
  factory _$$QuizResultImplCopyWith(
    _$QuizResultImpl value,
    $Res Function(_$QuizResultImpl) then,
  ) = __$$QuizResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String quizId,
    String quizTitle,
    String? category,
    int score,
    int total,
    double percentage,
    int? rank,
    int duration,
    String? date,
    List<int> answers,
    int? playerCount,
    double? avgPercentage,
    List<TopPlayer> topPlayers,
  });
}

/// @nodoc
class __$$QuizResultImplCopyWithImpl<$Res>
    extends _$QuizResultCopyWithImpl<$Res, _$QuizResultImpl>
    implements _$$QuizResultImplCopyWith<$Res> {
  __$$QuizResultImplCopyWithImpl(
    _$QuizResultImpl _value,
    $Res Function(_$QuizResultImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? quizId = null,
    Object? quizTitle = null,
    Object? category = freezed,
    Object? score = null,
    Object? total = null,
    Object? percentage = null,
    Object? rank = freezed,
    Object? duration = null,
    Object? date = freezed,
    Object? answers = null,
    Object? playerCount = freezed,
    Object? avgPercentage = freezed,
    Object? topPlayers = null,
  }) {
    return _then(
      _$QuizResultImpl(
        quizId:
            null == quizId
                ? _value.quizId
                : quizId // ignore: cast_nullable_to_non_nullable
                    as String,
        quizTitle:
            null == quizTitle
                ? _value.quizTitle
                : quizTitle // ignore: cast_nullable_to_non_nullable
                    as String,
        category:
            freezed == category
                ? _value.category
                : category // ignore: cast_nullable_to_non_nullable
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
        rank:
            freezed == rank
                ? _value.rank
                : rank // ignore: cast_nullable_to_non_nullable
                    as int?,
        duration:
            null == duration
                ? _value.duration
                : duration // ignore: cast_nullable_to_non_nullable
                    as int,
        date:
            freezed == date
                ? _value.date
                : date // ignore: cast_nullable_to_non_nullable
                    as String?,
        answers:
            null == answers
                ? _value._answers
                : answers // ignore: cast_nullable_to_non_nullable
                    as List<int>,
        playerCount:
            freezed == playerCount
                ? _value.playerCount
                : playerCount // ignore: cast_nullable_to_non_nullable
                    as int?,
        avgPercentage:
            freezed == avgPercentage
                ? _value.avgPercentage
                : avgPercentage // ignore: cast_nullable_to_non_nullable
                    as double?,
        topPlayers:
            null == topPlayers
                ? _value._topPlayers
                : topPlayers // ignore: cast_nullable_to_non_nullable
                    as List<TopPlayer>,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$QuizResultImpl implements _QuizResult {
  const _$QuizResultImpl({
    required this.quizId,
    required this.quizTitle,
    this.category,
    this.score = 0,
    this.total = 0,
    this.percentage = 0,
    this.rank,
    this.duration = 0,
    this.date,
    final List<int> answers = const <int>[],
    this.playerCount,
    this.avgPercentage,
    final List<TopPlayer> topPlayers = const <TopPlayer>[],
  }) : _answers = answers,
       _topPlayers = topPlayers;

  factory _$QuizResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$QuizResultImplFromJson(json);

  @override
  final String quizId;
  @override
  final String quizTitle;
  @override
  final String? category;
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
  final int? rank;
  @override
  @JsonKey()
  final int duration;
  @override
  final String? date;
  final List<int> _answers;
  @override
  @JsonKey()
  List<int> get answers {
    if (_answers is EqualUnmodifiableListView) return _answers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_answers);
  }

  @override
  final int? playerCount;
  @override
  final double? avgPercentage;
  final List<TopPlayer> _topPlayers;
  @override
  @JsonKey()
  List<TopPlayer> get topPlayers {
    if (_topPlayers is EqualUnmodifiableListView) return _topPlayers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_topPlayers);
  }

  @override
  String toString() {
    return 'QuizResult(quizId: $quizId, quizTitle: $quizTitle, category: $category, score: $score, total: $total, percentage: $percentage, rank: $rank, duration: $duration, date: $date, answers: $answers, playerCount: $playerCount, avgPercentage: $avgPercentage, topPlayers: $topPlayers)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizResultImpl &&
            (identical(other.quizId, quizId) || other.quizId == quizId) &&
            (identical(other.quizTitle, quizTitle) ||
                other.quizTitle == quizTitle) &&
            (identical(other.category, category) ||
                other.category == category) &&
            (identical(other.score, score) || other.score == score) &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.percentage, percentage) ||
                other.percentage == percentage) &&
            (identical(other.rank, rank) || other.rank == rank) &&
            (identical(other.duration, duration) ||
                other.duration == duration) &&
            (identical(other.date, date) || other.date == date) &&
            const DeepCollectionEquality().equals(other._answers, _answers) &&
            (identical(other.playerCount, playerCount) ||
                other.playerCount == playerCount) &&
            (identical(other.avgPercentage, avgPercentage) ||
                other.avgPercentage == avgPercentage) &&
            const DeepCollectionEquality().equals(
              other._topPlayers,
              _topPlayers,
            ));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    quizId,
    quizTitle,
    category,
    score,
    total,
    percentage,
    rank,
    duration,
    date,
    const DeepCollectionEquality().hash(_answers),
    playerCount,
    avgPercentage,
    const DeepCollectionEquality().hash(_topPlayers),
  );

  /// Create a copy of QuizResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizResultImplCopyWith<_$QuizResultImpl> get copyWith =>
      __$$QuizResultImplCopyWithImpl<_$QuizResultImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$QuizResultImplToJson(this);
  }
}

abstract class _QuizResult implements QuizResult {
  const factory _QuizResult({
    required final String quizId,
    required final String quizTitle,
    final String? category,
    final int score,
    final int total,
    final double percentage,
    final int? rank,
    final int duration,
    final String? date,
    final List<int> answers,
    final int? playerCount,
    final double? avgPercentage,
    final List<TopPlayer> topPlayers,
  }) = _$QuizResultImpl;

  factory _QuizResult.fromJson(Map<String, dynamic> json) =
      _$QuizResultImpl.fromJson;

  @override
  String get quizId;
  @override
  String get quizTitle;
  @override
  String? get category;
  @override
  int get score;
  @override
  int get total;
  @override
  double get percentage;
  @override
  int? get rank;
  @override
  int get duration;
  @override
  String? get date;
  @override
  List<int> get answers;
  @override
  int? get playerCount;
  @override
  double? get avgPercentage;
  @override
  List<TopPlayer> get topPlayers;

  /// Create a copy of QuizResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizResultImplCopyWith<_$QuizResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
