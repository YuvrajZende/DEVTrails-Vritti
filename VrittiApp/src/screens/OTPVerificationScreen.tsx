import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function OTPVerificationScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const phone = route?.params?.phone ?? '';
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const isComplete = otp.every((d) => d.length === 1);

  const handleVerify = () => {
    if (isComplete) {
      navigation.navigate('PlatformSelect', { phone });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.emoji}>🔐</Text>
      <Text style={styles.title}>{t('enter_otp')}</Text>
      <Text style={styles.sub}>+91 {phone}</Text>
      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => { refs.current[i] = r; }}
            style={[styles.otpBox, digit ? styles.otpFilled : null]}
            value={digit}
            onChangeText={(txt) => handleChange(txt, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>
      <TouchableOpacity
        style={[styles.btn, isComplete ? styles.btnActive : styles.btnDisabled]}
        onPress={handleVerify}
        disabled={!isComplete}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>{t('verify')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: 'row',
    marginBottom: 32,
    justifyContent: 'center',
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    textAlign: 'center',
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    borderWidth: 2,
    borderColor: '#334155',
    marginHorizontal: 5,
  },
  otpFilled: {
    borderColor: '#22C55E',
    backgroundColor: '#1A3A2A',
  },
  btn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: '#22C55E', elevation: 4 },
  btnDisabled: { backgroundColor: '#334155' },
  btnText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
});
