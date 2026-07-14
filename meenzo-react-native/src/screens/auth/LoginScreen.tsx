import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import GradientButton from '../../components/ui/GradientButton';
import GradientText from '../../components/ui/GradientText';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { loading, authError } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = () => {
    if (!email.trim() || !password) return;
    dispatch(login({ email: email.trim(), password }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <GradientText style={styles.logo}>Meenzo</GradientText>
          <Text style={styles.tagline}>Learn, compete, grow — together.</Text>
        </View>

        <View style={styles.form}>
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

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {authError ? <Text style={styles.error}>{authError}</Text> : null}

          <GradientButton title="Log In" onPress={onSubmit} loading={loading} style={styles.submit} />

          <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.switchText}>
              Don&apos;t have an account? <Text style={styles.switchLink}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontFamily: fonts.headingBlack, fontSize: 34 },
  tagline: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.mutedForeground, marginTop: 6 },
  form: { gap: 6 },
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
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.destructive,
    marginTop: 12,
  },
  submit: { marginTop: 24, width: '100%' },
  forgotRow: { marginTop: 14, alignItems: 'center' },
  forgotText: { fontFamily: fonts.headingSemiBold, fontSize: 13, color: colors.primary },
  switchRow: { marginTop: 20, alignItems: 'center' },
  switchText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.mutedForeground },
  switchLink: { fontFamily: fonts.headingSemiBold, color: colors.primary },
});
