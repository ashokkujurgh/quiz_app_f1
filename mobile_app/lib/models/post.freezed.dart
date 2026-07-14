// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'post.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

Post _$PostFromJson(Map<String, dynamic> json) {
  return _Post.fromJson(json);
}

/// @nodoc
mixin _$Post {
  String get id => throw _privateConstructorUsedError;
  AuthorSnapshot get author => throw _privateConstructorUsedError;
  String get userType => throw _privateConstructorUsedError;
  String? get title => throw _privateConstructorUsedError;
  String? get slug => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  String? get image => throw _privateConstructorUsedError;
  List<String> get images => throw _privateConstructorUsedError;
  String get topic => throw _privateConstructorUsedError;
  String? get subTopic => throw _privateConstructorUsedError;
  int get likes => throw _privateConstructorUsedError;
  List<String> get likedBy => throw _privateConstructorUsedError;
  int get shares => throw _privateConstructorUsedError;
  List<String> get savedBy => throw _privateConstructorUsedError;
  List<Comment> get comments => throw _privateConstructorUsedError;
  int get commentsCount => throw _privateConstructorUsedError;
  QuizResult? get quizResult => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  bool get isAiImage => throw _privateConstructorUsedError;
  String get approvalStatus => throw _privateConstructorUsedError;
  bool get liked => throw _privateConstructorUsedError;
  bool get saved => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;

  /// Serializes this Post to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Post
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PostCopyWith<Post> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PostCopyWith<$Res> {
  factory $PostCopyWith(Post value, $Res Function(Post) then) =
      _$PostCopyWithImpl<$Res, Post>;
  @useResult
  $Res call({
    String id,
    AuthorSnapshot author,
    String userType,
    String? title,
    String? slug,
    String content,
    String? image,
    List<String> images,
    String topic,
    String? subTopic,
    int likes,
    List<String> likedBy,
    int shares,
    List<String> savedBy,
    List<Comment> comments,
    int commentsCount,
    QuizResult? quizResult,
    bool isActive,
    bool isAiImage,
    String approvalStatus,
    bool liked,
    bool saved,
    String createdAt,
  });

  $AuthorSnapshotCopyWith<$Res> get author;
  $QuizResultCopyWith<$Res>? get quizResult;
}

/// @nodoc
class _$PostCopyWithImpl<$Res, $Val extends Post>
    implements $PostCopyWith<$Res> {
  _$PostCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Post
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? author = null,
    Object? userType = null,
    Object? title = freezed,
    Object? slug = freezed,
    Object? content = null,
    Object? image = freezed,
    Object? images = null,
    Object? topic = null,
    Object? subTopic = freezed,
    Object? likes = null,
    Object? likedBy = null,
    Object? shares = null,
    Object? savedBy = null,
    Object? comments = null,
    Object? commentsCount = null,
    Object? quizResult = freezed,
    Object? isActive = null,
    Object? isAiImage = null,
    Object? approvalStatus = null,
    Object? liked = null,
    Object? saved = null,
    Object? createdAt = null,
  }) {
    return _then(
      _value.copyWith(
            id:
                null == id
                    ? _value.id
                    : id // ignore: cast_nullable_to_non_nullable
                        as String,
            author:
                null == author
                    ? _value.author
                    : author // ignore: cast_nullable_to_non_nullable
                        as AuthorSnapshot,
            userType:
                null == userType
                    ? _value.userType
                    : userType // ignore: cast_nullable_to_non_nullable
                        as String,
            title:
                freezed == title
                    ? _value.title
                    : title // ignore: cast_nullable_to_non_nullable
                        as String?,
            slug:
                freezed == slug
                    ? _value.slug
                    : slug // ignore: cast_nullable_to_non_nullable
                        as String?,
            content:
                null == content
                    ? _value.content
                    : content // ignore: cast_nullable_to_non_nullable
                        as String,
            image:
                freezed == image
                    ? _value.image
                    : image // ignore: cast_nullable_to_non_nullable
                        as String?,
            images:
                null == images
                    ? _value.images
                    : images // ignore: cast_nullable_to_non_nullable
                        as List<String>,
            topic:
                null == topic
                    ? _value.topic
                    : topic // ignore: cast_nullable_to_non_nullable
                        as String,
            subTopic:
                freezed == subTopic
                    ? _value.subTopic
                    : subTopic // ignore: cast_nullable_to_non_nullable
                        as String?,
            likes:
                null == likes
                    ? _value.likes
                    : likes // ignore: cast_nullable_to_non_nullable
                        as int,
            likedBy:
                null == likedBy
                    ? _value.likedBy
                    : likedBy // ignore: cast_nullable_to_non_nullable
                        as List<String>,
            shares:
                null == shares
                    ? _value.shares
                    : shares // ignore: cast_nullable_to_non_nullable
                        as int,
            savedBy:
                null == savedBy
                    ? _value.savedBy
                    : savedBy // ignore: cast_nullable_to_non_nullable
                        as List<String>,
            comments:
                null == comments
                    ? _value.comments
                    : comments // ignore: cast_nullable_to_non_nullable
                        as List<Comment>,
            commentsCount:
                null == commentsCount
                    ? _value.commentsCount
                    : commentsCount // ignore: cast_nullable_to_non_nullable
                        as int,
            quizResult:
                freezed == quizResult
                    ? _value.quizResult
                    : quizResult // ignore: cast_nullable_to_non_nullable
                        as QuizResult?,
            isActive:
                null == isActive
                    ? _value.isActive
                    : isActive // ignore: cast_nullable_to_non_nullable
                        as bool,
            isAiImage:
                null == isAiImage
                    ? _value.isAiImage
                    : isAiImage // ignore: cast_nullable_to_non_nullable
                        as bool,
            approvalStatus:
                null == approvalStatus
                    ? _value.approvalStatus
                    : approvalStatus // ignore: cast_nullable_to_non_nullable
                        as String,
            liked:
                null == liked
                    ? _value.liked
                    : liked // ignore: cast_nullable_to_non_nullable
                        as bool,
            saved:
                null == saved
                    ? _value.saved
                    : saved // ignore: cast_nullable_to_non_nullable
                        as bool,
            createdAt:
                null == createdAt
                    ? _value.createdAt
                    : createdAt // ignore: cast_nullable_to_non_nullable
                        as String,
          )
          as $Val,
    );
  }

  /// Create a copy of Post
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AuthorSnapshotCopyWith<$Res> get author {
    return $AuthorSnapshotCopyWith<$Res>(_value.author, (value) {
      return _then(_value.copyWith(author: value) as $Val);
    });
  }

  /// Create a copy of Post
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $QuizResultCopyWith<$Res>? get quizResult {
    if (_value.quizResult == null) {
      return null;
    }

    return $QuizResultCopyWith<$Res>(_value.quizResult!, (value) {
      return _then(_value.copyWith(quizResult: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$PostImplCopyWith<$Res> implements $PostCopyWith<$Res> {
  factory _$$PostImplCopyWith(
    _$PostImpl value,
    $Res Function(_$PostImpl) then,
  ) = __$$PostImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    AuthorSnapshot author,
    String userType,
    String? title,
    String? slug,
    String content,
    String? image,
    List<String> images,
    String topic,
    String? subTopic,
    int likes,
    List<String> likedBy,
    int shares,
    List<String> savedBy,
    List<Comment> comments,
    int commentsCount,
    QuizResult? quizResult,
    bool isActive,
    bool isAiImage,
    String approvalStatus,
    bool liked,
    bool saved,
    String createdAt,
  });

  @override
  $AuthorSnapshotCopyWith<$Res> get author;
  @override
  $QuizResultCopyWith<$Res>? get quizResult;
}

/// @nodoc
class __$$PostImplCopyWithImpl<$Res>
    extends _$PostCopyWithImpl<$Res, _$PostImpl>
    implements _$$PostImplCopyWith<$Res> {
  __$$PostImplCopyWithImpl(_$PostImpl _value, $Res Function(_$PostImpl) _then)
    : super(_value, _then);

  /// Create a copy of Post
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? author = null,
    Object? userType = null,
    Object? title = freezed,
    Object? slug = freezed,
    Object? content = null,
    Object? image = freezed,
    Object? images = null,
    Object? topic = null,
    Object? subTopic = freezed,
    Object? likes = null,
    Object? likedBy = null,
    Object? shares = null,
    Object? savedBy = null,
    Object? comments = null,
    Object? commentsCount = null,
    Object? quizResult = freezed,
    Object? isActive = null,
    Object? isAiImage = null,
    Object? approvalStatus = null,
    Object? liked = null,
    Object? saved = null,
    Object? createdAt = null,
  }) {
    return _then(
      _$PostImpl(
        id:
            null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                    as String,
        author:
            null == author
                ? _value.author
                : author // ignore: cast_nullable_to_non_nullable
                    as AuthorSnapshot,
        userType:
            null == userType
                ? _value.userType
                : userType // ignore: cast_nullable_to_non_nullable
                    as String,
        title:
            freezed == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                    as String?,
        slug:
            freezed == slug
                ? _value.slug
                : slug // ignore: cast_nullable_to_non_nullable
                    as String?,
        content:
            null == content
                ? _value.content
                : content // ignore: cast_nullable_to_non_nullable
                    as String,
        image:
            freezed == image
                ? _value.image
                : image // ignore: cast_nullable_to_non_nullable
                    as String?,
        images:
            null == images
                ? _value._images
                : images // ignore: cast_nullable_to_non_nullable
                    as List<String>,
        topic:
            null == topic
                ? _value.topic
                : topic // ignore: cast_nullable_to_non_nullable
                    as String,
        subTopic:
            freezed == subTopic
                ? _value.subTopic
                : subTopic // ignore: cast_nullable_to_non_nullable
                    as String?,
        likes:
            null == likes
                ? _value.likes
                : likes // ignore: cast_nullable_to_non_nullable
                    as int,
        likedBy:
            null == likedBy
                ? _value._likedBy
                : likedBy // ignore: cast_nullable_to_non_nullable
                    as List<String>,
        shares:
            null == shares
                ? _value.shares
                : shares // ignore: cast_nullable_to_non_nullable
                    as int,
        savedBy:
            null == savedBy
                ? _value._savedBy
                : savedBy // ignore: cast_nullable_to_non_nullable
                    as List<String>,
        comments:
            null == comments
                ? _value._comments
                : comments // ignore: cast_nullable_to_non_nullable
                    as List<Comment>,
        commentsCount:
            null == commentsCount
                ? _value.commentsCount
                : commentsCount // ignore: cast_nullable_to_non_nullable
                    as int,
        quizResult:
            freezed == quizResult
                ? _value.quizResult
                : quizResult // ignore: cast_nullable_to_non_nullable
                    as QuizResult?,
        isActive:
            null == isActive
                ? _value.isActive
                : isActive // ignore: cast_nullable_to_non_nullable
                    as bool,
        isAiImage:
            null == isAiImage
                ? _value.isAiImage
                : isAiImage // ignore: cast_nullable_to_non_nullable
                    as bool,
        approvalStatus:
            null == approvalStatus
                ? _value.approvalStatus
                : approvalStatus // ignore: cast_nullable_to_non_nullable
                    as String,
        liked:
            null == liked
                ? _value.liked
                : liked // ignore: cast_nullable_to_non_nullable
                    as bool,
        saved:
            null == saved
                ? _value.saved
                : saved // ignore: cast_nullable_to_non_nullable
                    as bool,
        createdAt:
            null == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                    as String,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$PostImpl implements _Post {
  const _$PostImpl({
    required this.id,
    required this.author,
    this.userType = 'user',
    this.title,
    this.slug,
    required this.content,
    this.image,
    final List<String> images = const <String>[],
    required this.topic,
    this.subTopic,
    this.likes = 0,
    final List<String> likedBy = const <String>[],
    this.shares = 0,
    final List<String> savedBy = const <String>[],
    final List<Comment> comments = const <Comment>[],
    this.commentsCount = 0,
    this.quizResult,
    this.isActive = true,
    this.isAiImage = false,
    this.approvalStatus = 'approved',
    this.liked = false,
    this.saved = false,
    required this.createdAt,
  }) : _images = images,
       _likedBy = likedBy,
       _savedBy = savedBy,
       _comments = comments;

  factory _$PostImpl.fromJson(Map<String, dynamic> json) =>
      _$$PostImplFromJson(json);

  @override
  final String id;
  @override
  final AuthorSnapshot author;
  @override
  @JsonKey()
  final String userType;
  @override
  final String? title;
  @override
  final String? slug;
  @override
  final String content;
  @override
  final String? image;
  final List<String> _images;
  @override
  @JsonKey()
  List<String> get images {
    if (_images is EqualUnmodifiableListView) return _images;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_images);
  }

  @override
  final String topic;
  @override
  final String? subTopic;
  @override
  @JsonKey()
  final int likes;
  final List<String> _likedBy;
  @override
  @JsonKey()
  List<String> get likedBy {
    if (_likedBy is EqualUnmodifiableListView) return _likedBy;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_likedBy);
  }

  @override
  @JsonKey()
  final int shares;
  final List<String> _savedBy;
  @override
  @JsonKey()
  List<String> get savedBy {
    if (_savedBy is EqualUnmodifiableListView) return _savedBy;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_savedBy);
  }

  final List<Comment> _comments;
  @override
  @JsonKey()
  List<Comment> get comments {
    if (_comments is EqualUnmodifiableListView) return _comments;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_comments);
  }

  @override
  @JsonKey()
  final int commentsCount;
  @override
  final QuizResult? quizResult;
  @override
  @JsonKey()
  final bool isActive;
  @override
  @JsonKey()
  final bool isAiImage;
  @override
  @JsonKey()
  final String approvalStatus;
  @override
  @JsonKey()
  final bool liked;
  @override
  @JsonKey()
  final bool saved;
  @override
  final String createdAt;

  @override
  String toString() {
    return 'Post(id: $id, author: $author, userType: $userType, title: $title, slug: $slug, content: $content, image: $image, images: $images, topic: $topic, subTopic: $subTopic, likes: $likes, likedBy: $likedBy, shares: $shares, savedBy: $savedBy, comments: $comments, commentsCount: $commentsCount, quizResult: $quizResult, isActive: $isActive, isAiImage: $isAiImage, approvalStatus: $approvalStatus, liked: $liked, saved: $saved, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PostImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.author, author) || other.author == author) &&
            (identical(other.userType, userType) ||
                other.userType == userType) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.slug, slug) || other.slug == slug) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.image, image) || other.image == image) &&
            const DeepCollectionEquality().equals(other._images, _images) &&
            (identical(other.topic, topic) || other.topic == topic) &&
            (identical(other.subTopic, subTopic) ||
                other.subTopic == subTopic) &&
            (identical(other.likes, likes) || other.likes == likes) &&
            const DeepCollectionEquality().equals(other._likedBy, _likedBy) &&
            (identical(other.shares, shares) || other.shares == shares) &&
            const DeepCollectionEquality().equals(other._savedBy, _savedBy) &&
            const DeepCollectionEquality().equals(other._comments, _comments) &&
            (identical(other.commentsCount, commentsCount) ||
                other.commentsCount == commentsCount) &&
            (identical(other.quizResult, quizResult) ||
                other.quizResult == quizResult) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.isAiImage, isAiImage) ||
                other.isAiImage == isAiImage) &&
            (identical(other.approvalStatus, approvalStatus) ||
                other.approvalStatus == approvalStatus) &&
            (identical(other.liked, liked) || other.liked == liked) &&
            (identical(other.saved, saved) || other.saved == saved) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
    runtimeType,
    id,
    author,
    userType,
    title,
    slug,
    content,
    image,
    const DeepCollectionEquality().hash(_images),
    topic,
    subTopic,
    likes,
    const DeepCollectionEquality().hash(_likedBy),
    shares,
    const DeepCollectionEquality().hash(_savedBy),
    const DeepCollectionEquality().hash(_comments),
    commentsCount,
    quizResult,
    isActive,
    isAiImage,
    approvalStatus,
    liked,
    saved,
    createdAt,
  ]);

  /// Create a copy of Post
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PostImplCopyWith<_$PostImpl> get copyWith =>
      __$$PostImplCopyWithImpl<_$PostImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PostImplToJson(this);
  }
}

