import { useState } from "react";
import {
  Home, BookOpen, Users, MessageCircle, User,
  Bell, Search, Heart, MessageSquare, Share2, Bookmark,
  Plus, Clock, HelpCircle, CheckCircle, UserPlus,
  ChevronRight, ArrowLeft, BarChart2, Settings, History,
  Send, Phone, Video, MoreVertical, Check, CheckCheck,
  TrendingUp, Zap, Globe, Flame, X
} from "lucide-react";

// ─── Brand gradient helpers ────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg, #7c5cfc 0%, #c054f0 55%, #e040fb 100%)";
const GRAD2 = "linear-gradient(135deg, #6c47ef 0%, #e040fb 100%)";

// ─── Avatar colours ────────────────────────────────────────────────────────
const avatarColors: Record<string, string> = {
  M: "#7c5cfc", A: "#e040fb", P: "#06b6d4", R: "#22c55e",
  S: "#f59e0b", K: "#ef4444", V: "#3b82f6", D: "#14b8a6",
  N: "#f97316",
};
const LetterAvatar = ({ name, size = 40 }: { name: string; size?: number }) => {
  const initial = name[0].toUpperCase();
  const bg = avatarColors[initial] ?? "#7c5cfc";
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, background: bg, fontFamily: "Outfit, sans-serif", fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
};

// ─── Toggle switch ─────────────────────────────────────────────────────────
const Toggle = ({ on }: { on: boolean }) => (
  <div
    className="w-11 h-6 rounded-full relative transition-all duration-300 shrink-0"
    style={{ background: on ? GRAD : "rgba(22,19,46,0.1)" }}
  >
    <div
      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
      style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
    />
  </div>
);

// ─── Data ──────────────────────────────────────────────────────────────────
const posts = [
  {
    id: 1, author: "Meenzo", handle: "@meenzo", avatar: "M", time: "2h ago",
    category: "Technology",
    title: "The Birth of Electronics: How Semiconductor Devices Transformed Communication",
    excerpt: "In 1947, three physicists at Bell Labs — John Bardeen, Walter Brattain, and William Shockley — created the first transistor, revolutionizing electronics and communications forever.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=300&fit=crop&auto=format",
    likes: 48, comments: 12, shares: 7, saved: false, liked: false,
  },
  {
    id: 2, author: "Meenzo", handle: "@meenzo", avatar: "M", time: "5h ago",
    category: "Governance",
    title: "The 73rd Amendment: A Landmark in Indian Local Governance",
    excerpt: "In 1992, India witnessed a significant transformation in its governance structure with the enactment of the 73rd Amendment, empowering Panchayati Raj institutions.",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&h=300&fit=crop&auto=format",
    likes: 31, comments: 8, shares: 4, saved: true, liked: true,
  },
  {
    id: 3, author: "Meenzo", handle: "@meenzo", avatar: "M", time: "1d ago",
    category: "Science",
    title: "Quantum Computing: The Next Frontier in Processing Power",
    excerpt: "Quantum computers exploit quantum mechanical phenomena to perform calculations exponentially faster than classical computers, promising breakthroughs in cryptography, medicine, and AI.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=300&fit=crop&auto=format",
    likes: 124, comments: 33, shares: 19, saved: false, liked: false,
  },
];

const quizzes = [
  { id: 1, title: "Daily General Science Quiz – Learn, Compete, Grow", author: "dfdf", duration: "5h", questions: 10, status: "Live", gradient: "linear-gradient(135deg,#7c5cfc,#e040fb)" },
  { id: 2, title: "Indian History Challenge: Mughal Era", author: "Meenzo", duration: "30 min", questions: 10, status: "Ended", gradient: "linear-gradient(135deg,#e040fb,#f97316)" },
  { id: 3, title: "General Science Quiz – Test Your Knowledge", author: "Meenzo", duration: "45 min", questions: 20, status: "Live", gradient: "linear-gradient(135deg,#06b6d4,#7c5cfc)" },
  { id: 4, title: "Vocabulary Builder: Advanced English", author: "dfdf", duration: "2 min", questions: 5, status: "Ended", gradient: "linear-gradient(135deg,#22c55e,#06b6d4)" },
  { id: 5, title: "World Geography Trivia", author: "Meenzo", duration: "20 min", questions: 15, status: "Live", gradient: "linear-gradient(135deg,#f59e0b,#e040fb)" },
  { id: 6, title: "Current Affairs: July 2026", author: "Meenzo", duration: "10 min", questions: 10, status: "Live", gradient: "linear-gradient(135deg,#ef4444,#7c5cfc)" },
];

