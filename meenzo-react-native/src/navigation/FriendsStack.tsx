import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FriendsStackParamList } from './types';
import FriendsListScreen from '../screens/friends/FriendsListScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';

const Stack = createNativeStackNavigator<FriendsStackParamList>();

export default function FriendsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FriendsList" component={FriendsListScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}
