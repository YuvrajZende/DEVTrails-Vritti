import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { resendOTP, verifyOTP } from '../services/api';
import { AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

export default function VerifyOTPScreen({ navigation, route }: any) {
  const { phone, otpCode, fromSignup } = route?.params ?? {};
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (otpCode && __DEV__) {
      setOtp(otpCode.split(''));
    }
  }, [otpCode]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!otp.every((digit) => digit.length === 1)) {
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(phone, otp.join(''));
      Alert.alert('Success', 'Phone verified successfully', [
        {
          text: 'Continue',
          onPress: () => {
            if (fromSignup) {
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } else {
              navigation.navigate('PlatformSelect', { phone });
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Verification failed', error.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await resendOTP(phone);
      Alert.alert('OTP sent', `A new OTP has been sent to ${phone}`);
      if (result.otp_code && __DEV__) {
        setOtp(result.otp_code.split(''));
      }
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.eyebrow}>Verify signup</Text>
      <ScreenHeading title="Enter OTP" subtitle={`Sent to +91 ${phone}`} />

      {__DEV__ && otpCode ? <Text style={styles.devCode}>Dev OTP: {otpCode}</Text> : null}

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              refs.current[index] = ref;
            }}
            style={[styles.otpBox, digit && styles.otpBoxFilled]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingButton}>
          <ActivityIndicator size="small" color={colors.white} />
        </View>
      ) : (
        <PrimaryButton title="Verify" onPress={handleVerify} disabled={!otp.every((digit) => digit.length === 1)} />
      )}

      <Pressable onPress={handleResend} style={styles.resendButton} disabled={resending}>
        {resending ? <ActivityIndicator size="small" color={colors.black} /> : <Text style={styles.resendText}>Resend OTP</Text>}
      </Pressable>
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
  devCode: {
    marginBottom: 14,
    fontSize: 13,
    fontWeight: '800',
    color: colors.warning,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  otpBoxFilled: {
    borderColor: colors.black,
  },
  loadingButton: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 18,
    minHeight: 32,
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});


