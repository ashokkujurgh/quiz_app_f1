export interface User {
  _id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  role?: 'user' | 'admin';
  isOnline?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
}

export interface PostAuthor {
  userId: string;
  name: string;
  username?: string;
  avatar?: string | null;
}

export interface Comment {
  _id: string;
  text: string;
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string | null;
  createdAt: string;
}

export interface Post {
  _id: string;
  title?: string | null;
  slug?: string;
  content: string;
  image?: string | null;
  images?: string[];
  topic: string;
  subTopic?: string | null;
  author: PostAuthor;
  likedBy?: string[];
  savedBy?: string[];
  liked?: boolean;
  saved?: boolean;
  likes?: number;
  commentsCount?: number;
  comments?: Comment[];
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  quizResult?: {
    quizId: string;
    quizTitle: string;
    score: number;
    total: number;
    percentage: number;
  } | null;
}

export type QuizStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
export type QuizParticipation = 'public' | 'private' | 'invite_only';

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  questionCount: number;
  status: QuizStatus;
  participation: QuizParticipation;
  topic?: { _id: string; name: string } | string;
  subTopic?: string | null;
  /** Not consistently populated by the backend — UI should default to 'Medium' when absent. */
  difficulty?: string;
  image?: string | null;
  durationMinutes?: number;
  timeLimitPerQuestion?: number;
  scheduledAt?: string;
  startedAt?: string;
  createdBy?: string;
}

export interface QuestionOption {
  text: string;
}

export interface Question {
  _id: string;
  text: string;
  description?: string;
  options: QuestionOption[];
  correctOption?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizHistoryEntry {
  quizId: string;
  quizTitle?: string;
  score: number;
  total: number;
  percentage: number;
  playedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  score: number;
}

export interface Topic {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  subTopicCount?: number;
}

export interface SubTopic {
  _id: string;
  topic: string;
  name: string;
  isActive?: boolean;
}

export type FriendStatus = 'none' | 'request_sent' | 'request_received' | 'accepted' | 'blocked';

export interface FriendUser {
  _id: string;
  name: string;
  username?: string;
  avatar?: string | null;
  email?: string;
  isOnline?: boolean;
}

export interface FriendRequest {
  requestId: string;
  user: FriendUser;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: string[];
  otherUser: { _id?: string; username?: string; name?: string; avatar?: string | null };
  lastMessage?: { _id: string; text: string; createdAt: string } | null;
  unreadCount?: number;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  imageUrl?: string | null;
  readBy: string[];
  createdAt: string;
}
