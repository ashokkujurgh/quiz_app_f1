// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'quiz_play_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$QuizPlayer {
  String get userId => throw _privateConstructorUsedError;
  String get userName => throw _privateConstructorUsedError;
  String? get userAvatar => throw _privateConstructorUsedError;

  /// Create a copy of QuizPlayer
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $QuizPlayerCopyWith<QuizPlayer> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $QuizPlayerCopyWith<$Res> {
  factory $QuizPlayerCopyWith(
    QuizPlayer value,
    $Res Function(QuizPlayer) then,
  ) = _$QuizPlayerCopyWithImpl<$Res, QuizPlayer>;
  @useResult
  $Res call({String userId, String userName, String? userAvatar});
}

/// @nodoc
class _$QuizPlayerCopyWithImpl<$Res, $Val extends QuizPlayer>
    implements $QuizPlayerCopyWith<$Res> {
  _$QuizPlayerCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of QuizPlayer
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? userName = null,
    Object? userAvatar = freezed,
  }) {
    return _then(
      _value.copyWith(
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
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$QuizPlayerImplCopyWith<$Res>
    implements $QuizPlayerCopyWith<$Res> {
  factory _$$QuizPlayerImplCopyWith(
    _$QuizPlayerImpl value,
    $Res Function(_$QuizPlayerImpl) then,
  ) = __$$QuizPlayerImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String userId, String userName, String? userAvatar});
}

/// @nodoc
class __$$QuizPlayerImplCopyWithImpl<$Res>
    extends _$QuizPlayerCopyWithImpl<$Res, _$QuizPlayerImpl>
    implements _$$QuizPlayerImplCopyWith<$Res> {
  __$$QuizPlayerImplCopyWithImpl(
    _$QuizPlayerImpl _value,
    $Res Function(_$QuizPlayerImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayer
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? userName = null,
    Object? userAvatar = freezed,
  }) {
    return _then(
      _$QuizPlayerImpl(
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
      ),
    );
  }
}

/// @nodoc

class _$QuizPlayerImpl implements _QuizPlayer {
  const _$QuizPlayerImpl({
    required this.userId,
    required this.userName,
    this.userAvatar,
  });

  @override
  final String userId;
  @override
  final String userName;
  @override
  final String? userAvatar;

  @override
  String toString() {
    return 'QuizPlayer(userId: $userId, userName: $userName, userAvatar: $userAvatar)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayerImpl &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.userName, userName) ||
                other.userName == userName) &&
            (identical(other.userAvatar, userAvatar) ||
                other.userAvatar == userAvatar));
  }

  @override
  int get hashCode => Object.hash(runtimeType, userId, userName, userAvatar);

  /// Create a copy of QuizPlayer
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayerImplCopyWith<_$QuizPlayerImpl> get copyWith =>
      __$$QuizPlayerImplCopyWithImpl<_$QuizPlayerImpl>(this, _$identity);
}

abstract class _QuizPlayer implements QuizPlayer {
  const factory _QuizPlayer({
    required final String userId,
    required final String userName,
    final String? userAvatar,
  }) = _$QuizPlayerImpl;

  @override
  String get userId;
  @override
  String get userName;
  @override
  String? get userAvatar;

