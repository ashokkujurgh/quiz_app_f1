import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Mail } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import * as authApi from '../../api/services/auth';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import GradientButton from '../../components/ui/GradientButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'CheckYourEmail'>;

export default function CheckYourEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const onResend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification(email);
      setSent(true);
    } catch {
      // ignore — keep UX simple
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Mail size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.subtitle}>
        We sent a verification link to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>
      <Text style={styles.hint}>Verify your email, then come back and log in.</Text>

      <GradientButton
        title={sent ? 'Email sent' : sending ? 'Sending…' : 'Resend email'}
        onPress={onResend}
        disabled={sending}
        style={styles.cta}
      />
      <Text style={styles.backLink} onPress={() => navigation.replace('Login')}>
        Back to log in
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.softPrimaryBg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.foreground, marginBottom: 10 },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  email: { fontFamily: fonts.headingSemiBold, color: colors.foreground },
  hint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  cta: { width: '100%' },
  backLink: {
    marginTop: 20,
    fontFamily: fonts.headingSemiBold,
    fontSize: 13,
    color: colors.primary,
  },
});
