import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, BookOpen, Users, MessageCircle, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const ICONS = { Home, BookOpen, Users, MessageCircle, User } as const;
const LABELS: Record<string, string> = {
  HomeStack: 'Home',
  QuizzesStack: 'Quizzes',
  FriendsStack: 'Friends',
  MessagesStack: 'Messages',
  ProfileStack: 'Profile',
};
const ICON_FOR: Record<string, keyof typeof ICONS> = {
  HomeStack: 'Home',
  QuizzesStack: 'BookOpen',
  FriendsStack: 'Users',
  MessagesStack: 'MessageCircle',
  ProfileStack: 'User',
};

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const active = state.index === index;
          const Icon = ICONS[ICON_FOR[route.name] ?? 'Home'];
          const label = LABELS[route.name] ?? route.name;
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.75}
              style={styles.item}
              onPress={() => navigation.navigate(route.name)}
            >
              {active ? <View style={styles.activePill} /> : null}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} color={active ? colors.primary : colors.iconInactive} />
              <Text style={[styles.label, { color: active ? colors.primary : colors.iconInactive }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#7c5cfc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
  },
  activePill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(124,92,252,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,252,0.2)',
  },
  label: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
