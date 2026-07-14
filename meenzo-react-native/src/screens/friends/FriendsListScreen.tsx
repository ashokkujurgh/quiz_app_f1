import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Users, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FriendsStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchAllFriendData,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
} from '../../store/slices/friendsSlice';
import * as authApi from '../../api/services/auth';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import SearchBar from '../../components/ui/SearchBar';
import IconButton from '../../components/ui/IconButton';
import FriendRow, { type FriendRowAction } from '../../components/friends/FriendRow';
import EmptyState from '../../components/ui/EmptyState';
import type { User } from '../../types';

const TABS = ['Friends', 'Incoming', 'Sent', 'Suggestions'];

type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendsList'>;

export default function FriendsListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { friends, incoming, outgoing, suggestions, loading } = useAppSelector((s) => s.friends);
  const [tab, setTab] = useState(0);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchAllFriendData());
  }, [dispatch]);

  useEffect(() => {
    if (!searching || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearchLoading(true);
      authApi
        .searchUsers(query.trim())
        .then((res) => setResults(res.users))
        .catch(() => setResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, searching]);

  type Row = { key: string; userId: string; name: string; username?: string; avatar?: string | null; mutual?: number; action: FriendRowAction };

  // The backend populates `user` via a Mongo ref; if the referenced account was deleted
  // the populate can come back null, so every field here is guarded. Rows are also deduped
  // by userId in case the same person appears twice (e.g. a stale/duplicate request record).
  const dedupe = (rows: Row[]): Row[] => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (!r.userId || seen.has(r.userId)) return false;
      seen.add(r.userId);
      return true;
    });
  };

  let data: Row[] = [];

  if (searching) {
    data = dedupe(
      results.map((u) => ({
        key: u._id,
        userId: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        action: { type: 'none' as const },
      })),
    );
  } else if (tab === 0) {
    data = dedupe(
      friends
        .filter((f) => !!f)
        .map((f) => ({
          key: f._id,
          userId: f._id,
          name: f.name,
          username: f.username,
          avatar: f.avatar,
          action: { type: 'none' as const },
        })),
    );
  } else if (tab === 1) {
    data = dedupe(
      incoming
        .filter((r) => !!r?.user?._id)
        .map((r) => ({
          key: r.requestId,
          userId: r.user._id,
          name: r.user.name,
          username: r.user.username,
          avatar: r.user.avatar,
          action: {
            type: 'incoming' as const,
            onAccept: () => dispatch(acceptFriendRequest(r.requestId)),
            onDecline: () => dispatch(declineFriendRequest(r.requestId)),
          },
        })),
    );
  } else if (tab === 2) {
    data = dedupe(
      outgoing
        .filter((r) => !!r?.user?._id)
        .map((r) => ({
          key: r.requestId,
          userId: r.user._id,
          name: r.user.name,
          username: r.user.username,
          avatar: r.user.avatar,
          action: { type: 'sent' as const, onCancel: () => dispatch(cancelFriendRequest(r.user._id)) },
        })),
    );
  } else {
    data = dedupe(
      suggestions
        .filter((f) => !!f)
        .map((f) => ({
          key: f._id,
          userId: f._id,
          name: f.name,
          username: f.username,
          avatar: f.avatar,
          action: { type: 'add' as const, onPress: () => dispatch(sendFriendRequest(f._id)) },
        })),
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <IconButton size={36} onPress={() => setSearching((s) => !s)}>
          {searching ? <X size={15} color={colors.primary} /> : <Search size={15} color={colors.primary} />}
        </IconButton>
      </View>

      {searching ? (
        <View style={styles.tabsWrap}>
          <SearchBar placeholder="Search people…" value={query} onChangeText={setQuery} />
        </View>
      ) : (
        <View style={styles.tabsWrap}>
          <SegmentedTabs items={TABS} activeIndex={tab} onChange={setTab} />
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FriendRow
            userId={item.userId}
            name={item.name}
            username={item.username}
            avatar={item.avatar}
            mutual={item.mutual}
            action={item.action}
            onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !loading && !searchLoading ? (
            <EmptyState
              icon={Users}
              title={searching ? 'No people found' : 'Nothing here yet'}
              subtitle={searching ? 'Try a different name or username.' : 'Connect with people to grow your network.'}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.foreground },
  tabsWrap: { paddingHorizontal: 20, marginBottom: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
});
