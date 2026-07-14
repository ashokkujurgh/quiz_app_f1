import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, UserCog, ShieldOff, LogOut, ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await dispatch(logoutThunk());
        },
      },
    ]);
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.accountName}>{user?.name}</Text>
          <Text style={styles.accountEmail}>{user?.email}</Text>
        </View>

        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EditProfile')}>
            <UserCog size={16} color={colors.primary} />
            <Text style={styles.rowText}>Edit Profile</Text>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.row}>
            <ShieldOff size={16} color={colors.primary} />
            <Text style={styles.rowText}>Blocked Users</Text>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} disabled={loggingOut}>
          <LogOut size={16} color={colors.destructive} />
          <Text style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log Out'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground },
  body: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 },
  sectionLabel: { fontFamily: fonts.headingSemiBold, fontSize: 11, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 20 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  accountName: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.foreground, paddingHorizontal: 16, paddingTop: 14 },
  accountEmail: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, paddingHorizontal: 16, paddingBottom: 14, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowText: { flex: 1, fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,24,61,0.3)',
    backgroundColor: 'rgba(212,24,61,0.06)',
  },
  logoutText: { fontFamily: fonts.headingBold, fontSize: 14, color: colors.destructive },
});
