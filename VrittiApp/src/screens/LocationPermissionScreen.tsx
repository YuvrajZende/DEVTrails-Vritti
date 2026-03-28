import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

export default function LocationPermissionScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const params = route?.params ?? {};
  const [granted, setGranted] = useState(false);

  const handleAllow = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setGranted(true);
        setTimeout(() => { navigation.navigate('PremiumQuote', params); }, 500);
      } else {
        navigation.navigate('PremiumQuote', params);
      }
    } catch {
      navigation.navigate('PremiumQuote', params);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={20} color="#111827" />
      </TouchableOpacity>

      <View style={styles.centerContent}>
        <View style={styles.iconCircle}>
          <Feather name="map-pin" size={48} color="#111827" />
        </View>

        <Text style={styles.title}>{t('location_title', 'Enable Location')}</Text>

        <View style={styles.descCard}>
          <Text style={styles.desc}>
            {t('location_desc', 'We need your location to determine weather risks and disruption alerts in your area for accurate payouts.')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, granted ? styles.actionBtnDone : styles.actionBtnDefault]}
          onPress={handleAllow}
          activeOpacity={0.9}
        >
          {granted ? (
            <Feather name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : null}
          <Text style={styles.actionBtnText}>
            {granted ? 'LOCATION ENABLED' : t('allow_location', 'ALLOW LOCATION ACCESS')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, paddingTop: 60 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 16, textAlign: 'center' },
  descCard: {
    backgroundColor: '#F9FAFB', borderRadius: 24, padding: 24, marginBottom: 40, width: '100%',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  desc: { fontSize: 16, fontWeight: '600', color: 'rgba(0,0,0,0.5)', lineHeight: 24, textAlign: 'center' },
  actionBtn: {
    width: '100%', height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
  },
  actionBtnDefault: {
    backgroundColor: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  actionBtnDone: { backgroundColor: '#1D9E75' },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
