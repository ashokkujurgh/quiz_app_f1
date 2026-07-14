import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/topic.dart';

part 'topics_repository.g.dart';

/// Shared across home_feed, quizzes_browse, and quiz_create — topics/subtopics
/// are the common taxonomy every content type (posts, quizzes, questions) hangs off.
class TopicsRepository {
  TopicsRepository(this._dio);

  final Dio _dio;

  Future<List<Topic>> getTopics() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/topics');
      final list = res.data!['topics'] as List;
      return list.map((e) => Topic.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<SubTopic>> getSubTopics(String topicId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/topics/$topicId/subtopics');
      final list = res.data!['subtopics'] as List;
      return list.map((e) => SubTopic.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }
}

@Riverpod(keepAlive: true)
TopicsRepository topicsRepository(Ref ref) => TopicsRepository(ref.watch(dioProvider));

@riverpod
Future<List<Topic>> activeTopics(Ref ref) async {
  final topics = await ref.watch(topicsRepositoryProvider).getTopics();
  return topics.where((t) => t.isActive).toList();
}

@riverpod
Future<List<SubTopic>> subTopicsFor(Ref ref, String topicId) async {
  final subs = await ref.watch(topicsRepositoryProvider).getSubTopics(topicId);
  return subs.where((s) => s.isActive).toList();
}
