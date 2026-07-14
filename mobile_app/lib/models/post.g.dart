// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'post.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PostImpl _$$PostImplFromJson(Map<String, dynamic> json) => _$PostImpl(
  id: json['id'] as String,
  author: AuthorSnapshot.fromJson(json['author'] as Map<String, dynamic>),
  userType: json['userType'] as String? ?? 'user',
  title: json['title'] as String?,
  slug: json['slug'] as String?,
  content: json['content'] as String,
  image: json['image'] as String?,
  images:
      (json['images'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  topic: json['topic'] as String,
  subTopic: json['subTopic'] as String?,
  likes: (json['likes'] as num?)?.toInt() ?? 0,
  likedBy:
      (json['likedBy'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  shares: (json['shares'] as num?)?.toInt() ?? 0,
  savedBy:
      (json['savedBy'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  comments:
      (json['comments'] as List<dynamic>?)
          ?.map((e) => Comment.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <Comment>[],
  commentsCount: (json['commentsCount'] as num?)?.toInt() ?? 0,
  quizResult:
      json['quizResult'] == null
          ? null
          : QuizResult.fromJson(json['quizResult'] as Map<String, dynamic>),
  isActive: json['isActive'] as bool? ?? true,
  isAiImage: json['isAiImage'] as bool? ?? false,
  approvalStatus: json['approvalStatus'] as String? ?? 'approved',
  liked: json['liked'] as bool? ?? false,
  saved: json['saved'] as bool? ?? false,
  createdAt: json['createdAt'] as String,
);

Map<String, dynamic> _$$PostImplToJson(_$PostImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'author': instance.author,
      'userType': instance.userType,
      'title': instance.title,
      'slug': instance.slug,
      'content': instance.content,
      'image': instance.image,
      'images': instance.images,
      'topic': instance.topic,
      'subTopic': instance.subTopic,
      'likes': instance.likes,
      'likedBy': instance.likedBy,
      'shares': instance.shares,
      'savedBy': instance.savedBy,
      'comments': instance.comments,
      'commentsCount': instance.commentsCount,
      'quizResult': instance.quizResult,
      'isActive': instance.isActive,
      'isAiImage': instance.isAiImage,
      'approvalStatus': instance.approvalStatus,
      'liked': instance.liked,
      'saved': instance.saved,
      'createdAt': instance.createdAt,
    };
