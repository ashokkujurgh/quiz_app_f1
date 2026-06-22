import { createBrowserRouter, Navigate } from 'react-router';
import { useAppSelector } from '../store/hooks';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../components/pages/LoginPage';
import { SignupPage } from '../components/pages/SignupPage';
import { HomePage } from '../components/pages/HomePage';
import { QuizzesPage } from '../components/pages/QuizzesPage';
import { QuizPlayPage } from '../components/pages/QuizPlayPage';
import { CreateQuizPage } from '../components/pages/CreateQuizPage';
import { QuizResultPage } from '../components/pages/QuizResultPage';
import { FriendsPage } from '../components/pages/FriendsPage';
import { MessagesPage } from '../components/pages/MessagesPage';
import { LeaderboardPage } from '../components/pages/LeaderboardPage';
import { ProfilePage } from '../components/pages/ProfilePage';
import { HistoryPage } from '../components/pages/HistoryPage';
import { NotificationsPage } from '../components/pages/NotificationsPage';
import { SettingsPage } from '../components/pages/SettingsPage';
import { AdminDashboard } from '../components/pages/AdminDashboard';
import { PostDetailPage } from '../components/pages/PostDetailPage';
import { PracticeQuizPage } from '../components/pages/PracticeQuizPage';
import { UserProfilePage } from '../components/pages/UserProfilePage';
import { PostsPage } from '../components/pages/PostsPage';
import { ForgotPasswordPage } from '../components/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../components/pages/ResetPasswordPage';
import { VerifyEmailPage } from '../components/pages/VerifyEmailPage';
import { ResendVerificationPage } from '../components/pages/ResendVerificationPage';
import { NavOnlyLayout } from '../components/layout/NavOnlyLayout';

function RequireAuth({ children }: { children: JSX.Element }) {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuth({ children }: { children: JSX.Element }) {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  if (accessToken) return <Navigate to="/home" replace />;
  return children;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/home" replace /> },
  { path: '/login',            element: <RedirectIfAuth><LoginPage /></RedirectIfAuth> },
  { path: '/signup',           element: <RedirectIfAuth><SignupPage /></RedirectIfAuth> },
  { path: '/forgot-password',      element: <RedirectIfAuth><ForgotPasswordPage /></RedirectIfAuth> },
  { path: '/reset-password',       element: <ResetPasswordPage /> },
  { path: '/verify-email',         element: <VerifyEmailPage /> },
  { path: '/resend-verification',  element: <ResendVerificationPage /> },
  { path: '/posts/:slug',  element: <PostDetailPage /> },
  { path: '/quiz/play/:quizId', element: <RequireAuth><QuizPlayPage /></RequireAuth> },
  {
    path: '/',
    element: <NavOnlyLayout />,
    children: [
      { path: 'practice', element: <RequireAuth><PracticeQuizPage /></RequireAuth> },
    ],
  },
  { path: '/quiz/result',       element: <RequireAuth><QuizResultPage /></RequireAuth> },
  { path: '/quiz/create',       element: <RequireAuth><CreateQuizPage /></RequireAuth> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'home',          element: <HomePage /> },
      { path: 'quizzes',       element: <QuizzesPage /> },
      { path: 'friends',       element: <RequireAuth><FriendsPage /></RequireAuth> },
      { path: 'messages',      element: <RequireAuth><MessagesPage /></RequireAuth> },
      { path: 'leaderboard',   element: <RequireAuth><LeaderboardPage /></RequireAuth> },
      { path: 'profile',           element: <RequireAuth><ProfilePage /></RequireAuth> },
      { path: 'profile/:userId',   element: <RequireAuth><UserProfilePage /></RequireAuth> },
      { path: 'posts',         element: <RequireAuth><PostsPage /></RequireAuth> },
      { path: 'history',       element: <RequireAuth><HistoryPage /></RequireAuth> },
      { path: 'notifications',  element: <RequireAuth><NotificationsPage /></RequireAuth> },
      { path: 'settings',      element: <RequireAuth><SettingsPage /></RequireAuth> },
      { path: 'admin',         element: <RequireAuth><AdminDashboard /></RequireAuth> },
    ],
  },
]);