const friends = [
  { id: 1, name: "sam s", handle: "@sams_5102", online: false, avatar: "S", mutual: 2 },
  { id: 2, name: "Aarav Sharma", handle: "@aarav_sharma_8119", online: true, avatar: "A", mutual: 5 },
  { id: 3, name: "Priya Patel", handle: "@priya_patel_6908", online: true, avatar: "P", mutual: 3 },
  { id: 4, name: "Rohan Verma", handle: "@rohan_verma_3658", online: true, avatar: "R", mutual: 8 },
  { id: 5, name: "Sneha Iyer", handle: "@sneha_iyer_8891", online: true, avatar: "S", mutual: 1 },
  { id: 6, name: "Karan Mehta", handle: "@karan_mehta_2624", online: true, avatar: "K", mutual: 4 },
  { id: 7, name: "Ananya Reddy", handle: "@ananya_reddy_7576", online: false, avatar: "A", mutual: 6 },
  { id: 8, name: "Vikram Singh", handle: "@vikram_singh_7313", online: true, avatar: "V", mutual: 2 },
  { id: 9, name: "Divya Nair", handle: "@divya_nair_4278", online: false, avatar: "D", mutual: 3 },
];

const messages = [
  { id: 1, name: "Aarav Sharma", avatar: "A", last: "Hey! Did you check the new quiz?", time: "2m", unread: 3, online: true },
  { id: 2, name: "Priya Patel", avatar: "P", last: "Thanks for sharing that article 😊", time: "14m", unread: 0, online: true },
  { id: 3, name: "Rohan Verma", avatar: "R", last: "I scored 90% on the science quiz!", time: "1h", unread: 1, online: false },
  { id: 4, name: "Sneha Iyer", avatar: "S", last: "Let's compete in today's quiz together", time: "3h", unread: 0, online: true },
  { id: 5, name: "Karan Mehta", avatar: "K", last: "Good morning! Ready to learn?", time: "Yesterday", unread: 0, online: false },
  { id: 6, name: "Ananya Reddy", avatar: "A", last: "That governance post was really insightful", time: "Yesterday", unread: 0, online: false },
];

const filterTabs = ["All", "Trending", "Following", "Saved"];
const friendTabs = ["Friends", "Incoming", "Sent", "Suggestions"];
const quizCategories = ["All", "Science", "History", "English", "Geography", "Current Affairs"];
const profileTabs = ["Posts", "Quiz Results", "Friends"];

// ─── Bottom Nav ────────────────────────────────────────────────────────────
const navItems = [
  { icon: Home, label: "Home" },
  { icon: BookOpen, label: "Quizzes" },
  { icon: Users, label: "Friends" },
  { icon: MessageCircle, label: "Messages" },
  { icon: User, label: "Profile" },
];

