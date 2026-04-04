import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { login } from '../services/api';
import { AppCard, AppScreen, InputField, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
      navigation.reset({ index: 0, routes: [{ name: 'CoreTabs' }] });
    } catch (error: any) {
      if (error.message.includes('not verified')) {
        Alert.alert('Phone not verified', 'Please verify your phone number first.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify now', onPress: () => navigation.navigate('OTPVerification', { phone, fromLogin: true }) },
        ]);
      } else {
        Alert.alert('Login failed', error.message || 'Invalid phone or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.eyebrow}>Vritti worker app</Text>
      <ScreenHeading title="Welcome back" subtitle="Authentication now matches the cleaner GigShield visual direction instead of the previous dark placeholder UI." />

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
          placeholder="Enter password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          suffix={
            <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.text} />
            </Pressable>
          }
        />
      </AppCard>

      {loading ? (
        <View style={styles.loadingButton}>
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      ) : (
        <PrimaryButton title="Login" onPress={handleLogin} disabled={phone.length !== 10 || password.length < 6} />
      )}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>No account yet?</Text>
        <Pressable onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.footerLink}>Sign up</Text>
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


