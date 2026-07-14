// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'quiz.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

Quiz _$QuizFromJson(Map<String, dynamic> json) {
  return _Quiz.fromJson(json);
}

/// @nodoc
mixin _$Quiz {
  String get id => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  int get questionCount => throw _privateConstructorUsedError;
  String get selectionMode => throw _privateConstructorUsedError;
  List<String> get questions => throw _privateConstructorUsedError;
  String? get topic => throw _privateConstructorUsedError;
  String? get subTopic => throw _privateConstructorUsedError;
  String? get image => throw _privateConstructorUsedError;
  String get timezone => throw _privateConstructorUsedError;
  String get scheduledAt => throw _privateConstructorUsedError;
  int get durationMinutes => throw _privateConstructorUsedError;
  int? get timeLimitPerQuestion => throw _privateConstructorUsedError;
  String get scheduleType => throw _privateConstructorUsedError;
  String get participation => throw _privateConstructorUsedError;
  List<String> get allowedUsers => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  String? get startedAt => throw _privateConstructorUsedError;
  String? get endedAt => throw _privateConstructorUsedError;
  bool get postCreated => throw _privateConstructorUsedError;
  String get createdBy => throw _privateConstructorUsedError;

  /// Serializes this Quiz to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Quiz
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $QuizCopyWith<Quiz> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $QuizCopyWith<$Res> {
  factory $QuizCopyWith(Quiz value, $Res Function(Quiz) then) =
      _$QuizCopyWithImpl<$Res, Quiz>;
  @useResult
  $Res call({
    String id,
    String title,
    String description,
    int questionCount,
    String selectionMode,
    List<String> questions,
    String? topic,
    String? subTopic,
    String? image,
    String timezone,
    String scheduledAt,
    int durationMinutes,
    int? timeLimitPerQuestion,
    String scheduleType,
    String participation,
    List<String> allowedUsers,
    String status,
    String? startedAt,
    String? endedAt,
    bool postCreated,
    String createdBy,
  });
}

/// @nodoc
class _$QuizCopyWithImpl<$Res, $Val extends Quiz>
    implements $QuizCopyWith<$Res> {
  _$QuizCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Quiz
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = null,
    Object? questionCount = null,
    Object? selectionMode = null,
    Object? questions = null,
    Object? topic = freezed,
    Object? subTopic = freezed,
    Object? image = freezed,
    Object? timezone = null,
    Object? scheduledAt = null,
    Object? durationMinutes = null,
    Object? timeLimitPerQuestion = freezed,
    Object? scheduleType = null,
    Object? participation = null,
    Object? allowedUsers = null,
    Object? status = null,
    Object? startedAt = freezed,
    Object? endedAt = freezed,
    Object? postCreated = null,
    Object? createdBy = null,
  }) {
    return _then(
      _value.copyWith(
            id:
                null == id
                    ? _value.id
                    : id // ignore: cast_nullable_to_non_nullable
                        as String,
            title:
                null == title
                    ? _value.title
                    : title // ignore: cast_nullable_to_non_nullable
                        as String,
            description:
                null == description
                    ? _value.description
                    : description // ignore: cast_nullable_to_non_nullable
                        as String,
            questionCount:
                null == questionCount
                    ? _value.questionCount
                    : questionCount // ignore: cast_nullable_to_non_nullable
                        as int,
            selectionMode:
                null == selectionMode
                    ? _value.selectionMode
                    : selectionMode // ignore: cast_nullable_to_non_nullable
                        as String,
            questions:
                null == questions
                    ? _value.questions
                    : questions // ignore: cast_nullable_to_non_nullable
                        as List<String>,
            topic:
                freezed == topic
                    ? _value.topic
                    : topic // ignore: cast_nullable_to_non_nullable
                        as String?,
            subTopic:
                freezed == subTopic
                    ? _value.subTopic
                    : subTopic // ignore: cast_nullable_to_non_nullable
                        as String?,
            image:
                freezed == image
                    ? _value.image
                    : image // ignore: cast_nullable_to_non_nullable
                        as String?,
            timezone:
                null == timezone
                    ? _value.timezone
                    : timezone // ignore: cast_nullable_to_non_nullable
                        as String,
            scheduledAt:
                null == scheduledAt
                    ? _value.scheduledAt
                    : scheduledAt // ignore: cast_nullable_to_non_nullable
                        as String,
            durationMinutes:
                null == durationMinutes
                    ? _value.durationMinutes
                    : durationMinutes // ignore: cast_nullable_to_non_nullable
                        as int,
            timeLimitPerQuestion:
                freezed == timeLimitPerQuestion
                    ? _value.timeLimitPerQuestion
                    : timeLimitPerQuestion // ignore: cast_nullable_to_non_nullable
                        as int?,
            scheduleType:
                null == scheduleType
                    ? _value.scheduleType
                    : scheduleType // ignore: cast_nullable_to_non_nullable
                        as String,
            participation:
                null == participation
                    ? _value.participation
                    : participation // ignore: cast_nullable_to_non_nullable
                        as String,
            allowedUsers:
                null == allowedUsers
                    ? _value.allowedUsers
                    : allowedUsers // ignore: cast_nullable_to_non_nullable
                        as List<String>,
            status:
                null == status
                    ? _value.status
                    : status // ignore: cast_nullable_to_non_nullable
                        as String,
            startedAt:
                freezed == startedAt
                    ? _value.startedAt
                    : startedAt // ignore: cast_nullable_to_non_nullable
                        as String?,
            endedAt:
                freezed == endedAt
                    ? _value.endedAt
                    : endedAt // ignore: cast_nullable_to_non_nullable
                        as String?,
            postCreated:
                null == postCreated
                    ? _value.postCreated
                    : postCreated // ignore: cast_nullable_to_non_nullable
                        as bool,
            createdBy:
                null == createdBy
                    ? _value.createdBy
                    : createdBy // ignore: cast_nullable_to_non_nullable
                        as String,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$QuizImplCopyWith<$Res> implements $QuizCopyWith<$Res> {
  factory _$$QuizImplCopyWith(
    _$QuizImpl value,
    $Res Function(_$QuizImpl) then,
  ) = __$$QuizImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    String title,
    String description,
    int questionCount,
    String selectionMode,
    List<String> questions,
    String? topic,
    String? subTopic,
    String? image,
    String timezone,
    String scheduledAt,
    int durationMinutes,
    int? timeLimitPerQuestion,
    String scheduleType,
    String participation,
    List<String> allowedUsers,
    String status,
    String? startedAt,
    String? endedAt,
    bool postCreated,
    String createdBy,
  });
}

/// @nodoc
class __$$QuizImplCopyWithImpl<$Res>
    extends _$QuizCopyWithImpl<$Res, _$QuizImpl>
    implements _$$QuizImplCopyWith<$Res> {
  __$$QuizImplCopyWithImpl(_$QuizImpl _value, $Res Function(_$QuizImpl) _then)
    : super(_value, _then);

  /// Create a copy of Quiz
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = null,
    Object? questionCount = null,
    Object? selectionMode = null,
    Object? questions = null,
    Object? topic = freezed,
    Object? subTopic = freezed,
    Object? image = freezed,
    Object? timezone = null,
    Object? scheduledAt = null,
    Object? durationMinutes = null,
    Object? timeLimitPerQuestion = freezed,
    Object? scheduleType = null,
    Object? participation = null,
    Object? allowedUsers = null,
    Object? status = null,
    Object? startedAt = freezed,
    Object? endedAt = freezed,
    Object? postCreated = null,
    Object? createdBy = null,
  }) {
    return _then(
      _$QuizImpl(
        id:
            null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                    as String,
        title:
            null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                    as String,
        description:
            null == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                    as String,
        questionCount:
            null == questionCount
                ? _value.questionCount
                : questionCount // ignore: cast_nullable_to_non_nullable
                    as int,
        selectionMode:
            null == selectionMode
                ? _value.selectionMode
                : selectionMode // ignore: cast_nullable_to_non_nullable
                    as String,
        questions:
            null == questions
                ? _value._questions
                : questions // ignore: cast_nullable_to_non_nullable
                    as List<String>,
        topic:
            freezed == topic
                ? _value.topic
                : topic // ignore: cast_nullable_to_non_nullable
                    as String?,
        subTopic:
            freezed == subTopic
                ? _value.subTopic
                : subTopic // ignore: cast_nullable_to_non_nullable
                    as String?,
        image:
            freezed == image
                ? _value.image
                : image // ignore: cast_nullable_to_non_nullable
                    as String?,
        timezone:
            null == timezone
                ? _value.timezone
                : timezone // ignore: cast_nullable_to_non_nullable
                    as String,
        scheduledAt:
            null == scheduledAt
                ? _value.scheduledAt
                : scheduledAt // ignore: cast_nullable_to_non_nullable
                    as String,
        durationMinutes:
            null == durationMinutes
                ? _value.durationMinutes
                : durationMinutes // ignore: cast_nullable_to_non_nullable
                    as int,
        timeLimitPerQuestion:
            freezed == timeLimitPerQuestion
                ? _value.timeLimitPerQuestion
                : timeLimitPerQuestion // ignore: cast_nullable_to_non_nullable
                    as int?,
        scheduleType:
            null == scheduleType
                ? _value.scheduleType
                : scheduleType // ignore: cast_nullable_to_non_nullable
                    as String,
        participation:
            null == participation
                ? _value.participation
                : participation // ignore: cast_nullable_to_non_nullable
                    as String,
        allowedUsers:
            null == allowedUsers
                ? _value._allowedUsers
                : allowedUsers // ignore: cast_nullable_to_non_nullable
                    as List<String>,
        status:
            null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                    as String,
        startedAt:
            freezed == startedAt
                ? _value.startedAt
                : startedAt // ignore: cast_nullable_to_non_nullable
                    as String?,
        endedAt:
            freezed == endedAt
                ? _value.endedAt
                : endedAt // ignore: cast_nullable_to_non_nullable
                    as String?,
        postCreated:
            null == postCreated
                ? _value.postCreated
                : postCreated // ignore: cast_nullable_to_non_nullable
                    as bool,
        createdBy:
            null == createdBy
                ? _value.createdBy
                : createdBy // ignore: cast_nullable_to_non_nullable
                    as String,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$QuizImpl implements _Quiz {
  const _$QuizImpl({
    required this.id,
    required this.title,
    this.description = '',
    required this.questionCount,
    this.selectionMode = 'random',
    final List<String> questions = const <String>[],
    this.topic,
    this.subTopic,
    this.image,
    this.timezone = 'Asia/Kolkata',
    required this.scheduledAt,
    this.durationMinutes = 30,
    this.timeLimitPerQuestion,
    this.scheduleType = 'once',
    this.participation = 'public',
    final List<String> allowedUsers = const <String>[],
    this.status = 'draft',
    this.startedAt,
    this.endedAt,
    this.postCreated = false,
    required this.createdBy,
  }) : _questions = questions,
       _allowedUsers = allowedUsers;

  factory _$QuizImpl.fromJson(Map<String, dynamic> json) =>
      _$$QuizImplFromJson(json);

  @override
  final String id;
  @override
  final String title;
  @override
  @JsonKey()
  final String description;
  @override
  final int questionCount;
  @override
  @JsonKey()
  final String selectionMode;
  final List<String> _questions;
  @override
  @JsonKey()
  List<String> get questions {
    if (_questions is EqualUnmodifiableListView) return _questions;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_questions);
  }

  @override
  final String? topic;
  @override
  final String? subTopic;
  @override
  final String? image;
  @override
  @JsonKey()
  final String timezone;
  @override
  final String scheduledAt;
  @override
  @JsonKey()
  final int durationMinutes;
  @override
  final int? timeLimitPerQuestion;
  @override
  @JsonKey()
  final String scheduleType;
  @override
  @JsonKey()
  final String participation;
  final List<String> _allowedUsers;
  @override
  @JsonKey()
  List<String> get allowedUsers {
    if (_allowedUsers is EqualUnmodifiableListView) return _allowedUsers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_allowedUsers);
  }

  @override
  @JsonKey()
  final String status;
  @override
  final String? startedAt;
  @override
  final String? endedAt;
  @override
  @JsonKey()
  final bool postCreated;
  @override
  final String createdBy;

  @override
  String toString() {
    return 'Quiz(id: $id, title: $title, description: $description, questionCount: $questionCount, selectionMode: $selectionMode, questions: $questions, topic: $topic, subTopic: $subTopic, image: $image, timezone: $timezone, scheduledAt: $scheduledAt, durationMinutes: $durationMinutes, timeLimitPerQuestion: $timeLimitPerQuestion, scheduleType: $scheduleType, participation: $participation, allowedUsers: $allowedUsers, status: $status, startedAt: $startedAt, endedAt: $endedAt, postCreated: $postCreated, createdBy: $createdBy)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$QuizImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.questionCount, questionCount) ||
                other.questionCount == questionCount) &&
            (identical(other.selectionMode, selectionMode) ||
                other.selectionMode == selectionMode) &&
            const DeepCollectionEquality().equals(
              other._questions,
              _questions,
            ) &&
            (identical(other.topic, topic) || other.topic == topic) &&
            (identical(other.subTopic, subTopic) ||
                other.subTopic == subTopic) &&
            (identical(other.image, image) || other.image == image) &&
            (identical(other.timezone, timezone) ||
                other.timezone == timezone) &&
            (identical(other.scheduledAt, scheduledAt) ||
                other.scheduledAt == scheduledAt) &&
            (identical(other.durationMinutes, durationMinutes) ||
                other.durationMinutes == durationMinutes) &&
            (identical(other.timeLimitPerQuestion, timeLimitPerQuestion) ||
                other.timeLimitPerQuestion == timeLimitPerQuestion) &&
            (identical(other.scheduleType, scheduleType) ||
                other.scheduleType == scheduleType) &&
            (identical(other.participation, participation) ||
                other.participation == participation) &&
            const DeepCollectionEquality().equals(
              other._allowedUsers,
              _allowedUsers,
            ) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.startedAt, startedAt) ||
                other.startedAt == startedAt) &&
            (identical(other.endedAt, endedAt) || other.endedAt == endedAt) &&
            (identical(other.postCreated, postCreated) ||
                other.postCreated == postCreated) &&
            (identical(other.createdBy, createdBy) ||
                other.createdBy == createdBy));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
    runtimeType,
    id,
    title,
    description,
    questionCount,
    selectionMode,
    const DeepCollectionEquality().hash(_questions),
    topic,
    subTopic,
    image,
    timezone,
    scheduledAt,
    durationMinutes,
    timeLimitPerQuestion,
    scheduleType,
    participation,
    const DeepCollectionEquality().hash(_allowedUsers),
    status,
    startedAt,
    endedAt,
    postCreated,
    createdBy,
  ]);

  /// Create a copy of Quiz
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$QuizImplCopyWith<_$QuizImpl> get copyWith =>
      __$$QuizImplCopyWithImpl<_$QuizImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$QuizImplToJson(this);
  }
}

