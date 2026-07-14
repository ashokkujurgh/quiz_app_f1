import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/question.dart';

part 'question_repository.g.dart';

/// Wraps /api/questions/*. Shared by practice_quiz (fetch by subTopic) and
/// quiz_create (search to hand-pick questions for a manual quiz).
class QuestionRepository {
  QuestionRepository(this._dio);

  final Dio _dio;

  Future<List<Question>> getQuestions({
    String? topic,
    String? subTopic,
    String? difficulty,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/questions', queryParameters: {
        if (topic != null) 'topic': topic,
        if (subTopic != null) 'subTopic': subTopic,
        if (difficulty != null) 'difficulty': difficulty,
        if (search != null && search.isNotEmpty) 'search': search,
        'page': page,
        'limit': limit,
      });
      return (res.data!['questions'] as List)
          .map((e) => Question.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Question>> getQuestionsByIds(List<String> ids) async {
    if (ids.isEmpty) return [];
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/questions', queryParameters: {
        'ids': ids.join(','),
      });
      return (res.data!['questions'] as List)
          .map((e) => Question.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }
}

@Riverpod(keepAlive: true)
QuestionRepository questionRepository(Ref ref) => QuestionRepository(ref.watch(dioProvider));
