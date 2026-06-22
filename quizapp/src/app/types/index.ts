export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  coverImage?: string;
  isOnline?: boolean;
  role: 'user' | 'admin';
  stats: {
    friends: number;
    posts: number;
    quizzesTaken: number;
    averageScore: number;
  };
  joinedAt: string;
}

export interface Post {
  id: string;
  slug?: string | null;
  author: User;
  title?: string | null;
  content: string;
  image?: string;
  images?: string[];
  isAiImage?: boolean;
  topic: QuizTopic;
  subTopic?: string | null;
  userType?: 'user' | 'admin';
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  saved: boolean;
  liked: boolean;
  quizResult?: QuizResult;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
}

export type QuizTopic =
  | 'General Science'
  | 'Electrical'
  | 'History'
  | 'Geography'
  | 'Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Technology'
  | 'All';

export interface QuizCategory {
  id: string;
  name: QuizTopic;
  icon: string;
  color: string;
  count: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  category: QuizTopic;
  description: string;
  questions: QuizQuestion[];
  duration: number; // seconds
  difficulty: 'Easy' | 'Medium' | 'Hard';
  plays: number;
  rating: number;
  createdBy: User;
  thumbnail?: string;
  questionCount?: number;
}

export interface TopPlayer {
  rank: number;
  name: string;
  score: number;
  total: number;
  percentage: number;
}

export interface QuizResult {
  quizId: string;
  quizTitle: string;
  category: QuizTopic;
  score: number;
  total: number;
  percentage: number;
  rank?: number | null;
  duration: number;
  date: string;
  answers: number[];
  playerCount?: number;
  avgPercentage?: number;
  topPlayers?: TopPlayer[];
}

export interface Friend {
  id: string;
  user: User;
  status: 'friend' | 'pending_sent' | 'pending_received' | 'suggested';
  mutualFriends?: number;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'image' | 'emoji';
}

export interface Chat {
  id: string;
  participant: User;
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  isTyping?: boolean;
}

export interface Notification {
  id: string;
  type: 'friend_request' | 'like' | 'comment' | 'message' | 'quiz_challenge';
  actor: User;
  content: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
  quizzesTaken: number;
  period: 'weekly' | 'monthly' | 'all_time';
}

export interface AdminStats {
  totalUsers: number;
  totalQuizzes: number;
  totalPosts: number;
  quizAttempts: number;
  activeUsers: number;
  newUsersThisWeek: number;
}

export type ThemeMode = 'light' | 'dark';
