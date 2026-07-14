import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, ImagePlus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createPost } from '../../store/slices/postsSlice';
import * as topicsApi from '../../api/services/topics';
import { uploadPostImages } from '../../api/services/uploads';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import GradientButton from '../../components/ui/GradientButton';
import ChipTabRow from '../../components/ui/ChipTabRow';
import type { Topic } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreatePost'>;

export default function CreatePostScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicIndex, setTopicIndex] = useState(0);
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    topicsApi.fetchTopics().then((res) => setTopics(res.topics)).catch(() => undefined);
  }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    try {
      let images: string[] = [];
      if (imageUri) {
        images = await uploadPostImages([{ uri: imageUri }]);
      }
      await dispatch(
        createPost({
          content: content.trim(),
          topic: topics[topicIndex]?.name ?? 'General',
          images,
          image: images[0],
          authorName: user.name,
          authorUsername: user.username,
          authorAvatar: user.avatar,
        }),
      ).unwrap();
      navigation.goBack();
    } catch {
      // surfaced via disabled submit state; keep simple for v1
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Post</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {topics.length > 0 ? (
          <ChipTabRow items={topics.map((t) => t.name)} activeIndex={topicIndex} onChange={setTopicIndex} />
        ) : null}

        <TextInput
          style={styles.textArea}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          value={content}
          onChangeText={setContent}
        />

        {imageUri ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImage} onPress={() => setImageUri(null)}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addImage} onPress={pickImage}>
            <ImagePlus size={20} color={colors.primary} />
            <Text style={styles.addImageText}>Add photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton
          title={submitting ? 'Posting…' : 'Post'}
          onPress={onSubmit}
          disabled={submitting || !content.trim()}
          style={{ width: '100%' }}
        />
      </View>
      {submitting ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground },
  body: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  textArea: {
    minHeight: 120,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    padding: 16,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.foreground,
    textAlignVertical: 'top',
  },
  addImage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingVertical: 20,
  },
  addImageText: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.primary },
  imagePreviewWrap: { borderRadius: radius.md, overflow: 'hidden', height: 180 },
  imagePreview: { width: '100%', height: '100%' },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { padding: 20 },
});
