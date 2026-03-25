import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function PartnerIDScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const phone = route?.params?.phone ?? '';
  const platform = route?.params?.platform ?? '';
  const [partnerId, setPartnerId] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (partnerId.length < 6) return;
    setVerifying(true);
    // Mock verification delay
    await new Promise((r) => setTimeout(r, 1500));
    setVerifying(false);
    navigation.navigate('LocationPermission', { phone, platform, partnerId });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.emoji}>🪪</Text>
      <Text style={styles.title}>{t('enter_partner_id')}</Text>
      <Text style={styles.hint}>{t('partner_id_hint')}</Text>
      <TextInput
        style={styles.input}
        value={partnerId}
        onChangeText={setPartnerId}
        placeholder="AMZ-001234"
        placeholderTextColor="#64748B"
        autoCapitalize="characters"
        autoFocus
      />
      {verifying ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>{t('verifying')}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.btn, partnerId.length >= 6 ? styles.btnActive : styles.btnDisabled]}
          onPress={handleVerify}
          disabled={partnerId.length < 6}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{t('verify')}</Text>
        </TouchableOpacity>
      )}
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
  hint: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 28,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 24,
  },
  loadingRow: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
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
