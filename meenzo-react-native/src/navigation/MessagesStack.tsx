import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from './types';
import ConversationsListScreen from '../screens/messages/ConversationsListScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import CreateGroupScreen from '../screens/messages/CreateGroupScreen';
import GroupInfoScreen from '../screens/messages/GroupInfoScreen';
import AddGroupMembersScreen from '../screens/messages/AddGroupMembersScreen';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
      <Stack.Screen name="AddGroupMembers" component={AddGroupMembersScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
