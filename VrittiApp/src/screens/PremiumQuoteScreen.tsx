import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors, formatCurrency } from '../ui/theme';
import { policyActivate, workerOnboard } from '../services/api';

export default function PremiumQuoteScreen({ route, onComplete }: any) {
  const { t } = useTranslation();
  const params = route?.params ?? {};
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [activating, setActivating] = useState(false);
  const [workerData, setWorkerData] = useState<any>(null);

  useEffect(() => {
    const generateQuote = async () => {
      try {
        const onboardResult = await workerOnboard({
          phone: params.phone || '9999999999',
          platform: params.platform || 'amazon',
          partner_id: params.partnerId || 'AMZ-001',
        });
        setWorkerData(onboardResult);
      } catch {
        // keep the fallback pricing below
      } finally {
        setLoadingQuote(false);
      }
    };

    generateQuote();
  }, [params.partnerId, params.phone, params.platform]);

  const premiumAmount = workerData?.premium_tier || 49;
  const coverageCap = workerData?.coverage_cap || 800;
  const riskScore = workerData?.risk_score || 0.4;

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('@vritti_onboarded', 'true');
    if (workerData?.worker_id) {
      await AsyncStorage.setItem('@vritti_worker_id', workerData.worker_id);
    }

    if (onComplete) {
      await onComplete();
    } else if (params.onComplete) {
      await params.onComplete();
    }
  };

  const handleActivate = async () => {
    if (!workerData?.worker_id) {
      await finishOnboarding();
      return;
    }

    setActivating(true);
    try {
      const upiUrl = `upi://pay?pa=vritti@razorpay&pn=Vritti&am=${premiumAmount}&tn=WeeklyShield&cu=INR`;
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      }

      await policyActivate(workerData.worker_id, 'mock-payment-ref', premiumAmount, coverageCap, riskScore);
      await finishOnboarding();
    } catch {
      await finishOnboarding();
    } finally {
      setActivating(false);
    }
  };

  if (loadingQuote) {
    return (
      <AppScreen scroll={false} contentContainerStyle={styles.loadingState}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
        <ActivityIndicator size="large" color={colors.black} />
        <Text style={styles.loadingText}>Calculating your quote</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <ScreenHeading title="Weekly quote" subtitle="Your activation card now follows the GigShield premium layout while keeping the existing backend calls." />

      <AppCard variant="amber" style={styles.quoteCard}>
        <View style={styles.quoteIcon}>
          <Feather name="shield" size={34} color={colors.text} />
        </View>
        <Text style={styles.quoteEyebrow}>{t('weekly_shield_cost')}</Text>
        <Text style={styles.quotePrice}>{formatCurrency(premiumAmount)}</Text>
        <Text style={styles.quotePeriod}>{t('per_week')}</Text>

        <View style={styles.featureBox}>
          {[
            'Accidental disability cover',
            'Income protection in rain or heat',
            'Hospital cash benefit',
          ].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Feather name="check" size={14} color={colors.white} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.coverageLabel}>{t('your_protection')}</Text>
        <Text style={styles.coverageValue}>{formatCurrency(coverageCap)}</Text>
      </AppCard>

      {activating ? (
        <AppCard style={styles.activatingCard}>
          <ActivityIndicator size="small" color={colors.black} />
          <Text style={styles.activatingText}>Opening payment and activating policy...</Text>
        </AppCard>
      ) : (
        <PrimaryButton title={t('activate_shield')} onPress={handleActivate} />
      )}

      <Text style={styles.footnote}>Quoted risk score: {riskScore.toFixed(2)}. Activation still falls back safely if payment deep-linking is unavailable.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 44,
    justifyContent: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: colors.muted,
  },
  quoteCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  quoteIcon: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  quoteEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  quotePrice: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '900',
    color: colors.text,
  },
  quotePeriod: {
    marginTop: 4,
    marginBottom: 22,
    fontSize: 16,
    fontWeight: '700',
    color: colors.softText,
  },
  featureBox: {
    width: '100%',
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.5)',
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: colors.text,
  },
  coverageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
  },
  coverageValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900',
    color: colors.text,
  },
  activatingCard: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  activatingText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  footnote: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    fontWeight: '600',
  },
});


