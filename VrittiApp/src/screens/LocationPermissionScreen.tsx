import React, { useState } from 'react';
import { StatusBar, StyleSheet, Text } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

export default function LocationPermissionScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const params = route?.params ?? {};
  const [granted, setGranted] = useState(false);

  const handleAllow = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setGranted(true);
      }
    } catch {
      // continue even when location fails in emulator environments
    } finally {
      setTimeout(() => navigation.navigate('PremiumQuote', params), 250);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <ScreenHeading title={t('location_title')} subtitle={t('location_desc')} />

      <AppCard variant="blue" style={styles.card}>
        <Feather name="map-pin" size={34} color={colors.text} style={styles.icon} />
        <Text style={styles.cardTitle}>Zone verification</Text>
        <Text style={styles.cardBody}>Location is used to match delivery activity to disruption events and payout eligibility.</Text>
      </AppCard>

      <PrimaryButton title={granted ? 'Location enabled' : t('allow_location')} onPress={handleAllow} variant={granted ? 'amber' : 'black'} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 44,
    justifyContent: 'center',
  },
  card: {
    marginBottom: 22,
    alignItems: 'flex-start',
  },
  icon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    fontWeight: '600',
  },
});


