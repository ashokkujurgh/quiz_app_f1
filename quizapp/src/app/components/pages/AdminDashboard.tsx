import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Stack, Chip, Tabs, Tab,
  Table, TableHead, TableRow, TableCell, TableBody, Avatar, Button,
  LinearProgress,
} from '@mui/material';
import {
  People, Quiz, Article, TrendingUp, CheckCircle, Block,
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { mockUsers, mockQuizzes } from '../../data/mockData';
import { UserAvatar } from '../shared/UserAvatar';
import { TopicChip } from '../shared/TopicChip';

const usersOverTime = [
  { month: 'Jan', users: 120, quizzes: 340 },
  { month: 'Feb', users: 210, quizzes: 520 },
  { month: 'Mar', users: 380, quizzes: 710 },
  { month: 'Apr', users: 450, quizzes: 890 },
  { month: 'May', users: 620, quizzes: 1200 },
  { month: 'Jun', users: 780, quizzes: 1540 },
];

const categoryData = [
  { name: 'Physics', value: 18 },
  { name: 'General', value: 24 },
  { name: 'History', value: 14 },
  { name: 'Tech', value: 22 },
  { name: 'Math', value: 12 },
  { name: 'Geo', value: 10 },
];

const PIE_COLORS = ['#5563DE', '#E91E8C', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6'];

const stats = [
  { label: 'Total Users', value: '1,284', icon: People, color: '#5563DE', change: '+12%' },
  { label: 'Total Quizzes', value: '248', icon: Quiz, color: '#E91E8C', change: '+5%' },
  { label: 'Quiz Attempts', value: '45.2K', icon: TrendingUp, color: '#22c55e', change: '+24%' },
  { label: 'Active Posts', value: '3,891', icon: Article, color: '#f59e0b', change: '+8%' },
];

export function AdminDashboard() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} mb={3}>Admin Dashboard</Typography>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map(({ label, value, icon: Icon, color, change }) => (
          <Grid item xs={12} sm={6} md={3} key={label}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h4" fontWeight={800}>{value}</Typography>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: 2,
                      bgcolor: `${color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ color, fontSize: 24 }} />
                  </Box>
                </Stack>
                <Chip
                  label={change}
                  size="small"
                  color="success"
                  sx={{ mt: 1, height: 20, fontSize: '0.7rem' }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Users & Attempts trend */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Growth Trend</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={usersOverTime}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5563DE" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5563DE" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E91E8C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E91E8C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#5563DE" fill="url(#colorUsers)" strokeWidth={2} name="New Users" />
                  <Area type="monotone" dataKey="quizzes" stroke="#E91E8C" fill="url(#colorQuizzes)" strokeWidth={2} name="Quiz Attempts" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Category Distribution</Typography>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Management Tabs */}
      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Users" sx={{ fontWeight: 600 }} />
            <Tab label="Quizzes" sx={{ fontWeight: 600 }} />
            <Tab label="Posts" sx={{ fontWeight: 600 }} />
          </Tabs>

          {/* Users Table */}
          {tab === 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><Typography variant="caption" fontWeight={700}>User</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Username</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Role</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Quizzes</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Avg Score</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Actions</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <UserAvatar user={u} size={32} />
                        <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">@{u.username}</Typography></TableCell>
                    <TableCell>
                      <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : 'default'} sx={{ fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell><Typography variant="body2">{u.stats.quizzesTaken}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2">{u.stats.averageScore}%</Typography>
                        <LinearProgress variant="determinate" value={u.stats.averageScore} sx={{ width: 40, height: 4, borderRadius: 2 }} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" startIcon={<CheckCircle />} color="success" sx={{ minWidth: 0, px: 0.5 }}>Verify</Button>
                        <Button size="small" startIcon={<Block />} color="error" sx={{ minWidth: 0, px: 0.5 }}>Ban</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Quizzes Table */}
          {tab === 1 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><Typography variant="caption" fontWeight={700}>Quiz</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Category</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Difficulty</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Plays</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Rating</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Actions</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockQuizzes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell><Typography variant="body2" fontWeight={600}>{q.title}</Typography></TableCell>
                    <TableCell><TopicChip topic={q.category} /></TableCell>
                    <TableCell>
                      <Chip label={q.difficulty} size="small"
                        color={q.difficulty === 'Easy' ? 'success' : q.difficulty === 'Medium' ? 'warning' : 'error'}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2">{q.plays.toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="body2">⭐ {q.rating}</Typography></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" color="primary" sx={{ minWidth: 0, px: 0.5 }}>Edit</Button>
                        <Button size="small" color="error" sx={{ minWidth: 0, px: 0.5 }}>Remove</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Posts Moderation */}
          {tab === 2 && (
            <Typography color="text.secondary" textAlign="center" py={4}>
              Post moderation panel — all posts are visible in the feed.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
