import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { ArrowLeft, Mail } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import * as authApi from '../../api/services/auth';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import GradientButton from '../../components/ui/GradientButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim()) return;
    setError(null);
    setSending(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={16} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={styles.iconBox}>
          <Mail size={26} color={colors.primary} />
        </View>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          {sent ? 'Check your inbox for a reset link.' : "Enter your email and we'll send you a link to reset your password."}
        </Text>

        {!sent ? (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <GradientButton title={sending ? 'Sending…' : 'Send Reset Link'} onPress={onSubmit} disabled={sending} style={styles.submit} />
          </>
        ) : (
          <GradientButton title="Back to Log In" onPress={() => navigation.replace('Login')} style={styles.submit} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  backBtn: { marginLeft: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softPrimaryBg, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 40, alignItems: 'center' },
  iconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.softPrimaryBg, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.foreground, marginBottom: 8 },
  subtitle: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginBottom: 24 },
  label: { alignSelf: 'flex-start', fontFamily: fonts.headingSemiBold, fontSize: 12, color: colors.foreground, marginBottom: 6 },
  input: {
    width: '100%',
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
  error: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.destructive, marginTop: 12, alignSelf: 'flex-start' },
  submit: { width: '100%', marginTop: 20 },
});
