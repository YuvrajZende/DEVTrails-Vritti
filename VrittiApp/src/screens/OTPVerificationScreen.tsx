import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Progress */}
      <View style={styles.progressHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.stepText}>STEP 3 OF 4</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: '75%' }]} />
      </View>

      <Text style={styles.title}>Verify</Text>
      <Text style={styles.subtitle}>Sent to <Text style={styles.highlightText}>+91 {phone}</Text></Text>

      {/* OTP Boxes */}
      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <View key={i} style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}>
            <TextInput
              ref={(r) => { refs.current[i] = r; }}
              style={styles.otpInput}
              value={digit}
              onChangeText={(txt) => handleChange(txt, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
            {!digit && <View style={styles.placeholderDot} />}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.actionBtn, isComplete ? styles.actionBtnEnabled : styles.actionBtnDisabled]}
        onPress={handleVerify}
        disabled={!isComplete}
        activeOpacity={0.9}
      >
        <Text style={styles.actionBtnText}>{t('verify', 'VERIFY CODE')}</Text>
      </TouchableOpacity>

      <View style={styles.resendSection}>
        <Text style={styles.resendText}>Didn't receive the code?</Text>
        <TouchableOpacity>
          <Text style={styles.resendLink}>RESEND OTP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, paddingTop: 60 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stepText: { fontSize: 12, fontWeight: '900', color: 'rgba(0,0,0,0.4)', letterSpacing: 2 },
  progressBarBg: { width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden', marginBottom: 40, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  progressBarFill: { height: '100%', backgroundColor: '#111827', borderRadius: 4 },
  title: { fontSize: 36, fontWeight: '900', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '800', color: 'rgba(0,0,0,0.4)', marginBottom: 40 },
  highlightText: { color: '#111827' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 48, gap: 12 },
  otpBox: {
    flex: 1, aspectRatio: 1, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  otpBoxFilled: { borderColor: '#111827' },
  otpInput: { fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center', width: '100%', height: '100%', position: 'absolute' },
  placeholderDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.1)' },
  actionBtn: { width: '100%', height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionBtnEnabled: {
    backgroundColor: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  actionBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.1)' },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  resendSection: { alignItems: 'center', gap: 16, marginTop: 40 },
  resendText: { fontSize: 14, fontWeight: '800', color: 'rgba(0,0,0,0.4)' },
  resendLink: { fontSize: 13, fontWeight: '900', color: '#111827', letterSpacing: 2, borderBottomWidth: 2, borderBottomColor: '#111827', paddingBottom: 2 },
});
