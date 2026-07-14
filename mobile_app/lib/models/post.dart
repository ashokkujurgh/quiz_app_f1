import 'package:freezed_annotation/freezed_annotation.dart';

import 'comment.dart';
import 'quiz_result.dart';

part 'post.freezed.dart';
part 'post.g.dart';

@freezed
class Post with _$Post {
  const factory Post({
    required String id,
    required AuthorSnapshot author,
    @Default('user') String userType,
    String? title,
    String? slug,
    required String content,
    String? image,
    @Default(<String>[]) List<String> images,
    required String topic,
    String? subTopic,
    @Default(0) int likes,
    @Default(<String>[]) List<String> likedBy,
    @Default(0) int shares,
    @Default(<String>[]) List<String> savedBy,
    @Default(<Comment>[]) List<Comment> comments,
    @Default(0) int commentsCount,
    QuizResult? quizResult,
    @Default(true) bool isActive,
    @Default(false) bool isAiImage,
    @Default('approved') String approvalStatus,
    @Default(false) bool liked,
    @Default(false) bool saved,
    required String createdAt,
  }) = _Post;

  factory Post.fromJson(Map<String, dynamic> json) => _$PostFromJson(_normalize(json));

  static Map<String, dynamic> _normalize(Map<String, dynamic> json) {
    var out = json;
    if (out.containsKey('_id') && !out.containsKey('id')) {
      out = {...out, 'id': out['_id']};
    }
    // Some endpoints return the comments array (with real count derivable),
    // others return a precomputed commentsCount instead — normalize to both.
    if (!out.containsKey('commentsCount') && out['comments'] is List) {
      out = {...out, 'commentsCount': (out['comments'] as List).length};
    }
    return out;
  }
}

extension PostX on Post {
  List<String> get displayImages => images.isNotEmpty ? images : (image != null ? [image!] : []);
}
