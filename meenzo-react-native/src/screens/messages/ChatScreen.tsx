import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Phone, Video, Send, ImagePlus, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMessages, markConvRead, setActiveConv, sendMessage } from '../../store/slices/messagesSlice';
import { useMessagesSocket } from '../../sockets/useMessagesSocket';
import { usePresence } from '../../sockets/PresenceContext';
import { uploadChatImageAsset } from '../../api/services/uploads';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { GRAD, GRAD_LOCATIONS, DIAGONAL_START, DIAGONAL_END } from '../../theme/gradients';
import LetterAvatar from '../../components/ui/LetterAvatar';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

const TYPING_TIMEOUT = 1500;

export default function ChatScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { conversationId, otherUserName, otherUserAvatar, otherUserId } = route.params;
  const token = useAppSelector((s) => s.auth.accessToken);
  const myId = useAppSelector((s) => s.auth.user?._id);
  const messages = useAppSelector((s) => s.messages.messages);
  const typingUsers = useAppSelector((s) => s.messages.typingUsers);
  const { isOnline } = usePresence();
  const { joinConversation, leaveConversation, startTyping, stopTyping } = useMessagesSocket(token);

  const [input, setInput] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList>(null);

  const online = otherUserId ? isOnline(otherUserId) : false;
  const otherTyping = otherUserId ? typingUsers.includes(otherUserId) : false;

  useEffect(() => {
    dispatch(setActiveConv(conversationId));
    dispatch(fetchMessages(conversationId));
    dispatch(markConvRead(conversationId));
    joinConversation(conversationId);
    return () => {
      leaveConversation(conversationId);
      dispatch(setActiveConv(null));
    };
  }, [conversationId, dispatch]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const onChangeText = (text: string) => {
    setInput(text);
    startTyping(conversationId);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(conversationId), TYPING_TIMEOUT);
  };

  const onSend = async () => {
    if ((!input.trim() && !imageUri) || sending) return;
    setSending(true);
    try {
      let uploadedUrl: string | undefined;
      if (imageUri) {
        uploadedUrl = await uploadChatImageAsset({ uri: imageUri });
        setImageUri(null);
      }
      const text = input.trim();
      setInput('');
      await dispatch(sendMessage({ conversationId, text, imageUrl: uploadedUrl })).unwrap();
    } finally {
      setSending(false);
      stopTyping(conversationId);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.flex, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.identityTapArea}
          activeOpacity={otherUserId ? 0.7 : 1}
          disabled={!otherUserId}
          onPress={() => otherUserId && navigation.navigate('UserProfile', { userId: otherUserId })}
        >
          <View style={styles.avatarWrap}>
            <LetterAvatar name={otherUserName} uri={otherUserAvatar} size={36} />
            {online ? <View style={styles.onlineDot} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <Text style={[styles.status, { color: online ? colors.online : colors.mutedForeground }]}>
              {otherTyping ? 'Typing…' : online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <View style={styles.callBtn}>
            <Phone size={14} color={colors.mutedForeground} />
          </View>
          <View style={styles.callBtn}>
            <Video size={14} color={colors.mutedForeground} />
          </View>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const me = item.sender === myId;
          const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <View style={[styles.bubbleRow, me ? styles.bubbleRowMe : styles.bubbleRowThem]}>
              {me ? (
                <LinearGradient
                  colors={GRAD}
                  locations={GRAD_LOCATIONS}
                  start={DIAGONAL_START}
                  end={DIAGONAL_END}
                  style={[styles.bubble, styles.bubbleMe]}
                >
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.bubbleImage} /> : null}
                  {item.text ? <Text style={styles.bubbleTextMe}>{item.text}</Text> : null}
                  <Text style={styles.bubbleTimeMe}>{time}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.bubbleThem]}>
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.bubbleImage} /> : null}
                  {item.text ? <Text style={styles.bubbleTextThem}>{item.text}</Text> : null}
                  <Text style={styles.bubbleTimeThem}>{time}</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {imageUri ? (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
            <X size={12} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
          <ImagePlus size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={onChangeText}
        />
        <TouchableOpacity onPress={onSend} disabled={sending}>
          <LinearGradient colors={GRAD} locations={GRAD_LOCATIONS} start={DIAGONAL_START} end={DIAGONAL_END} style={styles.sendBtn}>
            <Send size={13} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  identityTapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { position: 'relative' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.background },
  headerName: { fontFamily: fonts.headingBold, fontSize: 14, color: colors.foreground },
  status: { fontFamily: fonts.bodyRegular, fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  callBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.inputBackground, borderBottomLeftRadius: 4 },
  bubbleImage: { width: 180, height: 140, borderRadius: 12, marginBottom: 6 },
  bubbleTextMe: { fontFamily: fonts.bodyRegular, fontSize: 14, color: '#fff', lineHeight: 19 },
  bubbleTextThem: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.foreground, lineHeight: 19 },
  bubbleTimeMe: { fontFamily: fonts.bodyRegular, fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  bubbleTimeThem: { fontFamily: fonts.bodyRegular, fontSize: 10, color: 'rgba(22,19,46,0.4)', marginTop: 4 },
  imagePreviewRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 },
  imagePreview: { width: 60, height: 60, borderRadius: 10 },
  removeImageBtn: { position: 'absolute', top: -6, left: 54, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  attachBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.foreground,
  },
  sendBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
