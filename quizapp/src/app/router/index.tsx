import { createBrowserRouter, Navigate } from 'react-router';
import { useAppSelector } from '../store/hooks';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../components/pages/LoginPage';
import { SignupPage } from '../components/pages/SignupPage';
import { HomePage } from '../components/pages/HomePage';
import { QuizzesPage } from '../components/pages/QuizzesPage';
import { QuizPlayPage } from '../components/pages/QuizPlayPage';
import { QuizResultPage } from '../components/pages/QuizResultPage';
import { FriendsPage } from '../components/pages/FriendsPage';
import { MessagesPage } from '../components/pages/MessagesPage';
import { LeaderboardPage } from '../components/pages/LeaderboardPage';
import { ProfilePage } from '../components/pages/ProfilePage';
import { HistoryPage } from '../components/pages/HistoryPage';
import { NotificationsPage } from '../components/pages/NotificationsPage';
import { SettingsPage } from '../components/pages/SettingsPage';
import { AdminDashboard } from '../components/pages/AdminDashboard';

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
  { path: '/login',  element: <RedirectIfAuth><LoginPage /></RedirectIfAuth> },
  { path: '/signup', element: <RedirectIfAuth><SignupPage /></RedirectIfAuth> },
  {
    path: '/',
    element: <RequireAuth><AppLayout /></RequireAuth>,
    children: [
      { path: 'home',         element: <HomePage /> },
      { path: 'quizzes',      element: <QuizzesPage /> },
      { path: 'quiz/play',    element: <QuizPlayPage /> },
      { path: 'quiz/result',  element: <QuizResultPage /> },
      { path: 'friends',      element: <FriendsPage /> },
      { path: 'messages',     element: <MessagesPage /> },
      { path: 'leaderboard',  element: <LeaderboardPage /> },
      { path: 'profile',      element: <ProfilePage /> },
      { path: 'history',      element: <HistoryPage /> },
      { path: 'notifications',element: <NotificationsPage /> },
      { path: 'settings',     element: <SettingsPage /> },
      { path: 'admin',        element: <AdminDashboard /> },
    ],
  },
]);
