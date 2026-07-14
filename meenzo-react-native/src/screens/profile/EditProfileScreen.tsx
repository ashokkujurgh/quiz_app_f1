import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateProfile, setUser } from '../../store/slices/authSlice';
import { uploadAvatarImage } from '../../api/services/uploads';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import GradientButton from '../../components/ui/GradientButton';
import LetterAvatar from '../../components/ui/LetterAvatar';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar ?? null);
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (avatarUri && avatarUri !== user.avatar) {
        const url = await uploadAvatarImage({ uri: avatarUri });
        dispatch(setUser({ ...user, avatar: url }));
      }
      await dispatch(updateProfile({ name: name.trim(), username: username.trim() || undefined, bio: bio.trim() })).unwrap();
      navigation.goBack();
    } catch {
      // keep simple for v1 — form stays open on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
          <LetterAvatar name={name || 'M'} uri={avatarUri} size={84} />
          <View style={styles.cameraBadge}>
            <Camera size={13} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.mutedForeground} />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="username"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="Tell people about yourself"
          placeholderTextColor={colors.mutedForeground}
        />
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton title={saving ? 'Saving…' : 'Save Changes'} onPress={onSave} disabled={saving} style={{ width: '100%' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.foreground },
  body: { paddingHorizontal: 20, paddingTop: 8, gap: 6 },
  avatarWrap: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  label: { fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.foreground, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.foreground,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  footer: { padding: 20 },
});
