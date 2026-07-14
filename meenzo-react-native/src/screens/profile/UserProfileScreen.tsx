import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageCircle, UserPlus, Check, Clock, Globe } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FriendsStackParamList, MessagesStackParamList } from '../../navigation/types';
import * as authApi from '../../api/services/auth';
import * as friendsApi from '../../api/services/friends';
import * as postsApi from '../../api/services/posts';
import * as messagesApi from '../../api/services/messages';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { GRAD, GRAD2, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import PostCard from '../../components/posts/PostCard';
import EmptyState from '../../components/ui/EmptyState';
import type { User, Post, FriendStatus } from '../../types';

// This screen is registered identically in both FriendsStack and MessagesStack, so accept
// either navigator's prop shape rather than committing to one.
type Props = NativeStackScreenProps<FriendsStackParamList | MessagesStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = route.params;
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<FriendStatus>('none');
  const [requestId, setRequestId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, statusRes, postsRes] = await Promise.all([
        authApi.getUser(userId),
        friendsApi.fetchStatus(userId),
        postsApi.fetchUserPosts(userId),
      ]);
      setUser(userRes.user);
      setStatus(statusRes.status);
      setRequestId(statusRes.requestId);
      setPosts(postsRes.posts);
    } catch {
      // keep screen usable even if one call fails
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onAddFriend = async () => {
    setActionBusy(true);
    try {
      await friendsApi.sendRequest(userId);
      setStatus('request_sent');
    } finally {
      setActionBusy(false);
    }
  };

  const onAccept = async () => {
    if (!requestId) return;
    setActionBusy(true);
    try {
      await friendsApi.acceptRequest(requestId);
      setStatus('accepted');
    } finally {
      setActionBusy(false);
    }
  };

  const onMessage = async () => {
    const res = await messagesApi.openConversation(userId);
    // This screen is registered in both FriendsStack and MessagesStack, but only the latter
    // has a 'Chat' route. Go up to the parent tab navigator and target MessagesStack directly
    // so this works no matter which stack we were opened from.
    (navigation as any).getParent()?.navigate('MessagesStack', {
      screen: 'Chat',
      params: {
        conversationId: res.data._id,
        otherUserName: user?.name ?? 'User',
        otherUserAvatar: user?.avatar,
        otherUserId: userId,
      },
    });
  };

  if (loading || !user) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.flex, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.bannerWrap}>
        <LinearGradient colors={GRAD2} start={DIAGONAL_START} end={DIAGONAL_END} style={StyleSheet.absoluteFill} />
        <View style={styles.avatarBadge}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>{user.name?.[0]?.toUpperCase() ?? '?'}</Text>
          )}
        </View>
      </View>

      <View style={styles.nameBlock}>
        <Text style={styles.name}>{user.name}</Text>
        {user.username ? <Text style={styles.handle}>@{user.username}</Text> : null}
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      <View style={styles.actionsRow}>
        {status === 'accepted' ? (
          <View style={[styles.actionBtn, styles.friendBtn]}>
            <Check size={13} color={colors.addedText} />
            <Text style={styles.friendBtnText}>Friends</Text>
          </View>
        ) : status === 'request_sent' ? (
          <View style={[styles.actionBtn, styles.pendingBtn]}>
            <Clock size={13} color={colors.mutedForeground} />
            <Text style={styles.pendingBtnText}>Requested</Text>
          </View>
        ) : status === 'request_received' ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onAccept} disabled={actionBusy}>
            <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.actionBtn}>
              <Check size={13} color="#fff" />
              <Text style={styles.actionBtnTextLight}>Accept Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity activeOpacity={0.85} onPress={onAddFriend} disabled={actionBusy}>
            <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.actionBtn}>
              <UserPlus size={13} color="#fff" />
              <Text style={styles.actionBtnTextLight}>Add Friend</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity activeOpacity={0.85} style={[styles.actionBtn, styles.messageBtn]} onPress={onMessage}>
          <MessageCircle size={13} color={colors.primary} />
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Posts</Text>
      <View style={styles.postsWrap}>
        {posts.length === 0 ? (
          <EmptyState icon={Globe} title="No posts yet" subtitle={`${user.name} hasn't shared anything yet.`} />
        ) : (
          <View style={{ gap: 12 }}>
            {posts.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.foreground },
  bannerWrap: { marginHorizontal: 20, height: 110, borderRadius: 24, overflow: 'hidden', marginBottom: 44, alignItems: 'center' },
  avatarBadge: {
    position: 'absolute',
    bottom: -32,
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.primary },
  nameBlock: { alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  name: { fontFamily: fonts.headingBlack, fontSize: 18, color: colors.foreground },
  handle: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  bio: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, marginTop: 6, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24, paddingHorizontal: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnTextLight: { fontFamily: fonts.headingBold, fontSize: 12, color: '#fff' },
  friendBtn: { backgroundColor: colors.addedBg, borderWidth: 1, borderColor: colors.addedBorder },
  friendBtnText: { fontFamily: fonts.headingBold, fontSize: 12, color: colors.addedText },
  pendingBtn: { backgroundColor: colors.actionPillBg },
  pendingBtnText: { fontFamily: fonts.headingBold, fontSize: 12, color: colors.mutedForeground },
  messageBtn: { backgroundColor: colors.softPrimaryBg, borderWidth: 1, borderColor: colors.borderStrong },
  messageBtnText: { fontFamily: fonts.headingBold, fontSize: 12, color: colors.primary },
  sectionTitle: { fontFamily: fonts.headingSemiBold, fontSize: 14, color: colors.foreground, paddingHorizontal: 20, marginBottom: 12 },
  postsWrap: { paddingHorizontal: 20 },
});
