import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/dio_client.dart';
import '../../../models/comment.dart';
import '../../../models/post.dart';

part 'posts_repository.g.dart';

class PostsPage {
  PostsPage({required this.posts, required this.total, required this.page, required this.pages});
  final List<Post> posts;
  final int total;
  final int page;
  final int pages;
}

/// Wraps every /api/posts/* call. See
/// backend/post-service/src/controllers/postController.ts for the source of truth.
class PostsRepository {
  PostsRepository(this._dio);

  final Dio _dio;

  Future<PostsPage> getPosts({String? topic, String? subTopic, int page = 1, int limit = 20, String? q}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/posts', queryParameters: {
        if (topic != null && topic != 'All') 'topic': topic,
        if (subTopic != null && subTopic != 'All') 'subTopic': subTopic,
        if (q != null && q.isNotEmpty) 'q': q,
        'page': page,
        'limit': limit,
      });
      return _toPage(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<PostsPage> getUserPosts(String userId, {int page = 1, int limit = 20}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/posts/user/$userId', queryParameters: {
        'page': page,
        'limit': limit,
      });
      return _toPage(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Post> getPost(String idOrSlug) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/posts/$idOrSlug');
      return Post.fromJson(res.data!['post'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Post> createPost({
    String? title,
    required String content,
    List<String>? images,
    required String topic,
    String? subTopic,
    Map<String, dynamic>? quizResult,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/posts', data: {
        if (title != null && title.isNotEmpty) 'title': title,
        'content': content,
        if (images != null && images.isNotEmpty) 'images': images,
        'topic': topic,
        if (subTopic != null) 'subTopic': subTopic,
        if (quizResult != null) 'quizResult': quizResult,
      });
      return Post.fromJson(res.data!['post'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Post> updatePost(String id, {String? title, String? content, List<String>? images, String? topic, String? subTopic}) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>('/api/posts/$id', data: {
        if (title != null) 'title': title,
        if (content != null) 'content': content,
        if (images != null) 'images': images,
        if (topic != null) 'topic': topic,
        if (subTopic != null) 'subTopic': subTopic,
      });
      return Post.fromJson(res.data!['post'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> deletePost(String id) async {
    try {
      await _dio.delete<void>('/api/posts/$id');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<({bool liked, int likeCount})> toggleLike(String id) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/posts/$id/like');
      return (liked: res.data!['liked'] as bool, likeCount: res.data!['likeCount'] as int);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<({bool saved, int saveCount})> toggleSave(String id) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/posts/$id/save');
      return (saved: res.data!['saved'] as bool, saveCount: res.data!['saveCount'] as int);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<Comment>> getComments(String postId, {int page = 1, int limit = 20}) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/api/posts/$postId/comments', queryParameters: {
        'page': page,
        'limit': limit,
      });
      final list = res.data!['comments'] as List;
      return list.map((e) => Comment.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<Comment> addComment(String postId, String content) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/api/posts/$postId/comments', data: {
        'content': content,
      });
      return Comment.fromJson(res.data!['comment'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<void> deleteComment(String postId, String commentId) async {
    try {
      await _dio.delete<void>('/api/posts/$postId/comments/$commentId');
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  Future<List<String>> uploadImages(List<String> filePaths) async {
    try {
      final form = FormData.fromMap({
        'images': [
          for (final path in filePaths) await MultipartFile.fromFile(path),
        ],
      });
      final res = await _dio.post<Map<String, dynamic>>('/api/auth/upload/images', data: form);
      return (res.data!['urls'] as List).cast<String>();
    } on DioException catch (e) {
      throw ApiException.fromResponseData(e.response?.data, statusCode: e.response?.statusCode);
    }
  }

  PostsPage _toPage(Map<String, dynamic> data) {
    final posts = (data['posts'] as List).map((e) => Post.fromJson(e as Map<String, dynamic>)).toList();
    final pagination = data['pagination'] as Map<String, dynamic>? ?? {};
    return PostsPage(
      posts: posts,
      total: pagination['total'] as int? ?? posts.length,
      page: pagination['page'] as int? ?? 1,
      pages: pagination['pages'] as int? ?? 1,
    );
  }
}

@Riverpod(keepAlive: true)
PostsRepository postsRepository(Ref ref) => PostsRepository(ref.watch(dioProvider));
