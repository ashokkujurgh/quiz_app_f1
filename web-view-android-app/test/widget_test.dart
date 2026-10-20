import 'package:flutter_test/flutter_test.dart';
import 'package:meenzo/push_service.dart';

void main() {
  test('push payloads map to site pages', () {
    expect(PushService.urlForData({'type': 'new_post', 'postId': 'abc'}),
        'https://meenzo.com/posts/abc');
    expect(PushService.urlForData({'type': 'new_comment', 'postId': 'p1'}),
        'https://meenzo.com/posts/p1');
    expect(PushService.urlForData({'type': 'quiz_started', 'quizId': 'q1'}),
        'https://meenzo.com/quiz/play/q1');
    expect(PushService.urlForData({'type': 'quiz_reminder', 'quizId': 'q1'}),
        'https://meenzo.com/quizzes');
    expect(PushService.urlForData({'type': 'new_message'}), 'https://meenzo.com/messages');
    expect(PushService.urlForData({'type': 'friend_request'}), 'https://meenzo.com/friends');
    expect(PushService.urlForData({'url': '/leaderboard', 'type': 'new_post'}),
        'https://meenzo.com/leaderboard');
    expect(PushService.urlForData({'link': 'https://meenzo.com/history'}),
        'https://meenzo.com/history');
    expect(PushService.urlForData({}), isNull);
  });
}
