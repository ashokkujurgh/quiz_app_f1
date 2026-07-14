import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart2, History, Settings, Globe, Zap, Users } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAllFriendData } from '../../store/slices/friendsSlice';
import * as postsApi from '../../api/services/posts';
import * as quizzesApi from '../../api/services/quizzes';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { GRAD2, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import GradientText from '../../components/ui/GradientText';
import PostCard from '../../components/posts/PostCard';
import FriendRow from '../../components/friends/FriendRow';
import EmptyState from '../../components/ui/EmptyState';
import type { Post, QuizHistoryEntry } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyProfile'>;

const TABS = ['Posts', 'Quiz Results', 'Friends'];

export default function MyProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { friends } = useAppSelector((s) => s.friends);
  const [tab, setTab] = useState(0);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myHistory, setMyHistory] = useState<QuizHistoryEntry[]>([]);

  const load = useCallback(() => {
    if (!user) return;
    dispatch(fetchAllFriendData());
    postsApi.fetchUserPosts(user._id).then((res) => setMyPosts(res.posts)).catch(() => undefined);
    quizzesApi.fetchMyHistory().then((res) => setMyHistory(res.history)).catch(() => undefined);
  }, [dispatch, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const avgScore = myHistory.length ? Math.round(myHistory.reduce((sum, h) => sum + h.percentage, 0) / myHistory.length) : 0;
  const stats = [
    { label: 'Friends', value: String(friends.length) },
    { label: 'Posts', value: String(myPosts.length) },
    { label: 'Quizzes', value: String(myHistory.length) },
    { label: 'Avg Score', value: `${avgScore}%` },
  ];

  return (
    <ScrollView style={[styles.flex, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Leaderboard')}>
            <BarChart2 size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => (navigation as any).getParent()?.navigate('QuizzesStack', { screen: 'QuizHistory', params: {} })}
          >
            <History size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
            <Settings size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bannerWrap}>
        <LinearGradient colors={GRAD2} start={DIAGONAL_START} end={DIAGONAL_END} style={StyleSheet.absoluteFill} />
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <View style={styles.avatarBadge}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>{user.name?.[0]?.toUpperCase() ?? 'M'}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.nameBlock}>
        <Text style={styles.name}>{user.name}</Text>
        {user.username ? <Text style={styles.handle}>@{user.username}</Text> : null}
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <GradientText style={styles.statValue}>{s.value}</GradientText>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs items={TABS} activeIndex={tab} onChange={setTab} />
      </View>

      <View style={styles.tabContent}>
        {tab === 0 &&
          (myPosts.length === 0 ? (
            <EmptyState icon={Globe} title="No posts yet" subtitle="Share your knowledge with the Meenzo community." ctaLabel="Create a Post" />
          ) : (
            <View style={{ gap: 12 }}>
              {myPosts.map((p) => (
                <PostCard key={p._id} post={p} />
              ))}
            </View>
          ))}

        {tab === 1 &&
          (myHistory.length === 0 ? (
            <EmptyState icon={Zap} title="No quiz results yet" subtitle="Take your first quiz to see results here." ctaLabel="Browse Quizzes" />
          ) : (
            <View style={{ gap: 10 }}>
              {myHistory.map((h, i) => (
                <View key={`${h.quizId}-${i}`} style={styles.historyRow}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {h.quizTitle ?? 'Quiz'}
                  </Text>
                  <Text style={styles.historyScore}>
                    {h.score}/{h.total} · {Math.round(h.percentage)}%
                  </Text>
                </View>
              ))}
            </View>
          ))}

        {tab === 2 &&
          (friends.length === 0 ? (
            <EmptyState icon={Users} title="No friends yet" subtitle="Connect with people to grow your network." ctaLabel="Find Friends" />
          ) : (
            <View style={{ gap: 10 }}>
              {friends
                .filter((f) => !!f?._id)
                .map((f) => (
                  <FriendRow key={f._id} userId={f._id} name={f.name} username={f.username} avatar={f.avatar} action={{ type: 'none' }} />
                ))}
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.foreground },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.softPrimaryBg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bannerWrap: { marginHorizontal: 20, height: 140, borderRadius: 24, overflow: 'hidden', marginBottom: 16 },
  blobA: { position: 'absolute', top: -16, right: -16, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.2)' },
  blobB: { position: 'absolute', bottom: 0, left: 40, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  avatarBadge: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontFamily: fonts.headingBlack, fontSize: 26, color: '#fff' },
  editBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  editBtnText: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: '#fff' },
  nameBlock: { paddingHorizontal: 20, marginBottom: 16 },
  name: { fontFamily: fonts.headingBlack, fontSize: 18, color: colors.foreground },
  handle: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  bio: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, marginTop: 6 },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  statValue: { fontFamily: fonts.headingBlack, fontSize: 16 },
  statLabel: { fontFamily: fonts.headingSemiBold, fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  tabsWrap: { paddingHorizontal: 20, marginBottom: 16 },
  tabContent: { paddingHorizontal: 20, minHeight: 200 },
  historyRow: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground, flex: 1, marginRight: 8 },
  historyScore: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.primary },
});
