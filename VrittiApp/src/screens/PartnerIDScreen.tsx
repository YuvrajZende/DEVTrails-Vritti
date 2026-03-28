import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

export default function PartnerIDScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const phone = route?.params?.phone ?? '';
  const platform = route?.params?.platform ?? '';
  const [partnerId, setPartnerId] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (partnerId.length < 6) return;
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1500));
    setVerifying(false);
    navigation.navigate('LocationPermission', { phone, platform, partnerId });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={20} color="#111827" />
      </TouchableOpacity>

      <Text style={styles.title}>{t('enter_partner_id', 'Partner ID')}</Text>
      <Text style={styles.subtitle}>{t('partner_id_hint', 'Enter your delivery partner identification number')}</Text>

      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          value={partnerId}
          onChangeText={setPartnerId}
          placeholder="AMZ-001234"
          placeholderTextColor="rgba(0,0,0,0.1)"
          autoCapitalize="characters"
          autoFocus
        />
      </View>

      {verifying ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>{t('verifying', 'Verifying...')}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.actionBtn, partnerId.length >= 6 ? styles.actionBtnEnabled : styles.actionBtnDisabled]}
          onPress={handleVerify}
          disabled={partnerId.length < 6}
          activeOpacity={0.9}
        >
          <Text style={styles.actionBtnText}>{t('verify', 'VERIFY')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, paddingTop: 60 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', marginBottom: 32,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  title: { fontSize: 36, fontWeight: '900', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '800', color: 'rgba(0,0,0,0.4)', marginBottom: 40 },
  inputCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#111827', marginBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  input: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center', letterSpacing: 2 },
  loadingRow: { alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, fontWeight: '800', color: 'rgba(0,0,0,0.4)' },
  actionBtn: { width: '100%', height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionBtnEnabled: {
    backgroundColor: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  actionBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.1)' },
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
});
