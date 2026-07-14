/// Route path constants, mirroring quizapp/src/app/router/index.tsx.
class RoutePaths {
  RoutePaths._();

  // Public / unauthenticated
  static const login = '/login';
  static const signup = '/signup';
  static const forgotPassword = '/forgot-password';
  static const resendVerification = '/resend-verification';
  static const verifyEmail = '/verify-email';
  static const resetPassword = '/reset-password';

  // Public post route
  static const postDetail = '/posts/:slug';

  // Authenticated, no shell (full-screen)
  static const quizPlay = '/quiz/play/:quizId';
  static const quizResult = '/quiz/result/:quizId';
  static const quizCreate = '/quiz/create';
  static const practiceQuiz = '/practice';

  // Authenticated, inside bottom-nav shell
  static const home = '/home';
  static const quizzes = '/quizzes';
  static const friends = '/friends';
  static const messages = '/messages';
  static const messageThread = '/messages/:conversationId';
  static const leaderboard = '/leaderboard';
  static const profile = '/profile';
  static const userProfile = '/profile/:userId';
  static const posts = '/posts';
  static const history = '/history';
  static const notifications = '/notifications';
  static const settings = '/settings';
  static const admin = '/admin';
  static const adminLogin = '/admin/login';
}
