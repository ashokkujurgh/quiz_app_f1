import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/user.dart';

part 'friends_repository.g.dart';

class FriendRequestItem {
  FriendRequestItem({required this.requestId, required this.user, required this.createdAt});
  final String requestId;
  final User user;
  final String createdAt;
}

enum FriendshipStatus { none, pendingSent, pendingReceived, accepted, blocked }

/// Wraps every /api/friends/* call. See
/// backend/friend-service/src/controllers for the source of truth.
class FriendsRepository {
  FriendsRepository(this._dio);

  final Dio _dio;

  Future<List<User>> getFriends() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/friends');
      return _toUserList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<User>> getSuggestions() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/friends/suggestions');
      return _toUserList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<FriendRequestItem>> getIncomingRequests() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/friends/requests/incoming');
      return _toRequestList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<FriendRequestItem>> getOutgoingRequests() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/friends/requests/outgoing');
      return _toRequestList(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<FriendshipStatus> getStatus(String userId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/friends/status/$userId');
      final status = res.data!['status'] as String;
      final direction = res.data!['direction'] as String?;
      return switch (status) {
        'accepted' => FriendshipStatus.accepted,
        'blocked' => FriendshipStatus.blocked,
        'pending' => direction == 'outgoing' ? FriendshipStatus.pendingSent : FriendshipStatus.pendingReceived,
        _ => FriendshipStatus.none,
      };
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> sendRequest(String userId) async {
    try {
      await _dio.post<void>('/api/friends/request/$userId');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> acceptRequest(String requestId) async {
    try {
      await _dio.post<void>('/api/friends/accept/$requestId');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> declineRequest(String requestId) async {
    try {
      await _dio.post<void>('/api/friends/decline/$requestId');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> unfriend(String userId) async {
    try {
      await _dio.delete<void>('/api/friends/unfriend/$userId');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> cancelRequest(String userId) async {
    try {
      await _dio.delete<void>('/api/friends/cancel/$userId');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> blockUser(String userId) async {
    try {
      await _dio.post<void>('/api/friends/block/$userId');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  List<User> _toUserList(Map<String, dynamic> data) {
    return (data['data'] as List).map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
  }

  List<FriendRequestItem> _toRequestList(Map<String, dynamic> data) {
    return (data['data'] as List).map((e) {
      final m = e as Map<String, dynamic>;
      return FriendRequestItem(
        requestId: m['requestId'].toString(),
        user: User.fromJson(m['user'] as Map<String, dynamic>),
        createdAt: m['createdAt']?.toString() ?? '',
      );
    }).toList();
  }
}

@Riverpod(keepAlive: true)
FriendsRepository friendsRepository(Ref ref) => FriendsRepository(ref.watch(dioProvider));
