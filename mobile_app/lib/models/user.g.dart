// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$UserStatsImpl _$$UserStatsImplFromJson(Map<String, dynamic> json) =>
    _$UserStatsImpl(
      friends: (json['friends'] as num?)?.toInt() ?? 0,
      posts: (json['posts'] as num?)?.toInt() ?? 0,
      quizzesTaken: (json['quizzesTaken'] as num?)?.toInt() ?? 0,
      averageScore: (json['averageScore'] as num?)?.toDouble() ?? 0,
    );

Map<String, dynamic> _$$UserStatsImplToJson(_$UserStatsImpl instance) =>
    <String, dynamic>{
      'friends': instance.friends,
      'posts': instance.posts,
      'quizzesTaken': instance.quizzesTaken,
      'averageScore': instance.averageScore,
    };

_$UserImpl _$$UserImplFromJson(Map<String, dynamic> json) => _$UserImpl(
  id: json['id'] as String,
  name: json['name'] as String,
  username: json['username'] as String?,
  email: json['email'] as String,
  avatar: json['avatar'] as String?,
  coverImage: json['coverImage'] as String?,
  bio: json['bio'] as String?,
  role: json['role'] as String? ?? 'user',
  isOnline: json['isOnline'] as bool? ?? false,
  isEmailVerified: json['isEmailVerified'] as bool? ?? false,
  isActive: json['isActive'] as bool? ?? true,
  stats:
      json['stats'] == null
          ? null
          : UserStats.fromJson(json['stats'] as Map<String, dynamic>),
);

Map<String, dynamic> _$$UserImplToJson(_$UserImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'username': instance.username,
      'email': instance.email,
      'avatar': instance.avatar,
      'coverImage': instance.coverImage,
      'bio': instance.bio,
      'role': instance.role,
      'isOnline': instance.isOnline,
      'isEmailVerified': instance.isEmailVerified,
      'isActive': instance.isActive,
      'stats': instance.stats,
    };