abstract class _Quiz implements Quiz {
  const factory _Quiz({
    required final String id,
    required final String title,
    final String description,
    required final int questionCount,
    final String selectionMode,
    final List<String> questions,
    final String? topic,
    final String? subTopic,
    final String? image,
    final String timezone,
    required final String scheduledAt,
    final int durationMinutes,
    final int? timeLimitPerQuestion,
    final String scheduleType,
    final String participation,
    final List<String> allowedUsers,
    final String status,
    final String? startedAt,
    final String? endedAt,
    final bool postCreated,
    required final String createdBy,
  }) = _$QuizImpl;

  factory _Quiz.fromJson(Map<String, dynamic> json) = _$QuizImpl.fromJson;

  @override
  String get id;
  @override
  String get title;
  @override
  String get description;
  @override
  int get questionCount;
  @override
  String get selectionMode;
  @override
  List<String> get questions;
  @override
  String? get topic;
  @override
  String? get subTopic;
  @override
  String? get image;
  @override
  String get timezone;
  @override
  String get scheduledAt;
  @override
  int get durationMinutes;
  @override
  int? get timeLimitPerQuestion;
  @override
  String get scheduleType;
  @override
  String get participation;
  @override
  List<String> get allowedUsers;
  @override
  String get status;
  @override
  String? get startedAt;
  @override
  String? get endedAt;
  @override
  bool get postCreated;
  @override
  String get createdBy;

  /// Create a copy of Quiz
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$QuizImplCopyWith<_$QuizImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
