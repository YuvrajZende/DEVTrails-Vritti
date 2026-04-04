import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { signup } from '../services/api';
import { AppCard, AppScreen, InputField, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

export default function SignupScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await signup(phone, password);
      Alert.alert('Success', `OTP sent to ${phone}`, [
        {
          text: 'Verify now',
          onPress: () =>
            navigation.navigate('VerifyOTP', {
              phone,
              otpCode: result.otp_code,
              fromSignup: true,
            }),
        },
      ]);
    } catch (error: any) {
      if (error.message.includes('already registered')) {
        Alert.alert('Phone already registered', 'This phone number is already registered.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Signup failed', error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = password === confirmPassword;

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.eyebrow}>Create account</Text>
      <ScreenHeading title="Start protected work weeks" subtitle="This screen now shares the same card system and spacing as the target reference app." />

      <AppCard style={styles.formCard}>
        <InputField
          label="Phone number"
          prefix="+91"
          placeholder="Enter 10-digit number"
          keyboardType="number-pad"
          maxLength={10}
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/[^0-9]/g, '').slice(0, 10))}
        />

        <InputField
          label="Password"
          placeholder="At least 6 characters"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          suffix={
            <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.text} />
            </Pressable>
          }
        />

        <InputField
          label="Confirm password"
          placeholder="Re-enter password"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
          helper={confirmPassword.length > 0 && passwordsMatch ? 'Passwords match' : undefined}
        />
      </AppCard>

      {loading ? (
        <View style={styles.loadingButton}>
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      ) : (
        <PrimaryButton
          title="Sign up"
          onPress={handleSignup}
          disabled={phone.length !== 10 || password.length < 6 || !passwordsMatch}
        />
      )}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>Login</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 44,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.softText,
    marginBottom: 12,
  },
  formCard: {
    marginBottom: 20,
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingButton: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  footerLink: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '900',
  },
});


