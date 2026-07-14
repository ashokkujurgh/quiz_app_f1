// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leaderboard_entry.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$LeaderboardEntryImpl _$$LeaderboardEntryImplFromJson(
  Map<String, dynamic> json,
) => _$LeaderboardEntryImpl(
  rank: (json['rank'] as num).toInt(),
  userId: json['userId'] as String,
  userName: json['userName'] as String,
  userAvatar: json['userAvatar'] as String?,
  score: (json['score'] as num?)?.toInt() ?? 0,
  total: (json['total'] as num?)?.toInt() ?? 0,
  percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
  timeTaken: (json['timeTaken'] as num?)?.toInt() ?? 0,
  totalGames: (json['totalGames'] as num?)?.toInt(),
  totalScore: (json['totalScore'] as num?)?.toInt(),
  totalQuestions: (json['totalQuestions'] as num?)?.toInt(),
  avgPercentage: (json['avgPercentage'] as num?)?.toInt(),
  perfectScores: (json['perfectScores'] as num?)?.toInt(),
);

Map<String, dynamic> _$$LeaderboardEntryImplToJson(
  _$LeaderboardEntryImpl instance,
) => <String, dynamic>{
  'rank': instance.rank,
  'userId': instance.userId,
  'userName': instance.userName,
  'userAvatar': instance.userAvatar,
  'score': instance.score,
  'total': instance.total,
  'percentage': instance.percentage,
  'timeTaken': instance.timeTaken,
  'totalGames': instance.totalGames,
  'totalScore': instance.totalScore,
  'totalQuestions': instance.totalQuestions,
  'avgPercentage': instance.avgPercentage,
  'perfectScores': instance.perfectScores,
};
