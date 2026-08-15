import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Users } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFriends } from '../../store/slices/friendsSlice';
import * as messagesApi from '../../api/services/messages';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import LetterAvatar from '../../components/ui/LetterAvatar';
import GradientButton from '../../components/ui/GradientButton';
import EmptyState from '../../components/ui/EmptyState';

type Props = NativeStackScreenProps<MessagesStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { friends, loading } = useAppSelector((s) => s.friends);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dispatch(fetchFriends());
  }, [dispatch]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCreate = async () => {
    setError('');
    if (!name.trim()) {
      setError('Give your group a name.');
      return;
    }
    if (selected.size === 0) {
      setError('Pick at least one friend to add.');
      return;
    }
    setCreating(true);
    try {
      const res = await messagesApi.createGroup(name.trim(), Array.from(selected));
      navigation.replace('Chat', {
        conversationId: res.data._id,
        otherUserName: res.data.name ?? name.trim(),
        otherUserAvatar: res.data.icon,
        isGroup: true,
      });
    } catch (err) {
      setError((err as Error).message || 'Failed to create group.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.nameWrap}>
        <TextInput
          style={styles.nameInput}
          placeholder="Group name"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
        />
      </View>

      <Text style={styles.sectionLabel}>Add members ({selected.size} selected)</Text>

      <FlatList
        data={friends}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const active = selected.has(item._id);
          return (
            <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => toggle(item._id)}>
              <LetterAvatar name={item.name} uri={item.avatar} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.username ? <Text style={styles.rowHandle}>@{item.username}</Text> : null}
              </View>
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active ? <Check size={13} color="#fff" /> : null}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon={Users} title="No friends yet" subtitle="Add friends before creating a group." />
          ) : (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          )
        }
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.footer}>
        <GradientButton title={creating ? 'Creating…' : 'Create Group'} onPress={onCreate} disabled={creating} style={{ width: '100%' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground },
  nameWrap: { paddingHorizontal: 20, marginBottom: 16 },
  nameInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.foreground,
  },
  sectionLabel: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowName: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  rowHandle: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  error: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.destructive, textAlign: 'center', marginBottom: 8 },
  footer: { padding: 20 },
});
