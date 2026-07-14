import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/user.dart';

part 'profile_repository.g.dart';

class ProfileRepository {
  ProfileRepository(this._dio);

  final Dio _dio;

  Future<User> updateProfile({String? name, String? username, String? bio}) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>('/api/auth/profile', data: {
        if (name != null) 'name': name,
        if (username != null) 'username': username,
        if (bio != null) 'bio': bio,
      });
      return User.fromJson(res.data!['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<User> uploadAvatar(String filePath) async {
    try {
      final form = FormData.fromMap({'avatar': await MultipartFile.fromFile(filePath)});
      final res = await _dio.post<Map<String, dynamic>>('/api/auth/upload/avatar', data: form);
      return User.fromJson(res.data!['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<User> uploadCover(String filePath) async {
    try {
      final form = FormData.fromMap({'cover': await MultipartFile.fromFile(filePath)});
      final res = await _dio.post<Map<String, dynamic>>('/api/auth/upload/cover', data: form);
      return User.fromJson(res.data!['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<User> getUser(String userId) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/auth/users/$userId');
      return User.fromJson(res.data!['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }
}

@Riverpod(keepAlive: true)
ProfileRepository profileRepository(Ref ref) => ProfileRepository(ref.watch(dioProvider));
