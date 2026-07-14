import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MessageSquare, UserPlus, Trophy, Bell } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import EmptyState from '../../components/ui/EmptyState';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

// The backend has no notifications endpoint yet — quizapp (the web reference app) renders
// this same screen from static mock data too, so this mirrors that rather than a real API.
const MOCK_NOTIFICATIONS = [
  { id: '1', icon: Heart, iconColor: '#e040fb', title: 'Priya liked your post', subtitle: '"The Birth of Electronics..."', time: '2h ago' },
  { id: '2', icon: MessageSquare, iconColor: '#7c5cfc', title: 'New comment from Rohan', subtitle: 'Great explanation, thanks!', time: '4h ago' },
  { id: '3', icon: UserPlus, iconColor: '#06b6d4', title: 'Sneha sent you a friend request', subtitle: '', time: '1d ago' },
  { id: '4', icon: Trophy, iconColor: '#f59e0b', title: "You're #3 on the General Science leaderboard", subtitle: '', time: '2d ago' },
];

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: `${item.iconColor}1F` }]}>
                <Icon size={16} color={item.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                {item.subtitle ? (
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.rowTime}>{item.time}</Text>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground },
  listContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  rowSubtitle: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  rowTime: { fontFamily: fonts.bodyRegular, fontSize: 10, color: colors.mutedForeground },
});
