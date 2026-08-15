import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, UserPlus, Shield, ShieldOff, UserMinus, LogOut, Trash2, Pencil, Check, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import * as messagesApi from '../../api/services/messages';
import { uploadGroupIconAsset } from '../../api/services/uploads';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { GRAD2, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { LinearGradient } from 'expo-linear-gradient';
import LetterAvatar from '../../components/ui/LetterAvatar';
import type { Conversation, ConversationUser } from '../../types';

type Props = NativeStackScreenProps<MessagesStackParamList, 'GroupInfo'>;

export default function GroupInfoScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { conversationId } = route.params;
  const myId = useAppSelector((s) => s.auth.user?._id);

  const [group, setGroup] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await messagesApi.fetchGroupDetails(conversationId);
    setGroup(res.data);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  const iAmAdmin = !!myId && !!group?.admins?.includes(myId);
  const members: ConversationUser[] = group?.participantUsers ?? [];

  const onSaveName = async () => {
    if (!nameDraft.trim()) return;
    setBusy(true);
    try {
      await messagesApi.updateGroupName(conversationId, nameDraft.trim());
      setEditingName(false);
      await load();
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to rename group.');
    } finally {
      setBusy(false);
    }
  };

  const onChangeIcon = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      await uploadGroupIconAsset(conversationId, { uri: result.assets[0].uri });
      await load();
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to update group icon.');
    } finally {
      setBusy(false);
    }
  };

  const onMakeAdmin = (userId: string) => {
    Alert.alert('Make admin?', 'They will be able to manage members and group settings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Make Admin',
        onPress: async () => {
          try {
            await messagesApi.makeGroupAdmin(conversationId, userId);
            await load();
          } catch (err) {
            Alert.alert('Error', (err as Error).message || 'Failed to update admin.');
          }
        },
      },
    ]);
  };

  const onRemoveAdmin = (userId: string) => {
    Alert.alert('Remove as admin?', 'They will become a regular member.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await messagesApi.removeGroupAdmin(conversationId, userId);
            await load();
          } catch (err) {
            Alert.alert('Error', (err as Error).message || 'Failed to update admin.');
          }
        },
      },
    ]);
  };

  const onRemoveMember = (userId: string, name: string) => {
    Alert.alert(`Remove ${name}?`, 'They will no longer be able to see this group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await messagesApi.removeGroupMember(conversationId, userId);
            await load();
          } catch (err) {
            Alert.alert('Error', (err as Error).message || 'Failed to remove member.');
          }
        },
      },
    ]);
  };

  const onLeave = () => {
    Alert.alert('Leave group?', 'You can only rejoin if a member adds you back.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await messagesApi.leaveGroup(conversationId);
            navigation.popToTop();
          } catch (err) {
            Alert.alert('Error', (err as Error).message || 'Failed to leave group.');
          }
        },
      },
    ]);
  };

  const onDelete = () => {
    Alert.alert('Delete group?', 'This permanently deletes the group and all its messages for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await messagesApi.deleteGroup(conversationId);
            navigation.popToTop();
          } catch (err) {
            Alert.alert('Error', (err as Error).message || 'Failed to delete group.');
          }
        },
      },
    ]);
  };

  if (loading || !group) {
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
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.bannerWrap}>
        <LinearGradient colors={GRAD2} start={DIAGONAL_START} end={DIAGONAL_END} style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={styles.avatarBadge} onPress={iAmAdmin ? onChangeIcon : undefined} activeOpacity={iAmAdmin ? 0.8 : 1}>
          {group.icon ? (
            <Image source={{ uri: group.icon }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>{(group.name ?? '?')[0]?.toUpperCase()}</Text>
          )}
          {iAmAdmin ? (
            <View style={styles.cameraBadge}>
              <Camera size={12} color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.nameBlock}>
        {editingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.nameInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity style={styles.iconBtn} onPress={onSaveName} disabled={busy}>
              <Check size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setEditingName(false)}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editNameRow}>
            <Text style={styles.name}>{group.name}</Text>
            {iAmAdmin ? (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  setNameDraft(group.name ?? '');
                  setEditingName(true);
                }}
              >
                <Pencil size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        <Text style={styles.memberCount}>{members.length} members</Text>
      </View>

      {iAmAdmin ? (
        <TouchableOpacity
          style={styles.addMembersBtn}
          onPress={() => navigation.navigate('AddGroupMembers', { conversationId, existingMemberIds: group.participants })}
        >
          <UserPlus size={15} color={colors.primary} />
          <Text style={styles.addMembersText}>Add Members</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionLabel}>Members</Text>
      <View style={styles.membersWrap}>
        {members.map((m) => {
          const memberIsAdmin = group.admins?.includes(m._id);
          const isMe = m._id === myId;
          return (
            <View key={m._id} style={styles.memberRow}>
              <LetterAvatar name={m.name ?? m.username ?? '?'} uri={m.avatar} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {m.name ?? m.username}
                  {isMe ? ' (You)' : ''}
                </Text>
                {memberIsAdmin ? <Text style={styles.adminTag}>Admin</Text> : null}
              </View>
              {iAmAdmin && !isMe ? (
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.memberActionBtn}
                    onPress={() => (memberIsAdmin ? onRemoveAdmin(m._id) : onMakeAdmin(m._id))}
                  >
                    {memberIsAdmin ? (
                      <ShieldOff size={15} color={colors.mutedForeground} />
                    ) : (
                      <Shield size={15} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.memberActionBtn}
                    onPress={() => onRemoveMember(m._id, m.name ?? m.username ?? 'this member')}
                  >
                    <UserMinus size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.dangerBtn} onPress={onLeave}>
        <LogOut size={16} color={colors.destructive} />
        <Text style={styles.dangerText}>Leave Group</Text>
      </TouchableOpacity>

      {iAmAdmin ? (
        <TouchableOpacity style={styles.dangerBtn} onPress={onDelete}>
          <Trash2 size={16} color={colors.destructive} />
          <Text style={styles.dangerText}>Delete Group</Text>
        </TouchableOpacity>
      ) : null}

      {busy ? <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} /> : null}
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
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  nameBlock: { alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  name: { fontFamily: fonts.headingBlack, fontSize: 18, color: colors.foreground },
  nameInput: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
    minWidth: 160,
    textAlign: 'center',
  },
  iconBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  memberCount: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  addMembersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.softPrimaryBg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  addMembersText: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.primary },
  sectionLabel: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  membersWrap: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberName: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  adminTag: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary, marginTop: 2 },
  memberActions: { flexDirection: 'row', gap: 6 },
  memberActionBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.actionPillBg, alignItems: 'center', justifyContent: 'center' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,24,61,0.3)',
    backgroundColor: 'rgba(212,24,61,0.06)',
  },
  dangerText: { fontFamily: fonts.headingBold, fontSize: 14, color: colors.destructive },
});
