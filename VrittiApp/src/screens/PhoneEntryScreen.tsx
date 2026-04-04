import React, { useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, InputField, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

export default function PhoneEntryScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');

  const handleSendOTP = () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid number', t('phone_placeholder'));
      return;
    }

    navigation.navigate('OTPVerification', { phone });
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.stepText}>Step 2 of 5</Text>
      <ViewProgress current={2} />
      <ScreenHeading title="Phone" subtitle="We will send a 6-digit verification code to continue onboarding." />

      <AppCard style={styles.card}>
        <InputField
          label="Mobile number"
          prefix="+91"
          placeholder="00000 00000"
          keyboardType="number-pad"
          maxLength={10}
          autoFocus
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/[^0-9]/g, '').slice(0, 10))}
          helper="By continuing, you agree to the Vritti terms and privacy policy."
        />
      </AppCard>

      <PrimaryButton title={t('send_otp')} onPress={handleSendOTP} disabled={phone.length !== 10} />
    </AppScreen>
  );
}

function ViewProgress({ current }: { current: number }) {
  return (
    <AppCard style={styles.progressWrap}>
      <Text style={styles.progressText}>{current} / 5 complete</Text>
      <Text style={styles.progressHint}>Fast setup for workers, rebuilt in the reference UI style.</Text>
    </AppCard>
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
  progressWrap: {
    marginBottom: 20,
    gap: 6,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  progressHint: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: '600',
  },
  card: {
    marginBottom: 20,
  },
});


