// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'comment.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$AuthorSnapshotImpl _$$AuthorSnapshotImplFromJson(Map<String, dynamic> json) =>
    _$AuthorSnapshotImpl(
      userId: json['userId'] as String,
      name: json['name'] as String,
      username: json['username'] as String,
      avatar: json['avatar'] as String?,
    );

Map<String, dynamic> _$$AuthorSnapshotImplToJson(
  _$AuthorSnapshotImpl instance,
) => <String, dynamic>{
  'userId': instance.userId,
  'name': instance.name,
  'username': instance.username,
  'avatar': instance.avatar,
};

_$CommentImpl _$$CommentImplFromJson(Map<String, dynamic> json) =>
    _$CommentImpl(
      id: json['id'] as String,
      author: AuthorSnapshot.fromJson(json['author'] as Map<String, dynamic>),
      content: json['content'] as String,
      likes: (json['likes'] as num?)?.toInt() ?? 0,
      likedBy:
          (json['likedBy'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$$CommentImplToJson(_$CommentImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'author': instance.author,
      'content': instance.content,
      'likes': instance.likes,
      'likedBy': instance.likedBy,
      'createdAt': instance.createdAt,
    };