export default function App() {
  const [tab, setTab] = useState(0);
  const [feedFilter, setFeedFilter] = useState(0);
  const [friendTab, setFriendTab] = useState(3);
  const [quizCat, setQuizCat] = useState(0);
  const [profileTab, setProfileTab] = useState(0);
  const [addedFriends, setAddedFriends] = useState<Set<number>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set([2]));
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set([2]));

  const toggleLike = (id: number) => {
    setLikedPosts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSave = (id: number) => {
    setSavedPosts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAdd = (id: number) => {
    setAddedFriends(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, #ddd6fe 0%, #f5f4fc 60%)" }}
    >
      {/* Phone shell */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: 393, height: 852,
          borderRadius: 48,
          background: "#f5f4fc",
          boxShadow: "0 0 0 1px rgba(124,92,252,0.12), 0 48px 96px rgba(100,80,200,0.18), 0 0 160px rgba(124,92,252,0.08)",
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-8 pt-3 pb-1 shrink-0">
          <span className="text-xs font-bold text-foreground/60" style={{ fontFamily: "Outfit" }}>9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-3.5 h-2 rounded-sm border border-foreground/30 relative">
              <div className="absolute inset-0.5 right-0.5 bg-foreground/30 rounded-[1px]" />
            </div>
          </div>
        </div>
        {/* Dynamic island */}
        <div className="flex justify-center mb-1 shrink-0">
          <div className="w-28 h-7 rounded-full bg-black" />
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-hidden relative">
          {tab === 0 && <HomeScreen feedFilter={feedFilter} setFeedFilter={setFeedFilter} posts={posts} likedPosts={likedPosts} savedPosts={savedPosts} onLike={toggleLike} onSave={toggleSave} />}
          {tab === 1 && <QuizzesScreen quizCat={quizCat} setQuizCat={setQuizCat} quizzes={quizzes} />}
          {tab === 2 && <FriendsScreen friendTab={friendTab} setFriendTab={setFriendTab} friends={friends} addedFriends={addedFriends} onAdd={toggleAdd} />}
          {tab === 3 && <MessagesScreen messages={messages} />}
          {tab === 4 && <ProfileScreen profileTab={profileTab} setProfileTab={setProfileTab} />}
        </div>

        {/* Bottom nav */}
        <div
          className="shrink-0 px-3 pt-2 pb-5"
          style={{ background: "linear-gradient(to top, #f5f4fc 70%, rgba(245,244,252,0))" }}
        >
          <div
            className="flex items-center rounded-2xl px-1 py-1"
            style={{ background: "#ffffff", border: "1px solid rgba(124,92,252,0.1)", boxShadow: "0 4px 24px rgba(124,92,252,0.08)" }}
          >
            {navItems.map((item, i) => {
              const Icon = item.icon;
              const active = tab === i;
              return (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all duration-200 relative"
                >
                  {active && (
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "linear-gradient(135deg, rgba(124,92,252,0.12), rgba(224,64,251,0.08))", border: "1px solid rgba(124,92,252,0.2)" }}
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{ color: active ? "#7c5cfc" : "rgba(22,19,46,0.3)", position: "relative" }}
                  />
                  <span
                    className="text-[9px] font-semibold tracking-wide relative"
                    style={{ fontFamily: "Outfit", color: active ? "#7c5cfc" : "rgba(22,19,46,0.3)" }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ feedFilter, setFeedFilter, posts, likedPosts, savedPosts, onLike, onSave }: any) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-0.5">Welcome back</p>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Ashok K
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <button className="relative w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center">
            <Bell size={16} className="text-foreground/60" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: GRAD }} />
          </button>
          <LetterAvatar name="Ashok" size={36} />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 pb-3 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {filterTabs.map((f, i) => (
          <button
            key={i}
            onClick={() => setFeedFilter(i)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200"
            style={{
              fontFamily: "Outfit",
              background: feedFilter === i ? GRAD : "#ffffff",
              color: feedFilter === i ? "#fff" : "rgba(22,19,46,0.45)",
              border: feedFilter === i ? "none" : "1px solid rgba(124,92,252,0.12)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
        {posts.map((post: any) => (
          <PostCard key={post.id} post={post} liked={likedPosts.has(post.id)} saved={savedPosts.has(post.id)} onLike={onLike} onSave={onSave} />
        ))}
      </div>

      {/* FAB */}
      <button
        className="absolute bottom-20 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: GRAD, boxShadow: "0 8px 24px rgba(124,92,252,0.5)" }}
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  );
}

function PostCard({ post, liked, saved, onLike, onSave }: any) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#ffffff", border: "1px solid rgba(124,92,252,0.1)", boxShadow: "0 2px 12px rgba(124,92,252,0.06)" }}
    >
      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <LetterAvatar name={post.author} size={38} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>{post.author}</p>
          <p className="text-xs text-muted-foreground">{post.handle} · {post.time}</p>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: "rgba(124,92,252,0.1)", color: "#7c5cfc", fontFamily: "Outfit" }}
        >
          {post.category}
        </span>
      </div>

      {/* Title + excerpt */}
      <div className="px-4 pb-3">
        <h3 className="text-sm font-bold leading-tight mb-1.5" style={{ fontFamily: "Outfit", color: "#16132e" }}>
          {post.title}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{post.excerpt}</p>
      </div>

      {/* Cover image */}
      <div className="mx-4 mb-3 rounded-xl overflow-hidden h-40 bg-secondary">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
      </div>

      {/* Actions */}
      <div className="flex items-center px-4 pb-4 gap-1">
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200"
          style={{ background: liked ? "rgba(224,64,251,0.1)" : "rgba(22,19,46,0.04)" }}
        >
          <Heart size={14} style={{ color: liked ? "#e040fb" : "rgba(22,19,46,0.4)", fill: liked ? "#e040fb" : "none" }} />
          <span className="text-xs font-medium" style={{ color: liked ? "#e040fb" : "rgba(22,19,46,0.4)" }}>
            {post.likes + (liked && !post.liked ? 1 : 0)}
          </span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(22,19,46,0.04)" }}>
          <MessageSquare size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{post.comments}</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(22,19,46,0.04)" }}>
          <Share2 size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{post.shares}</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onSave(post.id)}
          className="p-2 rounded-full transition-all duration-200"
          style={{ background: saved ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.04)" }}
        >
          <Bookmark size={14} style={{ color: saved ? "#7c5cfc" : "rgba(22,19,46,0.4)", fill: saved ? "#7c5cfc" : "none" }} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUIZZES SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function QuizzesScreen({ quizCat, setQuizCat, quizzes }: any) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Quizzes</h1>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.15)" }}
        >
          <BookOpen size={16} style={{ color: "#7c5cfc" }} />
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-3 shrink-0">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#ede9ff", border: "1px solid rgba(124,92,252,0.12)" }}>
          <Search size={15} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Search quizzes…</span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-5 pb-4 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {quizCategories.map((c, i) => (
          <button
            key={i}
            onClick={() => setQuizCat(i)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200"
            style={{
              fontFamily: "Outfit",
              background: quizCat === i ? GRAD : "#ffffff",
              color: quizCat === i ? "#fff" : "rgba(22,19,46,0.45)",
              border: quizCat === i ? "none" : "1px solid rgba(124,92,252,0.12)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
        <div className="grid grid-cols-2 gap-3">
          {quizzes.map((q: any) => (
            <QuizCard key={q.id} quiz={q} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz }: any) {
  const live = quiz.status === "Live";
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#ffffff", border: "1px solid rgba(124,92,252,0.1)", boxShadow: "0 2px 12px rgba(124,92,252,0.06)" }}>
      {/* Gradient cover */}
      <div className="h-28 relative flex items-center justify-center" style={{ background: quiz.gradient }}>
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <HelpCircle size={24} className="text-white" />
        </div>
        <div
          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            fontFamily: "Outfit",
            background: live ? "rgba(34,197,94,0.25)" : "rgba(0,0,0,0.35)",
            color: live ? "#16a34a" : "rgba(22,19,46,0.6)",
            backdropFilter: "blur(8px)",
            border: live ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(22,19,46,0.15)",
          }}
        >
          {live ? "● Live" : "Ended"}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <p className="text-xs font-bold leading-tight line-clamp-2" style={{ fontFamily: "Outfit", color: "#16132e" }}>
          {quiz.title}
        </p>
        <div className="flex items-center gap-2 mt-auto">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={10} /> {quiz.duration}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HelpCircle size={10} /> {quiz.questions}Q
          </span>
        </div>
        <button
          className="w-full py-1.5 rounded-xl text-xs font-bold mt-1"
          style={{
            fontFamily: "Outfit",
            background: live ? GRAD : "rgba(22,19,46,0.06)",
            color: live ? "#fff" : "rgba(22,19,46,0.4)",
          }}
        >
          {live ? "Join Now" : "View Results"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FRIENDS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function FriendsScreen({ friendTab, setFriendTab, friends, addedFriends, onAdd }: any) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-1 pb-4 shrink-0">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Friends</h1>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.15)" }}>
          <Search size={15} style={{ color: "#7c5cfc" }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-5 mb-4 shrink-0 gap-1 rounded-2xl mx-5" style={{ background: "#ede9ff", border: "1px solid rgba(124,92,252,0.12)", padding: "4px" }}>
        {friendTabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setFriendTab(i)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              fontFamily: "Outfit",
              background: friendTab === i ? GRAD : "transparent",
              color: friendTab === i ? "#fff" : "rgba(22,19,46,0.4)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-2 pb-4" style={{ scrollbarWidth: "none" }}>
        {friends.map((f: any) => (
          <FriendRow key={f.id} friend={f} added={addedFriends.has(f.id)} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

function FriendRow({ friend, added, onAdd }: any) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: "#ffffff", border: "1px solid rgba(124,92,252,0.1)", boxShadow: "0 2px 12px rgba(124,92,252,0.06)" }}
    >
      <div className="relative">
        <LetterAvatar name={friend.name} size={42} />
        {friend.online && (
          <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ fontFamily: "Outfit" }}>{friend.name}</p>
        <p className="text-xs text-muted-foreground truncate">{friend.handle}</p>
        <p className="text-xs mt-0.5" style={{ color: "#7c5cfc" }}>{friend.mutual} mutual friends</p>
      </div>
      <button
        onClick={() => onAdd(friend.id)}
        className="px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all duration-200 flex items-center gap-1"
        style={{
          fontFamily: "Outfit",
          background: added ? "rgba(34,197,94,0.15)" : GRAD,
          color: added ? "#4ade80" : "#fff",
          border: added ? "1px solid rgba(74,222,128,0.3)" : "none",
        }}
      >
        {added ? <><Check size={11} /> Added</> : <><UserPlus size={11} /> Add</>}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGES SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function MessagesScreen({ messages }: any) {
  const [open, setOpen] = useState<number | null>(null);

  if (open !== null) {
    const conv = messages.find((m: any) => m.id === open);
    return <ChatView conv={conv} onBack={() => setOpen(null)} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Messages</h1>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.15)" }}>
          <Search size={15} style={{ color: "#7c5cfc" }} />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 mb-4 shrink-0">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-2.5" style={{ background: "#ede9ff", border: "1px solid rgba(124,92,252,0.12)" }}>
          <Search size={14} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Search conversations…</span>
        </div>
      </div>

      {/* Online row */}
      <div className="px-5 mb-4 shrink-0">
        <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wider" style={{ fontFamily: "Outfit" }}>Active Now</p>
        <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {messages.filter((m: any) => m.online).map((m: any) => (
            <button key={m.id} onClick={() => setOpen(m.id)} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="relative">
                <LetterAvatar name={m.name} size={44} />
                <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-background" />
              </div>
              <span className="text-xs text-muted-foreground truncate w-12 text-center" style={{ fontFamily: "Outfit" }}>
                {m.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-1.5 pb-4" style={{ scrollbarWidth: "none" }}>
        {messages.map((m: any) => (
          <button
            key={m.id}
            onClick={() => setOpen(m.id)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left w-full transition-all duration-150 hover:bg-secondary/60"
            style={{ background: "#ffffff", border: "1px solid rgba(124,92,252,0.1)", boxShadow: "0 2px 12px rgba(124,92,252,0.06)" }}
          >
            <div className="relative shrink-0">
              <LetterAvatar name={m.name} size={44} />
              {m.online && <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-card" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-bold truncate" style={{ fontFamily: "Outfit" }}>{m.name}</p>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{m.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{m.last}</p>
            </div>
            {m.unread > 0 && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: GRAD, color: "#fff", fontFamily: "Outfit" }}
              >
                {m.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatView({ conv, onBack }: any) {
  const [input, setInput] = useState("");
  const chatMessages = [
    { id: 1, me: false, text: "Hey! Did you check the new quiz?", time: "9:30 AM" },
    { id: 2, me: true, text: "Not yet! Which one?", time: "9:31 AM" },
    { id: 3, me: false, text: "The General Science one — it's really good. I scored 85%!", time: "9:32 AM" },
    { id: 4, me: true, text: "Nice! I'll try it after work. Want to compete?", time: "9:33 AM" },
    { id: 5, me: false, text: "Definitely! Let me know when you're ready 🎯", time: "9:34 AM" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-1 pb-3 shrink-0" style={{ borderBottom: "1px solid rgba(124,92,252,0.1)" }}>
        <button onClick={onBack} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,92,252,0.08)" }}>
          <ArrowLeft size={16} className="text-foreground/70" />
        </button>
        <div className="relative">
          <LetterAvatar name={conv.name} size={36} />
          {conv.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-background" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ fontFamily: "Outfit" }}>{conv.name}</p>
          <p className="text-xs text-green-400">{conv.online ? "Online" : "Offline"}</p>
        </div>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,92,252,0.08)" }}><Phone size={14} className="text-foreground/60" /></button>
          <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,92,252,0.08)" }}><Video size={14} className="text-foreground/60" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.me ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[78%] px-4 py-2.5 rounded-2xl"
              style={{
                background: msg.me ? GRAD : "#ede9ff",
                borderRadius: msg.me ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              }}
            >
              <p className="text-sm leading-relaxed" style={{ color: msg.me ? "#fff" : "#16132e" }}>{msg.text}</p>
              <p className="text-xs mt-1" style={{ color: msg.me ? "rgba(255,255,255,0.6)" : "rgba(22,19,46,0.4)" }}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2" style={{ background: "#ede9ff", border: "1px solid rgba(124,92,252,0.15)" }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{ fontFamily: "Inter" }}
          />
          <button
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: GRAD }}
          >
            <Send size={13} className="text-white" style={{ transform: "translateX(1px)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function ProfileScreen({ profileTab, setProfileTab }: any) {
  const stats = [
    { label: "Friends", value: "0" },
    { label: "Posts", value: "0" },
    { label: "Quizzes", value: "0" },
    { label: "Avg Score", value: "0%" },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Profile</h1>
        <div className="flex gap-2">
          {[BarChart2, History, Settings].map((Icon, i) => (
            <button key={i} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.1)" }}>
              <Icon size={14} className="text-foreground/60" />
            </button>
          ))}
        </div>
      </div>

      {/* Banner + avatar */}
      <div className="mx-5 rounded-3xl overflow-hidden mb-4 relative" style={{ height: 140 }}>
        <div className="absolute inset-0" style={{ background: GRAD2 }} />
        {/* Decorative blobs */}
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20" style={{ background: "#fff" }} />
        <div className="absolute bottom-0 left-10 w-16 h-16 rounded-full opacity-10" style={{ background: "#fff" }} />
        <div className="absolute bottom-3 left-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white border-2 border-white/30"
            style={{ fontFamily: "Outfit", background: "rgba(255,255,255,0.35)", backdropFilter: "blur(8px)" }}
          >
            A
          </div>
        </div>
        <button
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ fontFamily: "Outfit", background: "rgba(255,255,255,0.35)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}
        >
          Edit Profile
        </button>
      </div>

      {/* Name + handle */}
      <div className="px-5 mb-4">
        <h2 className="text-lg font-black" style={{ fontFamily: "Outfit" }}>ashok k</h2>
        <p className="text-sm text-muted-foreground">@ashokkujur_3559</p>
        <p className="text-xs text-muted-foreground mt-1">Learning every day · Joined June 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 px-5 mb-5">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex flex-col items-center py-3 rounded-2xl"
            style={{ background: "#ffffff", border: "1px solid rgba(124,92,252,0.1)", boxShadow: "0 2px 12px rgba(124,92,252,0.06)" }}
          >
            <span className="text-base font-black" style={{ fontFamily: "Outfit", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {s.value}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "Outfit" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Profile tabs */}
      <div className="flex mx-5 mb-4 rounded-2xl p-1 gap-1" style={{ background: "#ede9ff", border: "1px solid rgba(124,92,252,0.12)" }}>
        {profileTabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setProfileTab(i)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              fontFamily: "Outfit",
              background: profileTab === i ? GRAD : "transparent",
              color: profileTab === i ? "#fff" : "rgba(22,19,46,0.4)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1"
          style={{ background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.15)" }}
        >
          {profileTab === 0 && <Globe size={26} style={{ color: "#7c5cfc" }} />}
          {profileTab === 1 && <Zap size={26} style={{ color: "#7c5cfc" }} />}
          {profileTab === 2 && <Users size={26} style={{ color: "#7c5cfc" }} />}
        </div>
        <p className="text-sm font-semibold text-center" style={{ fontFamily: "Outfit" }}>
          {profileTab === 0 && "No posts yet"}
          {profileTab === 1 && "No quiz results yet"}
          {profileTab === 2 && "No friends yet"}
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-[220px]">
          {profileTab === 0 && "Share your knowledge with the Meenzo community"}
          {profileTab === 1 && "Take your first quiz to see results here"}
          {profileTab === 2 && "Connect with people to grow your network"}
        </p>
        <button
          className="mt-1 px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ fontFamily: "Outfit", background: GRAD, color: "#fff" }}
        >
          {profileTab === 0 && "Create a Post"}
          {profileTab === 1 && "Browse Quizzes"}
          {profileTab === 2 && "Find Friends"}
        </button>
      </div>
    </div>
  );
}
