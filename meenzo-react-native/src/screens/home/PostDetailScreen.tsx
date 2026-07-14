import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MessageSquare, Bookmark, Send } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import * as postsApi from '../../api/services/posts';
import { useAppDispatch } from '../../store/hooks';
import { toggleLike as toggleLikeThunk, toggleSave as toggleSaveThunk } from '../../store/slices/postsSlice';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { relativeTime } from '../../utils/relativeTime';
import LetterAvatar from '../../components/ui/LetterAvatar';
import type { Post, Comment } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'PostDetail'>;

export default function PostDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const [postRes, commentsRes] = await Promise.all([postsApi.fetchPost(postId), postsApi.fetchComments(postId)]);
    setPost(postRes.post);
    setComments(commentsRes.comments);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const onLike = async () => {
    dispatch(toggleLikeThunk(postId));
    const res = await postsApi.toggleLike(postId);
    setPost(res.post);
  };

  const onSave = async () => {
    dispatch(toggleSaveThunk(postId));
    const res = await postsApi.toggleSave(postId);
    setPost(res.post);
  };

  const onComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await postsApi.addComment(postId, commentText.trim());
      setComments((prev) => [...prev, res.comment]);
      setCommentText('');
    } finally {
      setPosting(false);
    }
  };

  if (!post) {
    return <View style={[styles.flex, { paddingTop: insets.top }]} />;
  }

  const image = post.image ?? post.images?.[0];

  return (
    <KeyboardAvoidingView style={[styles.flex, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.authorRow}>
          <LetterAvatar name={post.author?.name ?? 'Meenzo'} uri={post.author?.avatar} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{post.author?.name}</Text>
            <Text style={styles.authorSub}>
              @{post.author?.username} · {relativeTime(post.createdAt)}
            </Text>
          </View>
        </View>

        {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
        <Text style={styles.content}>{post.content}</Text>

        {image ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionPill} onPress={onLike}>
            <Heart size={14} color={post.liked ? colors.accent : colors.mutedForeground} fill={post.liked ? colors.accent : 'none'} />
            <Text style={styles.actionText}>{post.likes ?? 0}</Text>
          </TouchableOpacity>
          <View style={styles.actionPill}>
            <MessageSquare size={14} color={colors.mutedForeground} />
            <Text style={styles.actionText}>{comments.length}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Bookmark size={14} color={post.saved ? colors.primary : colors.mutedForeground} fill={post.saved ? colors.primary : 'none'} />
          </TouchableOpacity>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.map((c) => (
            <View key={c._id} style={styles.commentRow}>
              <LetterAvatar name={c.authorName} uri={c.authorAvatar} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={styles.commentAuthor}>{c.authorName}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment…"
          placeholderTextColor={colors.mutedForeground}
          value={commentText}
          onChangeText={setCommentText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onComment} disabled={posting}>
          <Send size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: 15, color: colors.foreground },
  body: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorName: { fontFamily: fonts.headingSemiBold, fontSize: 14, color: colors.foreground },
  authorSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  title: { fontFamily: fonts.headingBold, fontSize: 17, color: colors.foreground, lineHeight: 22 },
  content: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.foreground, lineHeight: 21 },
  imageWrap: { height: 200, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.secondary },
  image: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.actionPillBg },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mutedForeground },
  saveBtn: { padding: 8, borderRadius: 999 },
  commentsSection: { marginTop: 8, gap: 14 },
  commentsTitle: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  commentRow: { flexDirection: 'row', gap: 10 },
  commentAuthor: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.foreground },
  commentText: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.foreground,
  },
  sendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
