import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

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
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.emoji}>📱</Text>
      <Text style={styles.title}>{t('enter_phone')}</Text>
      <View style={styles.inputRow}>
        <Text style={styles.prefix}>+91</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(txt) => setPhone(txt.replace(/[^0-9]/g, '').slice(0, 10))}
          keyboardType="number-pad"
          placeholder={t('phone_placeholder')}
          placeholderTextColor="#64748B"
          maxLength={10}
          autoFocus
        />
      </View>
      <TouchableOpacity
        style={[styles.btn, phone.length === 10 ? styles.btnActive : styles.btnDisabled]}
        onPress={handleSendOTP}
        disabled={phone.length !== 10}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>{t('send_otp')}</Text>
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
    marginBottom: 32,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 24,
  },
  prefix: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    color: '#FFFFFF',
    paddingVertical: 18,
    letterSpacing: 2,
  },
  btn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: '#22C55E',
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: '#334155',
  },
  btnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
