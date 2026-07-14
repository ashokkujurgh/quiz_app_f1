import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, MessageSquare, Share2, Bookmark } from 'lucide-react-native';
import type { Post } from '../../types';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { relativeTime } from '../../utils/relativeTime';
import LetterAvatar from '../ui/LetterAvatar';
import Card from '../ui/Card';

interface Props {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onSave?: () => void;
}

export default function PostCard({ post, onPress, onLike, onSave }: Props) {
  const liked = !!post.liked;
  const saved = !!post.saved;
  const image = post.image ?? post.images?.[0];

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.authorRow}>
          <LetterAvatar name={post.author?.name ?? 'Meenzo'} uri={post.author?.avatar} size={38} />
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>{post.author?.name ?? 'Meenzo'}</Text>
            <Text style={styles.authorSub}>
              @{post.author?.username ?? 'meenzo'} · {relativeTime(post.createdAt)}
            </Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{post.topic}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
          <Text style={styles.excerpt} numberOfLines={2}>
            {post.content}
          </Text>
        </View>

        {image ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionPill, liked && styles.likedPill]} onPress={onLike}>
            <Heart size={14} color={liked ? colors.accent : colors.mutedForeground} fill={liked ? colors.accent : 'none'} />
            <Text style={[styles.actionText, liked && { color: colors.accent }]}>{post.likes ?? 0}</Text>
          </TouchableOpacity>
          <View style={styles.actionPill}>
            <MessageSquare size={14} color={colors.mutedForeground} />
            <Text style={styles.actionText}>{post.commentsCount ?? 0}</Text>
          </View>
          <View style={styles.actionPill}>
            <Share2 size={14} color={colors.mutedForeground} />
            <Text style={styles.actionText}>0</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.saveBtn, saved && styles.savedBtn]} onPress={onSave}>
            <Bookmark size={14} color={saved ? colors.primary : colors.mutedForeground} fill={saved ? colors.primary : 'none'} />
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  authorMeta: { flex: 1, minWidth: 0 },
  authorName: { fontFamily: fonts.headingSemiBold, fontSize: 14, color: colors.foreground },
  authorSub: { fontFamily: fonts.bodyRegular, fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.softPrimaryBg },
  categoryText: { fontFamily: fonts.headingSemiBold, fontSize: 11, color: colors.primary },
  body: { paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontFamily: fonts.headingBold, fontSize: 14, color: colors.foreground, lineHeight: 18, marginBottom: 6 },
  excerpt: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  imageWrap: { marginHorizontal: 16, marginBottom: 12, height: 160, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.secondary },
  image: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 4 },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.actionPillBg },
  likedPill: { backgroundColor: colors.likedBg },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mutedForeground },
  saveBtn: { padding: 8, borderRadius: 999 },
  savedBtn: { backgroundColor: colors.savedBg },
});