  /// Create a copy of QuizPlayer
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayerImplCopyWith<_$QuizPlayerImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$LiveQuestion {
  int get questionIndex => throw _privateConstructorUsedError;
  String get questionId => throw _privateConstructorUsedError;
  String get question => throw _privateConstructorUsedError;
  List<String> get options => throw _privateConstructorUsedError;
  int get timeLimit => throw _privateConstructorUsedError;
  int get total => throw _privateConstructorUsedError;

  /// Create a copy of LiveQuestion
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LiveQuestionCopyWith<LiveQuestion> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LiveQuestionCopyWith<$Res> {
  factory $LiveQuestionCopyWith(
    LiveQuestion value,
    $Res Function(LiveQuestion) then,
  ) = _$LiveQuestionCopyWithImpl<$Res, LiveQuestion>;
  @useResult
  $Res call({
    int questionIndex,
    String questionId,
    String question,
    List<String> options,
    int timeLimit,
    int total,
  });
}

/// @nodoc
class _$LiveQuestionCopyWithImpl<$Res, $Val extends LiveQuestion>
    implements $LiveQuestionCopyWith<$Res> {
  _$LiveQuestionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LiveQuestion
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? questionIndex = null,
    Object? questionId = null,
    Object? question = null,
    Object? options = null,
    Object? timeLimit = null,
    Object? total = null,
  }) {
    return _then(
      _value.copyWith(
            questionIndex:
                null == questionIndex
                    ? _value.questionIndex
                    : questionIndex // ignore: cast_nullable_to_non_nullable
                        as int,
            questionId:
                null == questionId
                    ? _value.questionId
                    : questionId // ignore: cast_nullable_to_non_nullable
                        as String,
            question:
                null == question
                    ? _value.question
                    : question // ignore: cast_nullable_to_non_nullable
                        as String,
            options:
                null == options
                    ? _value.options
                    : options // ignore: cast_nullable_to_non_nullable
                        as List<String>,
            timeLimit:
                null == timeLimit
                    ? _value.timeLimit
                    : timeLimit // ignore: cast_nullable_to_non_nullable
                        as int,
            total:
                null == total
                    ? _value.total
                    : total // ignore: cast_nullable_to_non_nullable
                        as int,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$LiveQuestionImplCopyWith<$Res>
    implements $LiveQuestionCopyWith<$Res> {
  factory _$$LiveQuestionImplCopyWith(
    _$LiveQuestionImpl value,
    $Res Function(_$LiveQuestionImpl) then,
  ) = __$$LiveQuestionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int questionIndex,
    String questionId,
    String question,
    List<String> options,
    int timeLimit,
    int total,
  });
}

/// @nodoc
class __$$LiveQuestionImplCopyWithImpl<$Res>
    extends _$LiveQuestionCopyWithImpl<$Res, _$LiveQuestionImpl>
    implements _$$LiveQuestionImplCopyWith<$Res> {
  __$$LiveQuestionImplCopyWithImpl(
    _$LiveQuestionImpl _value,
    $Res Function(_$LiveQuestionImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of LiveQuestion
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? questionIndex = null,
    Object? questionId = null,
    Object? question = null,
    Object? options = null,
    Object? timeLimit = null,
    Object? total = null,
  }) {
    return _then(
      _$LiveQuestionImpl(
        questionIndex:
            null == questionIndex
                ? _value.questionIndex
                : questionIndex // ignore: cast_nullable_to_non_nullable
                    as int,
        questionId:
            null == questionId
                ? _value.questionId
                : questionId // ignore: cast_nullable_to_non_nullable
                    as String,
        question:
            null == question
                ? _value.question
                : question // ignore: cast_nullable_to_non_nullable
                    as String,
        options:
            null == options
                ? _value._options
                : options // ignore: cast_nullable_to_non_nullable
                    as List<String>,
        timeLimit:
            null == timeLimit
                ? _value.timeLimit
                : timeLimit // ignore: cast_nullable_to_non_nullable
                    as int,
        total:
            null == total
                ? _value.total
                : total // ignore: cast_nullable_to_non_nullable
                    as int,
      ),
    );
  }
}

/// @nodoc

class _$LiveQuestionImpl implements _LiveQuestion {
  const _$LiveQuestionImpl({
    required this.questionIndex,
    required this.questionId,
    required this.question,
    required final List<String> options,
    required this.timeLimit,
    required this.total,
  }) : _options = options;

  @override
  final int questionIndex;
  @override
  final String questionId;
  @override
  final String question;
  final List<String> _options;
  @override
  List<String> get options {
    if (_options is EqualUnmodifiableListView) return _options;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_options);
  }

  @override
  final int timeLimit;
  @override
  final int total;

  @override
  String toString() {
    return 'LiveQuestion(questionIndex: $questionIndex, questionId: $questionId, question: $question, options: $options, timeLimit: $timeLimit, total: $total)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LiveQuestionImpl &&
            (identical(other.questionIndex, questionIndex) ||
                other.questionIndex == questionIndex) &&
            (identical(other.questionId, questionId) ||
                other.questionId == questionId) &&
            (identical(other.question, question) ||
                other.question == question) &&
            const DeepCollectionEquality().equals(other._options, _options) &&
            (identical(other.timeLimit, timeLimit) ||
                other.timeLimit == timeLimit) &&
            (identical(other.total, total) || other.total == total));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    questionIndex,
    questionId,
    question,
    const DeepCollectionEquality().hash(_options),
    timeLimit,
    total,
  );

  /// Create a copy of LiveQuestion
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LiveQuestionImplCopyWith<_$LiveQuestionImpl> get copyWith =>
      __$$LiveQuestionImplCopyWithImpl<_$LiveQuestionImpl>(this, _$identity);
}

abstract class _LiveQuestion implements LiveQuestion {
  const factory _LiveQuestion({
    required final int questionIndex,
    required final String questionId,
    required final String question,
    required final List<String> options,
    required final int timeLimit,
    required final int total,
  }) = _$LiveQuestionImpl;

  @override
  int get questionIndex;
  @override
  String get questionId;
  @override
  String get question;
  @override
  List<String> get options;
  @override
  int get timeLimit;
  @override
  int get total;

