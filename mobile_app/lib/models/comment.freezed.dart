// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'comment.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

AuthorSnapshot _$AuthorSnapshotFromJson(Map<String, dynamic> json) {
  return _AuthorSnapshot.fromJson(json);
}

/// @nodoc
mixin _$AuthorSnapshot {
  String get userId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get username => throw _privateConstructorUsedError;
  String? get avatar => throw _privateConstructorUsedError;

  /// Serializes this AuthorSnapshot to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AuthorSnapshot
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AuthorSnapshotCopyWith<AuthorSnapshot> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AuthorSnapshotCopyWith<$Res> {
  factory $AuthorSnapshotCopyWith(
    AuthorSnapshot value,
    $Res Function(AuthorSnapshot) then,
  ) = _$AuthorSnapshotCopyWithImpl<$Res, AuthorSnapshot>;
  @useResult
  $Res call({String userId, String name, String username, String? avatar});
}

/// @nodoc
class _$AuthorSnapshotCopyWithImpl<$Res, $Val extends AuthorSnapshot>
    implements $AuthorSnapshotCopyWith<$Res> {
  _$AuthorSnapshotCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AuthorSnapshot
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? name = null,
    Object? username = null,
    Object? avatar = freezed,
  }) {
    return _then(
      _value.copyWith(
            userId:
                null == userId
                    ? _value.userId
                    : userId // ignore: cast_nullable_to_non_nullable
                        as String,
            name:
                null == name
                    ? _value.name
                    : name // ignore: cast_nullable_to_non_nullable
                        as String,
            username:
                null == username
                    ? _value.username
                    : username // ignore: cast_nullable_to_non_nullable
                        as String,
            avatar:
                freezed == avatar
                    ? _value.avatar
                    : avatar // ignore: cast_nullable_to_non_nullable
                        as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$AuthorSnapshotImplCopyWith<$Res>
    implements $AuthorSnapshotCopyWith<$Res> {
  factory _$$AuthorSnapshotImplCopyWith(
    _$AuthorSnapshotImpl value,
    $Res Function(_$AuthorSnapshotImpl) then,
  ) = __$$AuthorSnapshotImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String userId, String name, String username, String? avatar});
}

/// @nodoc
class __$$AuthorSnapshotImplCopyWithImpl<$Res>
    extends _$AuthorSnapshotCopyWithImpl<$Res, _$AuthorSnapshotImpl>
    implements _$$AuthorSnapshotImplCopyWith<$Res> {
  __$$AuthorSnapshotImplCopyWithImpl(
    _$AuthorSnapshotImpl _value,
    $Res Function(_$AuthorSnapshotImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of AuthorSnapshot
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? userId = null,
    Object? name = null,
    Object? username = null,
    Object? avatar = freezed,
  }) {
    return _then(
      _$AuthorSnapshotImpl(
        userId:
            null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                    as String,
        name:
            null == name
                ? _value.name
                : name // ignore: cast_nullable_to_non_nullable
                    as String,
        username:
            null == username
                ? _value.username
                : username // ignore: cast_nullable_to_non_nullable
                    as String,
        avatar:
            freezed == avatar
                ? _value.avatar
                : avatar // ignore: cast_nullable_to_non_nullable
                    as String?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$AuthorSnapshotImpl implements _AuthorSnapshot {
  const _$AuthorSnapshotImpl({
    required this.userId,
    required this.name,
    required this.username,
    this.avatar,
  });

  factory _$AuthorSnapshotImpl.fromJson(Map<String, dynamic> json) =>
      _$$AuthorSnapshotImplFromJson(json);

  @override
  final String userId;
  @override
  final String name;
  @override
  final String username;
  @override
  final String? avatar;

  @override
  String toString() {
    return 'AuthorSnapshot(userId: $userId, name: $name, username: $username, avatar: $avatar)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AuthorSnapshotImpl &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.username, username) ||
                other.username == username) &&
            (identical(other.avatar, avatar) || other.avatar == avatar));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, userId, name, username, avatar);

  /// Create a copy of AuthorSnapshot
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AuthorSnapshotImplCopyWith<_$AuthorSnapshotImpl> get copyWith =>
      __$$AuthorSnapshotImplCopyWithImpl<_$AuthorSnapshotImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$AuthorSnapshotImplToJson(this);
  }
}

abstract class _AuthorSnapshot implements AuthorSnapshot {
  const factory _AuthorSnapshot({
    required final String userId,
    required final String name,
    required final String username,
    final String? avatar,
  }) = _$AuthorSnapshotImpl;

  factory _AuthorSnapshot.fromJson(Map<String, dynamic> json) =
      _$AuthorSnapshotImpl.fromJson;

  @override
  String get userId;
  @override
  String get name;
  @override
  String get username;
  @override
  String? get avatar;

  /// Create a copy of AuthorSnapshot
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AuthorSnapshotImplCopyWith<_$AuthorSnapshotImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Comment _$CommentFromJson(Map<String, dynamic> json) {
  return _Comment.fromJson(json);
}

/// @nodoc
mixin _$Comment {
  String get id => throw _privateConstructorUsedError;
  AuthorSnapshot get author => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  int get likes => throw _privateConstructorUsedError;
  List<String> get likedBy => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;

  /// Serializes this Comment to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Comment
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CommentCopyWith<Comment> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CommentCopyWith<$Res> {
  factory $CommentCopyWith(Comment value, $Res Function(Comment) then) =
      _$CommentCopyWithImpl<$Res, Comment>;
  @useResult
  $Res call({
    String id,
    AuthorSnapshot author,
    String content,
    int likes,
    List<String> likedBy,
    String createdAt,
  });

  $AuthorSnapshotCopyWith<$Res> get author;
}

/// @nodoc
class _$CommentCopyWithImpl<$Res, $Val extends Comment>
    implements $CommentCopyWith<$Res> {
  _$CommentCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Comment
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? author = null,
    Object? content = null,
    Object? likes = null,
    Object? likedBy = null,
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
            content:
                null == content
                    ? _value.content
                    : content // ignore: cast_nullable_to_non_nullable
                        as String,
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
            createdAt:
                null == createdAt
                    ? _value.createdAt
                    : createdAt // ignore: cast_nullable_to_non_nullable
                        as String,
          )
          as $Val,
    );
  }

  /// Create a copy of Comment
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $AuthorSnapshotCopyWith<$Res> get author {
    return $AuthorSnapshotCopyWith<$Res>(_value.author, (value) {
      return _then(_value.copyWith(author: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CommentImplCopyWith<$Res> implements $CommentCopyWith<$Res> {
  factory _$$CommentImplCopyWith(
    _$CommentImpl value,
    $Res Function(_$CommentImpl) then,
  ) = __$$CommentImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    AuthorSnapshot author,
    String content,
    int likes,
    List<String> likedBy,
    String createdAt,
  });

  @override
  $AuthorSnapshotCopyWith<$Res> get author;
}

/// @nodoc
class __$$CommentImplCopyWithImpl<$Res>
    extends _$CommentCopyWithImpl<$Res, _$CommentImpl>
    implements _$$CommentImplCopyWith<$Res> {
  __$$CommentImplCopyWithImpl(
    _$CommentImpl _value,
    $Res Function(_$CommentImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of Comment
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? author = null,
    Object? content = null,
    Object? likes = null,
    Object? likedBy = null,
    Object? createdAt = null,
  }) {
    return _then(
      _$CommentImpl(
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
        content:
            null == content
                ? _value.content
                : content // ignore: cast_nullable_to_non_nullable
                    as String,
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
class _$CommentImpl implements _Comment {
  const _$CommentImpl({
    required this.id,
    required this.author,
    required this.content,
    this.likes = 0,
    final List<String> likedBy = const <String>[],
    required this.createdAt,
  }) : _likedBy = likedBy;

  factory _$CommentImpl.fromJson(Map<String, dynamic> json) =>
      _$$CommentImplFromJson(json);

  @override
  final String id;
  @override
  final AuthorSnapshot author;
  @override
  final String content;
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
  final String createdAt;

  @override
  String toString() {
    return 'Comment(id: $id, author: $author, content: $content, likes: $likes, likedBy: $likedBy, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CommentImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.author, author) || other.author == author) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.likes, likes) || other.likes == likes) &&
            const DeepCollectionEquality().equals(other._likedBy, _likedBy) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    author,
    content,
    likes,
    const DeepCollectionEquality().hash(_likedBy),
    createdAt,
  );

  /// Create a copy of Comment
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CommentImplCopyWith<_$CommentImpl> get copyWith =>
      __$$CommentImplCopyWithImpl<_$CommentImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CommentImplToJson(this);
  }
}

abstract class _Comment implements Comment {
  const factory _Comment({
    required final String id,
    required final AuthorSnapshot author,
    required final String content,
    final int likes,
    final List<String> likedBy,
    required final String createdAt,
  }) = _$CommentImpl;

  factory _Comment.fromJson(Map<String, dynamic> json) = _$CommentImpl.fromJson;

  @override
  String get id;
  @override
  AuthorSnapshot get author;
  @override
  String get content;
  @override
  int get likes;
  @override
  List<String> get likedBy;
  @override
  String get createdAt;

  /// Create a copy of Comment
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CommentImplCopyWith<_$CommentImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
