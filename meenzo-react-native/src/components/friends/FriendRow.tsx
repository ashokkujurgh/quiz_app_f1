import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, UserPlus, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import { LinearGradient } from 'expo-linear-gradient';
import LetterAvatar from '../ui/LetterAvatar';
import Card from '../ui/Card';
import { usePresence } from '../../sockets/PresenceContext';

export type FriendRowAction =
  | { type: 'add'; onPress: () => void }
  | { type: 'added' }
  | { type: 'incoming'; onAccept: () => void; onDecline: () => void }
  | { type: 'sent'; onCancel: () => void }
  | { type: 'none' };

interface Props {
  userId: string;
  name: string;
  username?: string;
  avatar?: string | null;
  mutual?: number;
  action: FriendRowAction;
  onPress?: () => void;
}

export default function FriendRow({ userId, name, username, avatar, mutual, action, onPress }: Props) {
  const { isOnline } = usePresence();
  const online = isOnline(userId);

  return (
    <Card style={styles.row}>
      <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} disabled={!onPress} onPress={onPress} style={styles.tapArea}>
        <View style={styles.avatarWrap}>
          <LetterAvatar name={name} uri={avatar} size={42} />
          {online ? <View style={styles.onlineDot} /> : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {username ? (
            <Text style={styles.handle} numberOfLines={1}>
              @{username}
            </Text>
          ) : null}
          {typeof mutual === 'number' ? <Text style={styles.mutual}>{mutual} mutual friends</Text> : null}
        </View>
      </TouchableOpacity>

      {action.type === 'add' ? (
        <TouchableOpacity activeOpacity={0.85} onPress={action.onPress}>
          <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.actionBtn}>
            <UserPlus size={11} color="#fff" />
            <Text style={styles.actionTextLight}>Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      {action.type === 'added' ? (
        <View style={[styles.actionBtn, styles.addedBtn]}>
          <Check size={11} color={colors.addedText} />
          <Text style={styles.addedText}>Added</Text>
        </View>
      ) : null}

      {action.type === 'incoming' ? (
        <View style={styles.dualActions}>
          <TouchableOpacity activeOpacity={0.85} onPress={action.onAccept}>
            <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.iconOnlyBtn}>
              <Check size={13} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={[styles.iconOnlyBtn, styles.declineBtn]} onPress={action.onDecline}>
            <X size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : null}

      {action.type === 'sent' ? (
        <TouchableOpacity activeOpacity={0.85} style={[styles.actionBtn, styles.cancelBtn]} onPress={action.onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  tapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  avatarWrap: { position: 'relative' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.card },
  meta: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.headingSemiBold, fontSize: 14, color: colors.foreground },
  handle: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  mutual: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  actionTextLight: { fontFamily: fonts.headingBold, fontSize: 11, color: '#fff' },
  addedBtn: { backgroundColor: colors.addedBg, borderWidth: 1, borderColor: colors.addedBorder },
  addedText: { fontFamily: fonts.headingBold, fontSize: 11, color: colors.addedText },
  dualActions: { flexDirection: 'row', gap: 8 },
  iconOnlyBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { backgroundColor: colors.actionPillBg },
  cancelBtn: { backgroundColor: colors.actionPillBg },
  cancelText: { fontFamily: fonts.headingBold, fontSize: 11, color: colors.mutedForeground },
});
