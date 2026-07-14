// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TopPlayerImpl _$$TopPlayerImplFromJson(Map<String, dynamic> json) =>
    _$TopPlayerImpl(
      rank: (json['rank'] as num?)?.toInt(),
      name: json['name'] as String?,
      score: (json['score'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
    );

Map<String, dynamic> _$$TopPlayerImplToJson(_$TopPlayerImpl instance) =>
    <String, dynamic>{
      'rank': instance.rank,
      'name': instance.name,
      'score': instance.score,
      'total': instance.total,
      'percentage': instance.percentage,
    };

_$QuizResultImpl _$$QuizResultImplFromJson(Map<String, dynamic> json) =>
    _$QuizResultImpl(
      quizId: json['quizId'] as String,
      quizTitle: json['quizTitle'] as String,
      category: json['category'] as String?,
      score: (json['score'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
      rank: (json['rank'] as num?)?.toInt(),
      duration: (json['duration'] as num?)?.toInt() ?? 0,
      date: json['date'] as String?,
      answers:
          (json['answers'] as List<dynamic>?)
              ?.map((e) => (e as num).toInt())
              .toList() ??
          const <int>[],
      playerCount: (json['playerCount'] as num?)?.toInt(),
      avgPercentage: (json['avgPercentage'] as num?)?.toDouble(),
      topPlayers:
          (json['topPlayers'] as List<dynamic>?)
              ?.map((e) => TopPlayer.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <TopPlayer>[],
    );

Map<String, dynamic> _$$QuizResultImplToJson(_$QuizResultImpl instance) =>
    <String, dynamic>{
      'quizId': instance.quizId,
      'quizTitle': instance.quizTitle,
      'category': instance.category,
      'score': instance.score,
      'total': instance.total,
      'percentage': instance.percentage,
      'rank': instance.rank,
      'duration': instance.duration,
      'date': instance.date,
      'answers': instance.answers,
      'playerCount': instance.playerCount,
      'avgPercentage': instance.avgPercentage,
      'topPlayers': instance.topPlayers,
    };
