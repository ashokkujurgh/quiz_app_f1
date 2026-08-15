import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, UsersRound } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchConversations } from '../../store/slices/messagesSlice';
import { usePresence } from '../../sockets/PresenceContext';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { relativeTime } from '../../utils/relativeTime';
import SearchBar from '../../components/ui/SearchBar';
import IconButton from '../../components/ui/IconButton';
import LetterAvatar from '../../components/ui/LetterAvatar';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { LinearGradient } from 'expo-linear-gradient';
import type { Conversation } from '../../types';

type Props = NativeStackScreenProps<MessagesStackParamList, 'ConversationsList'>;

function displayName(c: Conversation): string {
  if (c.isGroup) return c.name ?? 'Group';
  return c.otherUser?.name ?? c.otherUser?.username ?? 'Unknown';
}

function displayAvatar(c: Conversation): string | null | undefined {
  return c.isGroup ? c.icon : c.otherUser?.avatar;
}

export default function ConversationsListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { conversations, loadingConvs, unreadByConv } = useAppSelector((s) => s.messages);
  const { isOnline } = usePresence();
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchConversations());
    const unsub = navigation.addListener('focus', () => dispatch(fetchConversations()));
    return unsub;
  }, [navigation, dispatch]);

  const onlineConvs = conversations.filter((c) => !c.isGroup && c.otherUser?._id && isOnline(c.otherUser._id));
  const filtered = conversations.filter((c) => !search || displayName(c).toLowerCase().includes(search.toLowerCase()));

  const openChat = (conv: Conversation) => {
    navigation.navigate('Chat', {
      conversationId: conv._id,
      otherUserName: displayName(conv),
      otherUserAvatar: displayAvatar(conv),
      otherUserId: conv.otherUser?._id,
      isGroup: conv.isGroup,
    });
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <IconButton size={36} onPress={() => navigation.navigate('CreateGroup')}>
          <MessageCircle size={15} color={colors.primary} />
        </IconButton>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search conversations…" value={search} onChangeText={setSearch} />
      </View>

      {onlineConvs.length > 0 ? (
        <View style={styles.activeSection}>
          <Text style={styles.activeLabel}>Active Now</Text>
          <ScrollView horizontal style={styles.activeRowOuter} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeRow}>
            {onlineConvs.map((c) => (
              <TouchableOpacity key={c._id} style={styles.activeItem} onPress={() => openChat(c)}>
                <View style={styles.activeAvatarWrap}>
                  <LetterAvatar name={displayName(c)} uri={displayAvatar(c)} size={44} />
                  <View style={styles.activeDot} />
                </View>
                <Text style={styles.activeName} numberOfLines={1}>
                  {displayName(c).split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const unread = unreadByConv[item._id] ?? item.unreadCount ?? 0;
          const online = !item.isGroup && item.otherUser?._id ? isOnline(item.otherUser._id) : false;
          return (
            <TouchableOpacity activeOpacity={0.85} onPress={() => openChat(item)}>
              <Card style={styles.convRow}>
                <View style={styles.avatarWrap}>
                  <LetterAvatar name={displayName(item)} uri={displayAvatar(item)} size={44} />
                  {online ? <View style={styles.onlineDot} /> : null}
                  {item.isGroup ? (
                    <View style={styles.groupBadge}>
                      <UsersRound size={9} color="#fff" />
                    </View>
                  ) : null}
                </View>
                <View style={styles.convMeta}>
                  <View style={styles.convTopRow}>
                    <Text style={[styles.convName, unread > 0 && styles.convNameUnread]} numberOfLines={1}>
                      {displayName(item)}
                    </Text>
                    <Text style={styles.convTime}>{relativeTime(item.updatedAt)}</Text>
                  </View>
                  {item.lastMessage ? (
                    <Text style={styles.convLast} numberOfLines={1}>
                      {item.lastMessage.text}
                    </Text>
                  ) : null}
                </View>
                {unread > 0 ? (
                  <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unread}</Text>
                  </LinearGradient>
                ) : null}
              </Card>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          !loadingConvs ? (
            <EmptyState icon={MessageCircle} title="No conversations yet" subtitle="Start chatting with your friends." />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.foreground },
  searchWrap: { paddingHorizontal: 20, marginBottom: 16 },
  activeSection: { paddingHorizontal: 20, marginBottom: 16 },
  activeLabel: { fontFamily: fonts.headingSemiBold, fontSize: 11, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  activeRowOuter: { flexGrow: 0, flexShrink: 0 },
  activeRow: { gap: 14 },
  activeItem: { alignItems: 'center', gap: 6, width: 52 },
  activeAvatarWrap: { position: 'relative' },
  activeDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.background },
  activeName: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatarWrap: { position: 'relative' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.card },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  convMeta: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  convName: { fontFamily: fonts.headingSemiBold, fontSize: 14, color: colors.foreground, flexShrink: 1 },
  convNameUnread: { fontFamily: fonts.headingBold },
  convTime: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, marginLeft: 8 },
  convLast: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontFamily: fonts.headingBold, fontSize: 11, color: '#fff' },
});
