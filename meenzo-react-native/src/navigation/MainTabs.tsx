import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import BottomTabBar from './BottomTabBar';
import HomeStack from './HomeStack';
import QuizzesStack from './QuizzesStack';
import FriendsStack from './FriendsStack';
import MessagesStack from './MessagesStack';
import ProfileStack from './ProfileStack';
import { PresenceProvider } from '../sockets/PresenceContext';
import { useAppSelector } from '../store/hooks';
import { useMessagesSocket } from '../sockets/useMessagesSocket';
import { usePresencePing } from '../hooks/usePresencePing';

const Tab = createBottomTabNavigator<MainTabParamList>();

function SocketBridges() {
  const token = useAppSelector((s) => s.auth.accessToken);
  useMessagesSocket(token);
  usePresencePing();
  return null;
}

export default function MainTabs() {
  return (
    <PresenceProvider>
      <SocketBridges />
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <BottomTabBar {...props} />}
      >
        <Tab.Screen name="HomeStack" component={HomeStack} />
        <Tab.Screen name="QuizzesStack" component={QuizzesStack} />
        <Tab.Screen name="FriendsStack" component={FriendsStack} />
        <Tab.Screen name="MessagesStack" component={MessagesStack} />
        <Tab.Screen name="ProfileStack" component={ProfileStack} />
      </Tab.Navigator>
    </PresenceProvider>
  );
}