abstract class _Post implements Post {
  const factory _Post({
    required final String id,
    required final AuthorSnapshot author,
    final String userType,
    final String? title,
    final String? slug,
    required final String content,
    final String? image,
    final List<String> images,
    required final String topic,
    final String? subTopic,
    final int likes,
    final List<String> likedBy,
    final int shares,
    final List<String> savedBy,
    final List<Comment> comments,
    final int commentsCount,
    final QuizResult? quizResult,
    final bool isActive,
    final bool isAiImage,
    final String approvalStatus,
    final bool liked,
    final bool saved,
    required final String createdAt,
  }) = _$PostImpl;

  factory _Post.fromJson(Map<String, dynamic> json) = _$PostImpl.fromJson;

  @override
  String get id;
  @override
  AuthorSnapshot get author;
  @override
  String get userType;
  @override
  String? get title;
  @override
  String? get slug;
  @override
  String get content;
  @override
  String? get image;
  @override
  List<String> get images;
  @override
  String get topic;
  @override
  String? get subTopic;
  @override
  int get likes;
  @override
  List<String> get likedBy;
  @override
  int get shares;
  @override
  List<String> get savedBy;
  @override
  List<Comment> get comments;
  @override
  int get commentsCount;
  @override
  QuizResult? get quizResult;
  @override
  bool get isActive;
  @override
  bool get isAiImage;
  @override
  String get approvalStatus;
  @override
  bool get liked;
  @override
  bool get saved;
  @override
  String get createdAt;

  /// Create a copy of Post
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PostImplCopyWith<_$PostImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