  /// Create a copy of LiveQuestion
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LiveQuestionImplCopyWith<_$LiveQuestionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$QuizPlayState {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $QuizPlayStateCopyWith<$Res> {
  factory $QuizPlayStateCopyWith(
    QuizPlayState value,
    $Res Function(QuizPlayState) then,
  ) = _$QuizPlayStateCopyWithImpl<$Res, QuizPlayState>;
}

/// @nodoc
class _$QuizPlayStateCopyWithImpl<$Res, $Val extends QuizPlayState>
    implements $QuizPlayStateCopyWith<$Res> {
  _$QuizPlayStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
abstract class _$$QuizPlayConnectingImplCopyWith<$Res> {
  factory _$$QuizPlayConnectingImplCopyWith(
    _$QuizPlayConnectingImpl value,
    $Res Function(_$QuizPlayConnectingImpl) then,
  ) = __$$QuizPlayConnectingImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$QuizPlayConnectingImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayConnectingImpl>
    implements _$$QuizPlayConnectingImplCopyWith<$Res> {
  __$$QuizPlayConnectingImplCopyWithImpl(
    _$QuizPlayConnectingImpl _value,
    $Res Function(_$QuizPlayConnectingImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$QuizPlayConnectingImpl implements QuizPlayConnecting {
  const _$QuizPlayConnectingImpl();

  @override
  String toString() {
    return 'QuizPlayState.connecting()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$QuizPlayConnectingImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return connecting();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return connecting?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (connecting != null) {
      return connecting();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return connecting(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return connecting?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (connecting != null) {
      return connecting(this);
    }
    return orElse();
  }
}

abstract class QuizPlayConnecting implements QuizPlayState {
  const factory QuizPlayConnecting() = _$QuizPlayConnectingImpl;
}

/// @nodoc
abstract class _$$QuizPlayLobbyImplCopyWith<$Res> {
  factory _$$QuizPlayLobbyImplCopyWith(
    _$QuizPlayLobbyImpl value,
    $Res Function(_$QuizPlayLobbyImpl) then,
  ) = __$$QuizPlayLobbyImplCopyWithImpl<$Res>;
  @useResult
  $Res call({List<QuizPlayer> players});
}

/// @nodoc
class __$$QuizPlayLobbyImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayLobbyImpl>
    implements _$$QuizPlayLobbyImplCopyWith<$Res> {
  __$$QuizPlayLobbyImplCopyWithImpl(
    _$QuizPlayLobbyImpl _value,
    $Res Function(_$QuizPlayLobbyImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? players = null}) {
    return _then(
      _$QuizPlayLobbyImpl(
        players:
            null == players
                ? _value._players
                : players // ignore: cast_nullable_to_non_nullable
                    as List<QuizPlayer>,
      ),
    );
  }
}

/// @nodoc

class _$QuizPlayLobbyImpl implements QuizPlayLobby {
  const _$QuizPlayLobbyImpl({
    final List<QuizPlayer> players = const <QuizPlayer>[],
  }) : _players = players;

  final List<QuizPlayer> _players;
  @override
  @JsonKey()
  List<QuizPlayer> get players {
    if (_players is EqualUnmodifiableListView) return _players;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_players);
  }

  @override
  String toString() {
    return 'QuizPlayState.lobby(players: $players)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayLobbyImpl &&
            const DeepCollectionEquality().equals(other._players, _players));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_players));

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayLobbyImplCopyWith<_$QuizPlayLobbyImpl> get copyWith =>
      __$$QuizPlayLobbyImplCopyWithImpl<_$QuizPlayLobbyImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return lobby(players);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return lobby?.call(players);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (lobby != null) {
      return lobby(players);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return lobby(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return lobby?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (lobby != null) {
      return lobby(this);
    }
    return orElse();
  }
}

abstract class QuizPlayLobby implements QuizPlayState {
  const factory QuizPlayLobby({final List<QuizPlayer> players}) =
      _$QuizPlayLobbyImpl;

  List<QuizPlayer> get players;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayLobbyImplCopyWith<_$QuizPlayLobbyImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$QuizPlayPerQuestionRoundImplCopyWith<$Res> {
  factory _$$QuizPlayPerQuestionRoundImplCopyWith(
    _$QuizPlayPerQuestionRoundImpl value,
    $Res Function(_$QuizPlayPerQuestionRoundImpl) then,
  ) = __$$QuizPlayPerQuestionRoundImplCopyWithImpl<$Res>;
  @useResult
  $Res call({
    LiveQuestion question,
    int timeLeft,
    int? selectedOption,
    List<QuizPlayer> players,
    List<LeaderboardEntry> liveScores,
  });

  $LiveQuestionCopyWith<$Res> get question;
}

/// @nodoc
class __$$QuizPlayPerQuestionRoundImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayPerQuestionRoundImpl>
    implements _$$QuizPlayPerQuestionRoundImplCopyWith<$Res> {
  __$$QuizPlayPerQuestionRoundImplCopyWithImpl(
    _$QuizPlayPerQuestionRoundImpl _value,
    $Res Function(_$QuizPlayPerQuestionRoundImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? question = null,
    Object? timeLeft = null,
    Object? selectedOption = freezed,
    Object? players = null,
    Object? liveScores = null,
  }) {
    return _then(
      _$QuizPlayPerQuestionRoundImpl(
        question:
            null == question
                ? _value.question
                : question // ignore: cast_nullable_to_non_nullable
                    as LiveQuestion,
        timeLeft:
            null == timeLeft
                ? _value.timeLeft
                : timeLeft // ignore: cast_nullable_to_non_nullable
                    as int,
        selectedOption:
            freezed == selectedOption
                ? _value.selectedOption
                : selectedOption // ignore: cast_nullable_to_non_nullable
                    as int?,
        players:
            null == players
                ? _value._players
                : players // ignore: cast_nullable_to_non_nullable
                    as List<QuizPlayer>,
        liveScores:
            null == liveScores
                ? _value._liveScores
                : liveScores // ignore: cast_nullable_to_non_nullable
                    as List<LeaderboardEntry>,
      ),
    );
  }

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $LiveQuestionCopyWith<$Res> get question {
    return $LiveQuestionCopyWith<$Res>(_value.question, (value) {
      return _then(_value.copyWith(question: value));
    });
  }
}

/// @nodoc

class _$QuizPlayPerQuestionRoundImpl implements QuizPlayPerQuestionRound {
  const _$QuizPlayPerQuestionRoundImpl({
    required this.question,
    required this.timeLeft,
    this.selectedOption,
    final List<QuizPlayer> players = const <QuizPlayer>[],
    final List<LeaderboardEntry> liveScores = const <LeaderboardEntry>[],
  }) : _players = players,
       _liveScores = liveScores;

  @override
  final LiveQuestion question;
  @override
  final int timeLeft;
  @override
  final int? selectedOption;
  final List<QuizPlayer> _players;
  @override
  @JsonKey()
  List<QuizPlayer> get players {
    if (_players is EqualUnmodifiableListView) return _players;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_players);
  }

  final List<LeaderboardEntry> _liveScores;
  @override
  @JsonKey()
  List<LeaderboardEntry> get liveScores {
    if (_liveScores is EqualUnmodifiableListView) return _liveScores;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_liveScores);
  }

  @override
  String toString() {
    return 'QuizPlayState.perQuestionRound(question: $question, timeLeft: $timeLeft, selectedOption: $selectedOption, players: $players, liveScores: $liveScores)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayPerQuestionRoundImpl &&
            (identical(other.question, question) ||
                other.question == question) &&
            (identical(other.timeLeft, timeLeft) ||
                other.timeLeft == timeLeft) &&
            (identical(other.selectedOption, selectedOption) ||
                other.selectedOption == selectedOption) &&
            const DeepCollectionEquality().equals(other._players, _players) &&
            const DeepCollectionEquality().equals(
              other._liveScores,
              _liveScores,
            ));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    question,
    timeLeft,
    selectedOption,
    const DeepCollectionEquality().hash(_players),
    const DeepCollectionEquality().hash(_liveScores),
  );

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayPerQuestionRoundImplCopyWith<_$QuizPlayPerQuestionRoundImpl>
  get copyWith => __$$QuizPlayPerQuestionRoundImplCopyWithImpl<
    _$QuizPlayPerQuestionRoundImpl
  >(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return perQuestionRound(
      question,
      timeLeft,
      selectedOption,
      players,
      liveScores,
    );
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return perQuestionRound?.call(
      question,
      timeLeft,
      selectedOption,
      players,
      liveScores,
    );
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (perQuestionRound != null) {
      return perQuestionRound(
        question,
        timeLeft,
        selectedOption,
        players,
        liveScores,
      );
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return perQuestionRound(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return perQuestionRound?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (perQuestionRound != null) {
      return perQuestionRound(this);
    }
    return orElse();
  }
}

abstract class QuizPlayPerQuestionRound implements QuizPlayState {
  const factory QuizPlayPerQuestionRound({
    required final LiveQuestion question,
    required final int timeLeft,
    final int? selectedOption,
    final List<QuizPlayer> players,
    final List<LeaderboardEntry> liveScores,
  }) = _$QuizPlayPerQuestionRoundImpl;

  LiveQuestion get question;
  int get timeLeft;
  int? get selectedOption;
  List<QuizPlayer> get players;
  List<LeaderboardEntry> get liveScores;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayPerQuestionRoundImplCopyWith<_$QuizPlayPerQuestionRoundImpl>
  get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$QuizPlayPerQuestionEndedImplCopyWith<$Res> {
  factory _$$QuizPlayPerQuestionEndedImplCopyWith(
    _$QuizPlayPerQuestionEndedImpl value,
    $Res Function(_$QuizPlayPerQuestionEndedImpl) then,
  ) = __$$QuizPlayPerQuestionEndedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({
    LiveQuestion question,
    int correctOption,
    int? selectedOption,
    List<QuizPlayer> players,
    List<LeaderboardEntry> liveScores,
  });

  $LiveQuestionCopyWith<$Res> get question;
}

/// @nodoc
class __$$QuizPlayPerQuestionEndedImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayPerQuestionEndedImpl>
    implements _$$QuizPlayPerQuestionEndedImplCopyWith<$Res> {
  __$$QuizPlayPerQuestionEndedImplCopyWithImpl(
    _$QuizPlayPerQuestionEndedImpl _value,
    $Res Function(_$QuizPlayPerQuestionEndedImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? question = null,
    Object? correctOption = null,
    Object? selectedOption = freezed,
    Object? players = null,
    Object? liveScores = null,
  }) {
    return _then(
      _$QuizPlayPerQuestionEndedImpl(
        question:
            null == question
                ? _value.question
                : question // ignore: cast_nullable_to_non_nullable
                    as LiveQuestion,
        correctOption:
            null == correctOption
                ? _value.correctOption
                : correctOption // ignore: cast_nullable_to_non_nullable
                    as int,
        selectedOption:
            freezed == selectedOption
                ? _value.selectedOption
                : selectedOption // ignore: cast_nullable_to_non_nullable
                    as int?,
        players:
            null == players
                ? _value._players
                : players // ignore: cast_nullable_to_non_nullable
                    as List<QuizPlayer>,
        liveScores:
            null == liveScores
                ? _value._liveScores
                : liveScores // ignore: cast_nullable_to_non_nullable
                    as List<LeaderboardEntry>,
      ),
    );
  }

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $LiveQuestionCopyWith<$Res> get question {
    return $LiveQuestionCopyWith<$Res>(_value.question, (value) {
      return _then(_value.copyWith(question: value));
    });
  }
}

/// @nodoc

class _$QuizPlayPerQuestionEndedImpl implements QuizPlayPerQuestionEnded {
  const _$QuizPlayPerQuestionEndedImpl({
    required this.question,
    required this.correctOption,
    this.selectedOption,
    final List<QuizPlayer> players = const <QuizPlayer>[],
    final List<LeaderboardEntry> liveScores = const <LeaderboardEntry>[],
  }) : _players = players,
       _liveScores = liveScores;

  @override
  final LiveQuestion question;
  @override
  final int correctOption;
  @override
  final int? selectedOption;
  final List<QuizPlayer> _players;
  @override
  @JsonKey()
  List<QuizPlayer> get players {
    if (_players is EqualUnmodifiableListView) return _players;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_players);
  }

  final List<LeaderboardEntry> _liveScores;
  @override
  @JsonKey()
  List<LeaderboardEntry> get liveScores {
    if (_liveScores is EqualUnmodifiableListView) return _liveScores;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_liveScores);
  }

  @override
  String toString() {
    return 'QuizPlayState.perQuestionEnded(question: $question, correctOption: $correctOption, selectedOption: $selectedOption, players: $players, liveScores: $liveScores)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayPerQuestionEndedImpl &&
            (identical(other.question, question) ||
                other.question == question) &&
            (identical(other.correctOption, correctOption) ||
                other.correctOption == correctOption) &&
            (identical(other.selectedOption, selectedOption) ||
                other.selectedOption == selectedOption) &&
            const DeepCollectionEquality().equals(other._players, _players) &&
            const DeepCollectionEquality().equals(
              other._liveScores,
              _liveScores,
            ));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    question,
    correctOption,
    selectedOption,
    const DeepCollectionEquality().hash(_players),
    const DeepCollectionEquality().hash(_liveScores),
  );

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayPerQuestionEndedImplCopyWith<_$QuizPlayPerQuestionEndedImpl>
  get copyWith => __$$QuizPlayPerQuestionEndedImplCopyWithImpl<
    _$QuizPlayPerQuestionEndedImpl
  >(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return perQuestionEnded(
      question,
      correctOption,
      selectedOption,
      players,
      liveScores,
    );
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return perQuestionEnded?.call(
      question,
      correctOption,
      selectedOption,
      players,
      liveScores,
    );
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (perQuestionEnded != null) {
      return perQuestionEnded(
        question,
        correctOption,
        selectedOption,
        players,
        liveScores,
      );
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return perQuestionEnded(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return perQuestionEnded?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (perQuestionEnded != null) {
      return perQuestionEnded(this);
    }
    return orElse();
  }
}

abstract class QuizPlayPerQuestionEnded implements QuizPlayState {
  const factory QuizPlayPerQuestionEnded({
    required final LiveQuestion question,
    required final int correctOption,
    final int? selectedOption,
    final List<QuizPlayer> players,
    final List<LeaderboardEntry> liveScores,
  }) = _$QuizPlayPerQuestionEndedImpl;

  LiveQuestion get question;
  int get correctOption;
  int? get selectedOption;
  List<QuizPlayer> get players;
  List<LeaderboardEntry> get liveScores;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayPerQuestionEndedImplCopyWith<_$QuizPlayPerQuestionEndedImpl>
  get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$QuizPlayTotalTimerRoundImplCopyWith<$Res> {
  factory _$$QuizPlayTotalTimerRoundImplCopyWith(
    _$QuizPlayTotalTimerRoundImpl value,
    $Res Function(_$QuizPlayTotalTimerRoundImpl) then,
  ) = __$$QuizPlayTotalTimerRoundImplCopyWithImpl<$Res>;
  @useResult
  $Res call({
    List<LiveQuestion> questions,
    int currentIndex,
    Map<int, int> answers,
    int timeLeft,
  });
}

/// @nodoc
class __$$QuizPlayTotalTimerRoundImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayTotalTimerRoundImpl>
    implements _$$QuizPlayTotalTimerRoundImplCopyWith<$Res> {
  __$$QuizPlayTotalTimerRoundImplCopyWithImpl(
    _$QuizPlayTotalTimerRoundImpl _value,
    $Res Function(_$QuizPlayTotalTimerRoundImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? questions = null,
    Object? currentIndex = null,
    Object? answers = null,
    Object? timeLeft = null,
  }) {
    return _then(
      _$QuizPlayTotalTimerRoundImpl(
        questions:
            null == questions
                ? _value._questions
                : questions // ignore: cast_nullable_to_non_nullable
                    as List<LiveQuestion>,
        currentIndex:
            null == currentIndex
                ? _value.currentIndex
                : currentIndex // ignore: cast_nullable_to_non_nullable
                    as int,
        answers:
            null == answers
                ? _value._answers
                : answers // ignore: cast_nullable_to_non_nullable
                    as Map<int, int>,
        timeLeft:
            null == timeLeft
                ? _value.timeLeft
                : timeLeft // ignore: cast_nullable_to_non_nullable
                    as int,
      ),
    );
  }
}

/// @nodoc

class _$QuizPlayTotalTimerRoundImpl implements QuizPlayTotalTimerRound {
  const _$QuizPlayTotalTimerRoundImpl({
    required final List<LiveQuestion> questions,
    required this.currentIndex,
    required final Map<int, int> answers,
    required this.timeLeft,
  }) : _questions = questions,
       _answers = answers;

  final List<LiveQuestion> _questions;
  @override
  List<LiveQuestion> get questions {
    if (_questions is EqualUnmodifiableListView) return _questions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_questions);
  }

  @override
  final int currentIndex;
  final Map<int, int> _answers;
  @override
  Map<int, int> get answers {
    if (_answers is EqualUnmodifiableMapView) return _answers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_answers);
  }

  // questionIndex -> selected option
  @override
  final int timeLeft;

  @override
  String toString() {
    return 'QuizPlayState.totalTimerRound(questions: $questions, currentIndex: $currentIndex, answers: $answers, timeLeft: $timeLeft)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayTotalTimerRoundImpl &&
            const DeepCollectionEquality().equals(
              other._questions,
              _questions,
            ) &&
            (identical(other.currentIndex, currentIndex) ||
                other.currentIndex == currentIndex) &&
            const DeepCollectionEquality().equals(other._answers, _answers) &&
            (identical(other.timeLeft, timeLeft) ||
                other.timeLeft == timeLeft));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    const DeepCollectionEquality().hash(_questions),
    currentIndex,
    const DeepCollectionEquality().hash(_answers),
    timeLeft,
  );

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayTotalTimerRoundImplCopyWith<_$QuizPlayTotalTimerRoundImpl>
  get copyWith => __$$QuizPlayTotalTimerRoundImplCopyWithImpl<
    _$QuizPlayTotalTimerRoundImpl
  >(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return totalTimerRound(questions, currentIndex, answers, timeLeft);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return totalTimerRound?.call(questions, currentIndex, answers, timeLeft);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (totalTimerRound != null) {
      return totalTimerRound(questions, currentIndex, answers, timeLeft);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return totalTimerRound(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return totalTimerRound?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (totalTimerRound != null) {
      return totalTimerRound(this);
    }
    return orElse();
  }
}

abstract class QuizPlayTotalTimerRound implements QuizPlayState {
  const factory QuizPlayTotalTimerRound({
    required final List<LiveQuestion> questions,
    required final int currentIndex,
    required final Map<int, int> answers,
    required final int timeLeft,
  }) = _$QuizPlayTotalTimerRoundImpl;

  List<LiveQuestion> get questions;
  int get currentIndex;
  Map<int, int> get answers; // questionIndex -> selected option
  int get timeLeft;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayTotalTimerRoundImplCopyWith<_$QuizPlayTotalTimerRoundImpl>
  get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$QuizPlayEndedImplCopyWith<$Res> {
  factory _$$QuizPlayEndedImplCopyWith(
    _$QuizPlayEndedImpl value,
    $Res Function(_$QuizPlayEndedImpl) then,
  ) = __$$QuizPlayEndedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({List<LeaderboardEntry> leaderboard, String? quizTitle});
}

/// @nodoc
class __$$QuizPlayEndedImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayEndedImpl>
    implements _$$QuizPlayEndedImplCopyWith<$Res> {
  __$$QuizPlayEndedImplCopyWithImpl(
    _$QuizPlayEndedImpl _value,
    $Res Function(_$QuizPlayEndedImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? leaderboard = null, Object? quizTitle = freezed}) {
    return _then(
      _$QuizPlayEndedImpl(
        leaderboard:
            null == leaderboard
                ? _value._leaderboard
                : leaderboard // ignore: cast_nullable_to_non_nullable
                    as List<LeaderboardEntry>,
        quizTitle:
            freezed == quizTitle
                ? _value.quizTitle
                : quizTitle // ignore: cast_nullable_to_non_nullable
                    as String?,
      ),
    );
  }
}

/// @nodoc

class _$QuizPlayEndedImpl implements QuizPlayEnded {
  const _$QuizPlayEndedImpl({
    required final List<LeaderboardEntry> leaderboard,
    this.quizTitle,
  }) : _leaderboard = leaderboard;

  final List<LeaderboardEntry> _leaderboard;
  @override
  List<LeaderboardEntry> get leaderboard {
    if (_leaderboard is EqualUnmodifiableListView) return _leaderboard;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_leaderboard);
  }

  @override
  final String? quizTitle;

  @override
  String toString() {
    return 'QuizPlayState.ended(leaderboard: $leaderboard, quizTitle: $quizTitle)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayEndedImpl &&
            const DeepCollectionEquality().equals(
              other._leaderboard,
              _leaderboard,
            ) &&
            (identical(other.quizTitle, quizTitle) ||
                other.quizTitle == quizTitle));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    const DeepCollectionEquality().hash(_leaderboard),
    quizTitle,
  );

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayEndedImplCopyWith<_$QuizPlayEndedImpl> get copyWith =>
      __$$QuizPlayEndedImplCopyWithImpl<_$QuizPlayEndedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return ended(leaderboard, quizTitle);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return ended?.call(leaderboard, quizTitle);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (ended != null) {
      return ended(leaderboard, quizTitle);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return ended(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return ended?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (ended != null) {
      return ended(this);
    }
    return orElse();
  }
}

abstract class QuizPlayEnded implements QuizPlayState {
  const factory QuizPlayEnded({
    required final List<LeaderboardEntry> leaderboard,
    final String? quizTitle,
  }) = _$QuizPlayEndedImpl;

  List<LeaderboardEntry> get leaderboard;
  String? get quizTitle;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayEndedImplCopyWith<_$QuizPlayEndedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$QuizPlayAlreadyAttemptedImplCopyWith<$Res> {
  factory _$$QuizPlayAlreadyAttemptedImplCopyWith(
    _$QuizPlayAlreadyAttemptedImpl value,
    $Res Function(_$QuizPlayAlreadyAttemptedImpl) then,
  ) = __$$QuizPlayAlreadyAttemptedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String? message});
}

/// @nodoc
class __$$QuizPlayAlreadyAttemptedImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayAlreadyAttemptedImpl>
    implements _$$QuizPlayAlreadyAttemptedImplCopyWith<$Res> {
  __$$QuizPlayAlreadyAttemptedImplCopyWithImpl(
    _$QuizPlayAlreadyAttemptedImpl _value,
    $Res Function(_$QuizPlayAlreadyAttemptedImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? message = freezed}) {
    return _then(
      _$QuizPlayAlreadyAttemptedImpl(
        message:
            freezed == message
                ? _value.message
                : message // ignore: cast_nullable_to_non_nullable
                    as String?,
      ),
    );
  }
}

/// @nodoc

class _$QuizPlayAlreadyAttemptedImpl implements QuizPlayAlreadyAttempted {
  const _$QuizPlayAlreadyAttemptedImpl({this.message});

  @override
  final String? message;

  @override
  String toString() {
    return 'QuizPlayState.alreadyAttempted(message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayAlreadyAttemptedImpl &&
            (identical(other.message, message) || other.message == message));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayAlreadyAttemptedImplCopyWith<_$QuizPlayAlreadyAttemptedImpl>
  get copyWith => __$$QuizPlayAlreadyAttemptedImplCopyWithImpl<
    _$QuizPlayAlreadyAttemptedImpl
  >(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return alreadyAttempted(message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return alreadyAttempted?.call(message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (alreadyAttempted != null) {
      return alreadyAttempted(message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return alreadyAttempted(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return alreadyAttempted?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (alreadyAttempted != null) {
      return alreadyAttempted(this);
    }
    return orElse();
  }
}

abstract class QuizPlayAlreadyAttempted implements QuizPlayState {
  const factory QuizPlayAlreadyAttempted({final String? message}) =
      _$QuizPlayAlreadyAttemptedImpl;

  String? get message;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayAlreadyAttemptedImplCopyWith<_$QuizPlayAlreadyAttemptedImpl>
  get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$QuizPlayErrorImplCopyWith<$Res> {
  factory _$$QuizPlayErrorImplCopyWith(
    _$QuizPlayErrorImpl value,
    $Res Function(_$QuizPlayErrorImpl) then,
  ) = __$$QuizPlayErrorImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String message});
}

/// @nodoc
class __$$QuizPlayErrorImplCopyWithImpl<$Res>
    extends _$QuizPlayStateCopyWithImpl<$Res, _$QuizPlayErrorImpl>
    implements _$$QuizPlayErrorImplCopyWith<$Res> {
  __$$QuizPlayErrorImplCopyWithImpl(
    _$QuizPlayErrorImpl _value,
    $Res Function(_$QuizPlayErrorImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? message = null}) {
    return _then(
      _$QuizPlayErrorImpl(
        null == message
            ? _value.message
            : message // ignore: cast_nullable_to_non_nullable
                as String,
      ),
    );
  }
}

/// @nodoc

class _$QuizPlayErrorImpl implements QuizPlayError {
  const _$QuizPlayErrorImpl(this.message);

  @override
  final String message;

  @override
  String toString() {
    return 'QuizPlayState.error(message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizPlayErrorImpl &&
            (identical(other.message, message) || other.message == message));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message);

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizPlayErrorImplCopyWith<_$QuizPlayErrorImpl> get copyWith =>
      __$$QuizPlayErrorImplCopyWithImpl<_$QuizPlayErrorImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() connecting,
    required TResult Function(List<QuizPlayer> players) lobby,
    required TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionRound,
    required TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )
    perQuestionEnded,
    required TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )
    totalTimerRound,
    required TResult Function(
      List<LeaderboardEntry> leaderboard,
      String? quizTitle,
    )
    ended,
    required TResult Function(String? message) alreadyAttempted,
    required TResult Function(String message) error,
  }) {
    return error(message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? connecting,
    TResult? Function(List<QuizPlayer> players)? lobby,
    TResult? Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult? Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult? Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult? Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult? Function(String? message)? alreadyAttempted,
    TResult? Function(String message)? error,
  }) {
    return error?.call(message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? connecting,
    TResult Function(List<QuizPlayer> players)? lobby,
    TResult Function(
      LiveQuestion question,
      int timeLeft,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionRound,
    TResult Function(
      LiveQuestion question,
      int correctOption,
      int? selectedOption,
      List<QuizPlayer> players,
      List<LeaderboardEntry> liveScores,
    )?
    perQuestionEnded,
    TResult Function(
      List<LiveQuestion> questions,
      int currentIndex,
      Map<int, int> answers,
      int timeLeft,
    )?
    totalTimerRound,
    TResult Function(List<LeaderboardEntry> leaderboard, String? quizTitle)?
    ended,
    TResult Function(String? message)? alreadyAttempted,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(QuizPlayConnecting value) connecting,
    required TResult Function(QuizPlayLobby value) lobby,
    required TResult Function(QuizPlayPerQuestionRound value) perQuestionRound,
    required TResult Function(QuizPlayPerQuestionEnded value) perQuestionEnded,
    required TResult Function(QuizPlayTotalTimerRound value) totalTimerRound,
    required TResult Function(QuizPlayEnded value) ended,
    required TResult Function(QuizPlayAlreadyAttempted value) alreadyAttempted,
    required TResult Function(QuizPlayError value) error,
  }) {
    return error(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(QuizPlayConnecting value)? connecting,
    TResult? Function(QuizPlayLobby value)? lobby,
    TResult? Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult? Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult? Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult? Function(QuizPlayEnded value)? ended,
    TResult? Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult? Function(QuizPlayError value)? error,
  }) {
    return error?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(QuizPlayConnecting value)? connecting,
    TResult Function(QuizPlayLobby value)? lobby,
    TResult Function(QuizPlayPerQuestionRound value)? perQuestionRound,
    TResult Function(QuizPlayPerQuestionEnded value)? perQuestionEnded,
    TResult Function(QuizPlayTotalTimerRound value)? totalTimerRound,
    TResult Function(QuizPlayEnded value)? ended,
    TResult Function(QuizPlayAlreadyAttempted value)? alreadyAttempted,
    TResult Function(QuizPlayError value)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(this);
    }
    return orElse();
  }
}

abstract class QuizPlayError implements QuizPlayState {
  const factory QuizPlayError(final String message) = _$QuizPlayErrorImpl;

  String get message;

  /// Create a copy of QuizPlayState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizPlayErrorImplCopyWith<_$QuizPlayErrorImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
