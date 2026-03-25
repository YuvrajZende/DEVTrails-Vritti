import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';

export default function LocationPermissionScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const params = route?.params ?? {};
  const [granted, setGranted] = useState(false);

  const handleAllow = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setGranted(true);
        setTimeout(() => {
          navigation.navigate('PremiumQuote', params);
        }, 500);
      } else {
        // Still allow proceeding for hackathon demo
        navigation.navigate('PremiumQuote', params);
      }
    } catch {
      // On emulators this may fail, still proceed
      navigation.navigate('PremiumQuote', params);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.title}>{t('location_title')}</Text>
      <View style={styles.card}>
        <Text style={styles.desc}>{t('location_desc')}</Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, granted ? styles.btnDone : styles.btnActive]}
        onPress={handleAllow}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>
          {granted ? '✅' : ''} {t('allow_location')}
        </Text>
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
  icon: { fontSize: 80, marginBottom: 20 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    width: '100%',
  },
  desc: {
    fontSize: 16,
    color: '#CBD5E1',
    lineHeight: 24,
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnActive: { backgroundColor: '#3B82F6', elevation: 4 },
  btnDone: { backgroundColor: '#22C55E', elevation: 4 },
  btnText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
});
