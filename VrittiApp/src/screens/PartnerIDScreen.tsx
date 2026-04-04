import React, { useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, InputField, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

export default function PartnerIDScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const phone = route?.params?.phone ?? '';
  const platform = route?.params?.platform ?? '';
  const [partnerId, setPartnerId] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (partnerId.length < 6) {
      return;
    }

    setVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setVerifying(false);
    navigation.navigate('LocationPermission', { phone, platform, partnerId });
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.stepText}>Step 5 of 5</Text>
      <ScreenHeading title="Partner ID" subtitle={t('partner_id_hint')} />

      <AppCard style={styles.card}>
        <InputField
          label={t('enter_partner_id')}
          placeholder="AMZ-001234"
          autoCapitalize="characters"
          autoFocus
          value={partnerId}
          onChangeText={setPartnerId}
          helper="The worker ID is used for policy linking and payout eligibility checks."
        />
      </AppCard>

      {verifying ? (
        <AppCard style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.black} />
          <Text style={styles.loadingText}>{t('verifying')}</Text>
        </AppCard>
      ) : (
        <PrimaryButton title="Verify and continue" onPress={handleVerify} disabled={partnerId.length < 6} />
      )}
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
  card: {
    marginBottom: 20,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
});


