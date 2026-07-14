import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFeed, toggleLike, toggleSave } from '../../store/slices/postsSlice';
import * as topicsApi from '../../api/services/topics';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import PostCard from '../../components/posts/PostCard';
import LetterAvatar from '../../components/ui/LetterAvatar';
import GradientText from '../../components/ui/GradientText';
import type { SubTopic } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

export default function HomeFeedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { posts, loading } = useAppSelector((s) => s.posts);
  const user = useAppSelector((s) => s.auth.user);
  const [refreshing, setRefreshing] = useState(false);

  // Mirrors quizapp's HomePage.tsx: every topic's subtopics flattened into one row,
  // non-engineering subtopics first, engineering ones after. Selecting one filters
  // the feed server-side via GET /api/posts?subTopic=<name>.
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [subTopicsLoading, setSubTopicsLoading] = useState(true);
  const [activeSubTopicId, setActiveSubTopicId] = useState<string | null>(null);

  useEffect(() => {
    topicsApi
      .fetchTopics()
      .then(async (res) => {
        const activeTopics = res.topics.filter((t) => t.isActive !== false);
        const results = await Promise.all(
          activeTopics.map((t) =>
            topicsApi
              .fetchSubTopics(t._id)
              .then((r) => r.subtopics.filter((s) => s.isActive !== false))
              .catch(() => [] as SubTopic[]),
          ),
        );
        const flat = results.flat();
        const isEngineering = (s: SubTopic) => s.name.toLowerCase().includes('engineer');
        setSubTopics([...flat.filter((s) => !isEngineering(s)), ...flat.filter(isEngineering)]);
      })
      .catch(() => undefined)
      .finally(() => setSubTopicsLoading(false));
  }, []);

  const load = useCallback(
    (subTopicName?: string) => {
      dispatch(fetchFeed({ limit: 50, subTopic: subTopicName }));
    },
    [dispatch],
  );

  useEffect(() => {
    const activeSub = subTopics.find((s) => s._id === activeSubTopicId);
    load(activeSub?.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTopicId]);

  const onRefresh = async () => {
    setRefreshing(true);
    const activeSub = subTopics.find((s) => s._id === activeSubTopicId);
    await dispatch(fetchFeed({ limit: 50, subTopic: activeSub?.name }));
    setRefreshing(false);
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back</Text>
          <GradientText style={styles.name}>{user?.name ?? 'Meenzo'}</GradientText>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Bell size={16} color={colors.mutedForeground} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
          <LetterAvatar name={user?.name ?? 'M'} uri={user?.avatar} size={36} />
        </View>
      </View>

      {!subTopicsLoading && subTopics.length > 0 ? (
        <ScrollView
          style={styles.subTopicWrapOuter}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.subTopicWrap}
          nestedScrollEnabled
        >
          <TouchableOpacity onPress={() => setActiveSubTopicId(null)}>
            {activeSubTopicId === null ? (
              <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.subTopicPill}>
                <Text style={styles.subTopicTextActive}>All</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.subTopicPill, styles.subTopicPillInactive]}>
                <Text style={styles.subTopicTextInactive}>All</Text>
              </View>
            )}
          </TouchableOpacity>
          {subTopics.map((s) => {
            const active = s._id === activeSubTopicId;
            return (
              <TouchableOpacity key={s._id} onPress={() => setActiveSubTopicId(active ? null : s._id)}>
                {active ? (
                  <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.subTopicPill}>
                    <Text style={styles.subTopicTextActive}>{s.name}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.subTopicPill, styles.subTopicPillInactive]}>
                    <Text style={styles.subTopicTextInactive}>{s.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
            onLike={() => dispatch(toggleLike(item._id))}
            onSave={() => dispatch(toggleSave(item._id))}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity style={[styles.fab, { bottom: 24 }]} activeOpacity={0.85} onPress={() => navigation.navigate('CreatePost')}>
        <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.fabGradient}>
          <Plus size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  welcome: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  name: { fontFamily: fonts.headingBold, fontSize: 20 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  // Bounded height + vertical scroll (rather than one long horizontal row) so a large
  // subtopic list wraps into multiple rows and scrolls in place instead of pushing
  // the whole page down or requiring endless horizontal swiping.
  subTopicWrapOuter: { flexGrow: 0, flexShrink: 0, maxHeight: 116, marginBottom: 12 },
  subTopicWrap: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subTopicPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  subTopicPillInactive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.chipBorder },
  subTopicTextActive: { color: '#fff', fontFamily: fonts.headingSemiBold, fontSize: 12 },
  subTopicTextInactive: { color: colors.chipInactiveText, fontFamily: fonts.headingSemiBold, fontSize: 12 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyWrap: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontFamily: fonts.bodyRegular, color: colors.mutedForeground },
  fab: { position: 'absolute', right: 16 },
  fabGradient: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#7c5cfc', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 },
});
