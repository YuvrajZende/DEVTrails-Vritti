import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { AppCard, AppScreen, Chip, HeaderAction, ScreenHeading } from '../ui/components';
import { colors, formatCurrency } from '../ui/theme';
import { getCacheTimestamp, getPolicyStatus, PolicyStatusResponse } from '../services/api';

const statusMeta: Record<string, { label: string; accent: 'blue' | 'teal' | 'amber' | 'pink'; color: string }> = {
  ACTIVE: { label: 'Shield active', accent: 'teal', color: colors.success },
  RENEW_TODAY: { label: 'Renew today', accent: 'amber', color: colors.warning },
  EXPIRED: { label: 'Coverage expired', accent: 'pink', color: colors.danger },
  NO_POLICY: { label: 'No active policy', accent: 'blue', color: '#2563EB' },
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<PolicyStatusResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const workerId = (await AsyncStorage.getItem('@vritti_worker_id')) || 'WRK-DEMO';
      const status = await getPolicyStatus(workerId);
      setPolicy(status);

      const timestamp = await getCacheTimestamp('policy_status');
      if (timestamp) {
        const mins = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
        setLastUpdated(t('last_updated', { time: mins.toString() }));
      }
    } catch {
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  };

  const meta = useMemo(() => {
    const status = policy?.status || 'NO_POLICY';
    return statusMeta[status] || statusMeta.NO_POLICY;
  }, [policy?.status]);

  if (loading) {
    return (
      <AppScreen scroll={false} contentContainerStyle={styles.loadingState}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
        <ActivityIndicator size="large" color={colors.black} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </AppScreen>
    );
  }

  const renewalText = policy?.renewal_date ? new Date(policy.renewal_date).toLocaleDateString('en-IN') : 'Not scheduled';
  const payoutAmount = policy?.last_payout?.amount ? formatCurrency(policy.last_payout.amount) : 'No payout yet';
  const payoutDate = policy?.last_payout?.paid_at
    ? new Date(policy.last_payout.paid_at).toLocaleDateString('en-IN')
    : 'Waiting for first event';
  const coverageAmount = formatCurrency(policy?.coverage_cap || 0);
  const premiumAmount = formatCurrency(policy?.premium_amount || 49);

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />

      <View style={styles.topRow}>
        <HeaderAction icon={<Feather name="menu" size={18} color={colors.text} />} />
        <View style={styles.topActions}>
          <HeaderAction icon={<Feather name="search" size={18} color={colors.text} />} />
          <HeaderAction icon={<Feather name="bell" size={18} color={colors.text} />} />
        </View>
      </View>

      <ScreenHeading
        title="Protect every delivery week with flexible cover."
        subtitle="A clean mobile adaptation of the GigShield visual style, mapped to your live Vritti policy data."
      />

      <View style={styles.chipRow}>
        <Chip label={meta.label} active />
        <Chip label={`${coverageAmount} cover`} />
        <Chip label={`${premiumAmount} / week`} />
      </View>

      <AppCard variant={meta.accent} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcons}>
            <View style={styles.heroIconLight}>
              <Feather name="shield" size={18} color={colors.text} />
            </View>
            <View style={styles.heroIconDark}>
              <Feather name="check" size={16} color={colors.white} />
            </View>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: meta.color }]}>
            <Text style={styles.heroBadgeText}>{policy?.status || 'NO_POLICY'}</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>{meta.label}</Text>
        <Text style={styles.heroBody}>
          {policy?.status === 'ACTIVE'
            ? 'Your weekly shield is live. Monitor renewal timing, payouts, and claim readiness from one place.'
            : policy?.status === 'RENEW_TODAY'
              ? 'Coverage is about to roll over. Renew now to avoid a gap during weather or platform disruptions.'
              : policy?.status === 'EXPIRED'
                ? 'The previous policy period ended. Renew to restore payout protection for the next working week.'
                : 'Finish activation to start your first protected week and make the policy visible here.'}
        </Text>

        <View style={styles.heroFooter}>
          <View>
            <Text style={styles.heroMetricLabel}>{t('next_renewal')}</Text>
            <Text style={styles.heroMetricValue}>{renewalText}</Text>
          </View>
          <View style={styles.heroArrow}>
            <Feather name="arrow-up-right" size={18} color={colors.text} />
          </View>
        </View>
      </AppCard>

      <View style={styles.statsGrid}>
        <AppCard style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={styles.metricTile}>
              <Feather name="calendar" size={18} color={colors.text} />
            </View>
            <Text style={styles.statLabel}>{t('next_renewal')}</Text>
          </View>
          <Text style={styles.statValue}>{renewalText}</Text>
          <Text style={styles.statHint}>Plan the next payment before the work week starts.</Text>
        </AppCard>

        <AppCard variant="teal" style={styles.statCard}>
          <View style={styles.statHeader}>
            <View style={[styles.metricTile, styles.metricTileWhite]}>
              <Feather name="arrow-up-right" size={18} color={colors.success} />
            </View>
            <Text style={styles.statLabel}>{t('last_payout')}</Text>
          </View>
          <Text style={styles.statValue}>{payoutAmount}</Text>
          <Text style={styles.statHint}>{payoutDate}</Text>
        </AppCard>
      </View>

      <AppCard style={styles.progressCard}>
        <Text style={styles.progressTitle}>Policy readiness</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressNumber}>{coverageAmount}</Text>
          <Text style={styles.progressScale}>current cover</Text>
        </View>
        <View style={styles.progressBars}>
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                index < 5 ? styles.progressBarFilled : styles.progressBarEmpty,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressHint}>{lastUpdated || 'Live data updates after each policy refresh.'}</Text>
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
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: colors.muted,
  },
  topRow: {
    marginTop: 4,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  heroCard: {
    marginBottom: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  heroIcons: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  heroIconLight: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: -10,
  },
  heroIconDark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.white,
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 22,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
  },
  heroMetricValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  heroArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsGrid: {
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    gap: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricTile: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  metricTileWhite: {
    backgroundColor: colors.white,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    color: colors.text,
  },
  statHint: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: '600',
  },
  progressCard: {
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 14,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  progressNumber: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    color: colors.text,
  },
  progressScale: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.softText,
    marginBottom: 4,
  },
  progressBars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  progressBar: {
    flex: 1,
    height: 34,
    borderRadius: 14,
  },
  progressBarFilled: {
    backgroundColor: '#BFDBFE',
  },
  progressBarEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
  },
  progressHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    fontWeight: '600',
  },
});
