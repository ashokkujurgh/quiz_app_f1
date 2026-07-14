import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/conversation.dart';
import '../../../models/message.dart';

part 'messages_repository.g.dart';

/// Wraps every /api/messages/* REST call. Real-time send/typing/read-receipt
/// happens over MessageSocketService instead — see that file for why (the
/// backend's socket handler is the primary send path for text messages).
class MessagesRepository {
  MessagesRepository(this._dio);

  final Dio _dio;

  Future<List<Conversation>> getConversations() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/messages/conversations');
      return (res.data!['data'] as List).map((e) => Conversation.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Conversation> openConversation(String userId) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/messages/conversations/$userId');
      return Conversation.fromJson(res.data!['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Message>> getMessages(String conversationId, {int page = 1, int limit = 30}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>(
        '/api/messages/conversations/$conversationId',
        queryParameters: {'page': page, 'limit': limit},
      );
      return (res.data!['data'] as List).map((e) => Message.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  /// Image messages only — text messages are sent via the socket instead.
  Future<Message> sendImageMessage(String conversationId, String imageUrl) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/api/messages/conversations/$conversationId/messages',
        data: {'imageUrl': imageUrl},
      );
      return Message.fromJson(res.data!['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> markRead(String conversationId) async {
    try {
      await _dio.post<void>('/api/messages/conversations/$conversationId/read');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<String> uploadImage(String filePath) async {
    try {
      final form = FormData.fromMap({'image': await MultipartFile.fromFile(filePath)});
      final res = await _dio.post<Map<String, dynamic>>('/api/messages/upload', data: form);
      return res.data!['url'] as String;
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }
}

@Riverpod(keepAlive: true)
MessagesRepository messagesRepository(Ref ref) => MessagesRepository(ref.watch(dioProvider));
