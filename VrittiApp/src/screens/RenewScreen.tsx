import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors, formatCurrency } from '../ui/theme';
import { getPolicyStatus, policyActivate } from '../services/api';

export default function RenewScreen() {
  const { t } = useTranslation();
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [premiumAmount, setPremiumAmount] = useState(49);

  useEffect(() => {
    loadScreen();
  }, []);

  const loadScreen = async () => {
    try {
      const [workerId, storedAutoRenew] = await Promise.all([
        AsyncStorage.getItem('@vritti_worker_id'),
        AsyncStorage.getItem('@vritti_auto_renew'),
      ]);

      setAutoRenew(storedAutoRenew === 'true');

      if (workerId) {
        const status = await getPolicyStatus(workerId);
        if (status?.premium_amount) {
          setPremiumAmount(status.premium_amount);
        }
      }
    } catch {
      // keep fallbacks
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRenewToggle = async () => {
    const nextValue = !autoRenew;
    setAutoRenew(nextValue);
    await AsyncStorage.setItem('@vritti_auto_renew', nextValue ? 'true' : 'false');
  };

  const handleRenew = async () => {
    setRenewing(true);
    const upiUrl = `upi://pay?pa=vritti@razorpay&pn=Vritti&am=${premiumAmount}&tn=WeeklyShield&cu=INR`;

    try {
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      }

      const workerId = (await AsyncStorage.getItem('@vritti_worker_id')) || '';
      if (workerId) {
        await policyActivate(workerId, `UPI_RENEW_${Date.now()}`);
      }
    } catch (error: any) {
      console.error('Renewal failed:', error?.message || error);
    } finally {
      setRenewing(false);
    }
  };

  if (loading) {
    return (
      <AppScreen scroll={false} contentContainerStyle={styles.loadingState}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
        <ActivityIndicator size="large" color={colors.black} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <View style={styles.headerRow}>
        <ScreenHeading title="Plan" subtitle="The renewal screen now follows the GigShield layout while still using your policy and payment logic." />
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>Active</Text>
        </View>
      </View>

      <AppCard variant="amber" style={styles.premiumCard}>
        <Text style={styles.eyebrow}>Weekly premium</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatCurrency(premiumAmount)}</Text>
          <Text style={styles.priceUnit}>/ week</Text>
        </View>

        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>Payment progress</Text>
          <Text style={styles.progressValue}>8 / 12 weeks</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.progressFoot}>Next payment due in 3 days</Text>
      </AppCard>

      <AppCard variant="teal" style={styles.toggleCard}>
        <View style={styles.toggleInfo}>
          <View style={styles.toggleIcon}>
            <Feather name="zap" size={22} color={colors.text} />
          </View>
          <View>
            <Text style={styles.toggleTitle}>Auto renew</Text>
            <Text style={styles.toggleSubtitle}>{t('auto_renew')}</Text>
          </View>
        </View>
        <Pressable onPress={handleAutoRenewToggle} style={[styles.toggleTrack, autoRenew && styles.toggleTrackActive]}>
          <View style={[styles.toggleKnob, autoRenew && styles.toggleKnobActive]} />
        </Pressable>
      </AppCard>

      <View style={styles.paySection}>
        <Text style={styles.sectionTitle}>Quick pay</Text>
        <View style={styles.payGrid}>
          {[
            { label: 'GPay', icon: 'smartphone', backgroundColor: '#DBEAFE' },
            { label: 'Cards', icon: 'credit-card', backgroundColor: '#FCE7F3' },
            { label: 'UPI', icon: 'zap', backgroundColor: '#FEF3C7' },
          ].map((method) => (
            <View key={method.label} style={[styles.payCard, { backgroundColor: method.backgroundColor }]}>
              <Feather name={method.icon as any} size={20} color={colors.text} />
              <Text style={styles.payLabel}>{method.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <AppCard style={styles.coverCard}>
        <Text style={styles.coverTitle}>Coverage details</Text>
        <View style={styles.coverList}>
          {[
            'Accidental disability cover',
            'Income protection during heavy weather',
            'Hospital cash benefit',
            '24/7 tele-consultation',
          ].map((feature) => (
            <View key={feature} style={styles.coverRow}>
              <View style={styles.coverCheck}>
                <Feather name="check" size={14} color={colors.success} />
              </View>
              <Text style={styles.coverText}>{feature}</Text>
            </View>
          ))}
        </View>

        {renewing ? (
          <View style={styles.renewingState}>
            <ActivityIndicator size="small" color={colors.black} />
            <Text style={styles.renewingText}>Opening payment app...</Text>
          </View>
        ) : (
          <PrimaryButton title={t('renew_shield')} onPress={handleRenew} />
        )}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 140,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    gap: 10,
    marginBottom: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.black,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  premiumCard: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 20,
  },
  price: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '900',
    color: colors.text,
  },
  priceUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.softText,
    marginBottom: 6,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
  },
  progressTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '66%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.black,
  },
  progressFoot: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  toggleCard: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  toggleIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  toggleSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  toggleTrack: {
    width: 58,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleTrackActive: {
    backgroundColor: colors.black,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17, 24, 39, 0.2)',
  },
  toggleKnobActive: {
    marginLeft: 'auto',
    backgroundColor: colors.amber,
  },
  paySection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 14,
  },
  payGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  payCard: {
    flex: 1,
    borderRadius: 24,
    minHeight: 108,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
  },
  coverCard: {
    marginBottom: 4,
  },
  coverTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 18,
  },
  coverList: {
    gap: 14,
    marginBottom: 22,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coverCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.text,
  },
  renewingState: {
    minHeight: 58,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.white,
  },
  renewingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
