import { useState, useRef, useEffect, useCallback } from 'react';
import logoUrl from '../../../assets/logo.png';
import { useNavigate } from 'react-router';
import {
  AppBar, Toolbar, Box, IconButton, Typography, InputBase,
  Badge, Menu, MenuItem, Avatar, Stack, Divider, ListItemIcon,
  Tooltip, alpha, useTheme, Paper, CircularProgress, Chip,
} from '@mui/material';
import {
  Search, Message, LightMode, DarkMode,
  Settings, Logout, Person, EmojiEvents, Menu as MenuIcon,
  Quiz as QuizIcon, Article, People,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { UserAvatar } from '../shared/UserAvatar';
import { apiFetch } from '../../utils/apiFetch';

const DRAWER_WIDTH = 260;

interface SearchResult {
  quizzes: { _id: string; title: string; subTopic?: string }[];
  people:  { _id: string; username: string; name?: string; avatar?: string | null }[];
  posts:   { _id: string; content: string; topic?: string }[];
}

interface Props { onMenuToggle: () => void; }

export function Navbar({ onMenuToggle }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const muiTheme = useTheme();
  const { user } = useAppSelector((s) => s.auth);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const unreadMessages = useAppSelector((s) =>
    Object.values(s.messages.unreadByConv).reduce((a, c) => a + c, 0)
  );

  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

  // Search
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const searchRef                 = useRef<HTMLDivElement>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults(null); setShowDrop(false); return; }
    setSearching(true);
    setShowDrop(true);
    try {
      const [qRes, pRes, postRes] = await Promise.all([
        apiFetch(`/api/quizzes?q=${encodeURIComponent(q)}`).then((r) => r.json()),
        apiFetch(`/api/auth/users/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
        apiFetch(`/api/posts?q=${encodeURIComponent(q)}&limit=5`).then((r) => r.json()),
      ]);
      setResults({
        quizzes: qRes.quizzes?.slice(0, 5)  ?? [],
        people:  pRes.users?.slice(0, 5)    ?? [],
        posts:   postRes.posts?.slice(0, 5) ?? [],
      });
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults(null); setShowDrop(false); return; }
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goTo = (path: string) => { setShowDrop(false); setQuery(''); navigate(path); };

  const hasResults = results && (results.quizzes.length + results.people.length + results.posts.length) > 0;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: muiTheme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        left: 0, right: 0,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: '64px !important' }}>
        {/* Hamburger + Logo */}
        <IconButton onClick={onMenuToggle} sx={{ display: { md: 'none' } }}>
          <MenuIcon />
        </IconButton>
        <Box
          component="img"
          src={logoUrl}
          alt="Meenzo"
          sx={{ height: 40, maxWidth: 140, objectFit: 'contain', cursor: 'pointer', display: { xs: 'none', sm: 'block' } }}
          onClick={() => navigate('/home')}
        />

        {/* Search */}
        <Box ref={searchRef}
          sx={{ flex: 1, maxWidth: 420, mx: 2, display: { xs: 'none', sm: 'block' }, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: alpha(muiTheme.palette.text.primary, 0.06), borderRadius: 3, px: 2, py: 0.5, gap: 1 }}>
            {searching
              ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
              : <Search sx={{ color: 'text.secondary', fontSize: 20 }} />}
            <InputBase
              placeholder="Search quizzes, people, posts…"
              fullWidth
              value={query}
              sx={{ fontSize: '0.875rem' }}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => { if (results) setShowDrop(true); }}
            />
          </Box>

          {/* Dropdown */}
          {showDrop && (
            <Paper elevation={8} sx={{ position: 'absolute', top: '110%', left: 0, right: 0, borderRadius: 3, overflow: 'hidden', zIndex: 9999, maxHeight: 480, overflowY: 'auto' }}>
              {searching && !results && (
                <Box py={3} textAlign="center"><CircularProgress size={20} /></Box>
              )}

              {!searching && !hasResults && (
                <Box py={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">No results for "{query}"</Typography>
                </Box>
              )}

              {/* Quizzes */}
              {!!results?.quizzes.length && (
                <>
                  <Box px={2} pt={1.5} pb={0.5}>
                    <Chip icon={<QuizIcon sx={{ fontSize: 14 }} />} label="Quizzes" size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
                  </Box>
                  {results.quizzes.map((q) => (
                    <MenuItem key={q._id} onClick={() => goTo('/quizzes')} sx={{ py: 1, gap: 1.5 }}>
                      <QuizIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      <Box>
                        <Typography fontSize={13} fontWeight={600}>{q.title}</Typography>
                        {q.subTopic && <Typography variant="caption" color="text.secondary">{q.subTopic}</Typography>}
                      </Box>
                    </MenuItem>
                  ))}
                </>
              )}

              {/* People */}
              {!!results?.people.length && (
                <>
                  {!!results?.quizzes.length && <Divider />}
                  <Box px={2} pt={1.5} pb={0.5}>
                    <Chip icon={<People sx={{ fontSize: 14 }} />} label="People" size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
                  </Box>
                  {results.people.map((p) => (
                    <MenuItem key={p._id} onClick={() => goTo(`/profile/${p._id}`)} sx={{ py: 1, gap: 1.5 }}>
                      <Avatar src={p.avatar ?? undefined} sx={{ width: 30, height: 30, fontSize: 13 }}>
                        {(p.name ?? p.username)[0]?.toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography fontSize={13} fontWeight={600}>{p.name ?? p.username}</Typography>
                        <Typography variant="caption" color="text.secondary">@{p.username}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </>
              )}

              {/* Posts */}
              {!!results?.posts.length && (
                <>
                  {(!!results?.quizzes.length || !!results?.people.length) && <Divider />}
                  <Box px={2} pt={1.5} pb={0.5}>
                    <Chip icon={<Article sx={{ fontSize: 14 }} />} label="Posts" size="small" sx={{ fontWeight: 700, fontSize: 11 }} />
                  </Box>
                  {results.posts.map((p) => (
                    <MenuItem key={p._id} onClick={() => goTo(`/posts/${p._id}`)} sx={{ py: 1, gap: 1.5 }}>
                      <Article fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography fontSize={13} noWrap sx={{ maxWidth: 300 }}>
                        {p.content?.slice(0, 80)}{(p.content?.length ?? 0) > 80 ? '…' : ''}
                      </Typography>
                    </MenuItem>
                  ))}
                </>
              )}
            </Paper>
          )}
        </Box>

        <Box flex={1} />

        {/* Actions */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={() => dispatch(toggleTheme())} size="small">
              {themeMode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Messages">
            <IconButton size="small" onClick={() => navigate('/messages')}>
              <Badge badgeContent={unreadMessages} color="primary">
                <Message />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profile">
            <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
              {user ? <UserAvatar user={user} size={34} /> : <Avatar sx={{ width: 34, height: 34 }} />}
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Profile Menu */}
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          PaperProps={{ sx: { width: 220, borderRadius: 3 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>{user?.name ?? ''}</Typography>
            <Typography variant="caption" color="text.secondary">@{user?.username ?? ''}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { navigate('/profile'); setProfileAnchor(null); }}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { navigate('/leaderboard'); setProfileAnchor(null); }}>
            <ListItemIcon><EmojiEvents fontSize="small" /></ListItemIcon>
            Leaderboard
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); setProfileAnchor(null); }}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { dispatch(logout()); navigate('/login'); setProfileAnchor(null); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
