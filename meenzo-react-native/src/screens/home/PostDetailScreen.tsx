import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MessageSquare, Send, Pencil, Trash2, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import * as postsApi from '../../api/services/posts';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleLike as toggleLikeThunk } from '../../store/slices/postsSlice';
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
  const user = useAppSelector((s) => s.auth.user);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [postRes, commentsRes] = await Promise.all([postsApi.fetchPost(postId), postsApi.fetchComments(postId)]);
    setPost(postRes.post);
    setComments(commentsRes.comments);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  // Single API call via the thunk (which also updates the feed store);
  // unwrap() gives the server's values to sync this screen's local copy.
  const onLike = async () => {
    setPost((p) => (p ? { ...p, liked: !p.liked, likes: (p.likes ?? 0) + (p.liked ? -1 : 1) } : p));
    try {
      const r = await dispatch(toggleLikeThunk(postId)).unwrap();
      setPost((p) => (p ? { ...p, liked: r.liked, likes: r.likes } : p));
    } catch {
      setPost((p) => (p ? { ...p, liked: !p.liked, likes: (p.likes ?? 0) + (p.liked ? -1 : 1) } : p));
    }
  };

  const onComment = async () => {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    setCommentError('');
    try {
      if (editingId) {
        const res = await postsApi.updateComment(postId, editingId, commentText.trim());
        setComments((prev) => prev.map((c) => (c._id === editingId ? { ...c, content: res.comment.content } : c)));
        setEditingId(null);
      } else {
        const res = await postsApi.addComment(postId, commentText.trim(), {
          name: user?.name ?? 'User',
          username: user?.username ?? user?.email?.split('@')[0],
          avatar: user?.avatar,
        });
        setComments((prev) => [...prev, res.comment]);
      }
      setCommentText('');
    } catch (err) {
      setCommentError((err as Error).message || 'Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c._id);
    setCommentText(c.content);
    setCommentError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCommentText('');
  };

  const onDeleteComment = (c: Comment) => {
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await postsApi.deleteComment(postId, c._id);
            setComments((prev) => prev.filter((x) => x._id !== c._id));
            if (editingId === c._id) cancelEdit();
          } catch (err) {
            setCommentError((err as Error).message || 'Failed to delete comment.');
          }
        },
      },
    ]);
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
          <View style={styles.actionPill}>
            <MessageSquare size={14} color={colors.mutedForeground} />
            <Text style={styles.actionText}>{comments.length}</Text>
          </View>
          <TouchableOpacity style={styles.actionPill} onPress={onLike}>
            <Heart size={14} color={post.liked ? colors.accent : colors.mutedForeground} fill={post.liked ? colors.accent : 'none'} />
            <Text style={styles.actionText}>{post.likes ?? 0}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.map((c) => {
            const isOwn = !!user?._id && c.author?.userId === user._id;
            return (
              <View key={c._id} style={styles.commentRow}>
                <LetterAvatar name={c.author?.name ?? 'User'} uri={c.author?.avatar} size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentAuthor}>{c.author?.name ?? 'User'}</Text>
                  <Text style={styles.commentText}>{c.content}</Text>
                </View>
                {isOwn ? (
                  <View style={styles.commentActions}>
                    <TouchableOpacity style={styles.commentActionBtn} onPress={() => startEdit(c)}>
                      <Pencil size={13} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.commentActionBtn} onPress={() => onDeleteComment(c)}>
                      <Trash2 size={13} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {commentError ? <Text style={styles.commentError}>{commentError}</Text> : null}
      {editingId ? (
        <View style={styles.editingBanner}>
          <Text style={styles.editingText}>Editing comment</Text>
          <TouchableOpacity onPress={cancelEdit} style={styles.editingCancel}>
            <X size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder={editingId ? 'Edit your comment…' : 'Add a comment…'}
          placeholderTextColor={colors.mutedForeground}
          value={commentText}
          onChangeText={(t) => {
            setCommentText(t);
            if (commentError) setCommentError('');
          }}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
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
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingVertical: 6 },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.actionPillBg },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mutedForeground },
  commentsSection: { marginTop: 8, gap: 14 },
  commentsTitle: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.foreground },
  commentRow: { flexDirection: 'row', gap: 10 },
  commentAuthor: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.foreground },
  commentText: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  commentError: { fontFamily: fonts.bodyRegular, fontSize: 12, color: '#ef4444', paddingHorizontal: 20, paddingBottom: 6 },
  commentActions: { flexDirection: 'row', gap: 2 },
  commentActionBtn: { padding: 6 },
  editingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 6, backgroundColor: colors.softPrimaryBg },
  editingText: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.primary },
  editingCancel: { padding: 4 },
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
