import React, { useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

export default function OTPVerificationScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const phone = route?.params?.phone ?? '';
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const refs = useRef<(TextInput | null)[]>([]);

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

  const isComplete = otp.every((digit) => digit.length === 1);

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.stepText}>Step 3 of 5</Text>
      <ScreenHeading title="Verify" subtitle={`Code sent to +91 ${phone}`} />

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

      <PrimaryButton
        title={t('verify')}
        onPress={() => navigation.navigate('PlatformSelect', { phone })}
        disabled={!isComplete}
      />

      <Pressable style={styles.resendButton}>
        <Text style={styles.resendText}>Resend OTP</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 44,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.softText,
    marginBottom: 12,
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
  resendButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});


