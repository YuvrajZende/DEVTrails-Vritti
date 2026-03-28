import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

export default function PhoneEntryScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');

  const handleSendOTP = () => {
    if (phone.length !== 10) {
      Alert.alert('', t('phone_placeholder'));
      return;
    }
    navigation.navigate('OTPVerification', { phone });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Progress */}
      <View style={styles.progressHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.stepText}>STEP 2 OF 4</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: '50%' }]} />
      </View>

      <Text style={styles.title}>Phone</Text>
      <Text style={styles.subtitle}>We'll send a 6-digit verification code</Text>

      {/* Phone Input Card */}
      <View style={styles.phoneCard}>
        <View style={styles.countrySection}>
          <Text style={styles.flag}>🇮🇳</Text>
          <Text style={styles.countryCode}>+91</Text>
        </View>
        <View style={styles.separator} />
        <TextInput
          style={styles.phoneInput}
          value={phone}
          onChangeText={(txt) => setPhone(txt.replace(/[^0-9]/g, '').slice(0, 10))}
          keyboardType="number-pad"
          placeholder="00000 00000"
          placeholderTextColor="rgba(0,0,0,0.1)"
          maxLength={10}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.actionBtn, phone.length === 10 ? styles.actionBtnEnabled : styles.actionBtnDisabled]}
        onPress={handleSendOTP}
        disabled={phone.length !== 10}
        activeOpacity={0.9}
      >
        <Text style={styles.actionBtnText}>{t('send_otp', 'GET OTP')}</Text>
      </TouchableOpacity>

      <Text style={styles.legalText}>
        By continuing, you agree to our <Text style={styles.legalLink}>Terms of Service</Text> and <Text style={styles.legalLink}>Privacy Policy</Text>.
      </Text>
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
  phoneCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24,
    borderWidth: 2, borderColor: '#111827', marginBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  countrySection: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
  flag: { fontSize: 24 },
  countryCode: { fontSize: 18, fontWeight: '900', color: '#111827' },
  separator: { width: 2, height: 30, backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 16 },
  phoneInput: { flex: 1, fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  actionBtn: { width: '100%', height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionBtnEnabled: {
    backgroundColor: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  actionBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.1)' },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  legalText: { textAlign: 'center', marginTop: 32, fontSize: 13, fontWeight: '800', color: 'rgba(0,0,0,0.3)', paddingHorizontal: 24 },
  legalLink: { color: '#111827', textDecorationLine: 'underline' },
});
