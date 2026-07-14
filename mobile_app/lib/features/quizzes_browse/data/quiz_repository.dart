import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/leaderboard_entry.dart';
import '../../../models/quiz.dart';

part 'quiz_repository.g.dart';

/// Wraps every /api/quizzes/* REST call (Socket.IO gameplay lives separately
/// in quiz_play's QuizSocketService). See
/// backend/quiz-service/src/controllers/quizController.ts for source of truth.
class QuizRepository {
  QuizRepository(this._dio);

  final Dio _dio;

  Future<List<Quiz>> getQuizzes({String? status, String? participation, String? subTopic, String? q}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes', queryParameters: {
        if (status != null) 'status': status,
        if (participation != null) 'participation': participation,
        if (subTopic != null) 'subTopic': subTopic,
        if (q != null && q.isNotEmpty) 'q': q,
      });
      return _toList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Quiz>> getActiveQuizzes() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/active');
      return _toList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Quiz>> getCompletedQuizzes() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/completed/list');
      return _toList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Quiz>> getMyHistoryQuizzes() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/my/history');
      return _toList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Quiz>> getMyQuizzes() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/my/quizzes');
      return _toList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Quiz> getQuiz(String id) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/$id');
      return Quiz.fromJson(res.data!['quiz'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<LeaderboardEntry>> getQuizLeaderboard(String quizId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/$quizId/leaderboard');
      return (res.data!['leaderboard'] as List)
          .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<LeaderboardEntry>> getGlobalLeaderboard() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/leaderboard/global');
      return (res.data!['leaderboard'] as List)
          .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Map<String, dynamic>> getMyQuizHistory(String quizId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/$quizId/my-history');
      return res.data!['history'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Map<String, dynamic>>> getQuizQuestions(String quizId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/quizzes/$quizId/questions');
      return (res.data!['questions'] as List).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Quiz> createQuiz(Map<String, dynamic> body) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/quizzes', data: body);
      return Quiz.fromJson(res.data!['quiz'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<({Quiz quiz, int remaining})> addQuestionsToQuiz(String quizId, List<String> questionIds) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/quizzes/$quizId/questions', data: {
        'questionIds': questionIds,
      });
      return (
        quiz: Quiz.fromJson(res.data!['quiz'] as Map<String, dynamic>),
        remaining: res.data!['remaining'] as int,
      );
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<String> uploadQuizImage(String filePath) async {
    try {
      final form = FormData.fromMap({'image': await MultipartFile.fromFile(filePath)});
      final res = await _dio.post<Map<String, dynamic>>('/api/quizzes/upload-image', data: form);
      return res.data!['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  List<Quiz> _toList(Map<String, dynamic> data) {
    return (data['quizzes'] as List).map((e) => Quiz.fromJson(e as Map<String, dynamic>)).toList();
  }
}

@Riverpod(keepAlive: true)
QuizRepository quizRepository(Ref ref) => QuizRepository(ref.watch(dioProvider));
