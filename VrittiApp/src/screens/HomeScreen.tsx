import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPolicyStatus, getCacheTimestamp, PolicyStatusResponse } from '../services/api';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22C55E',
  RENEW_TODAY: '#EAB308',
  EXPIRED: '#EF4444',
};

const STATUS_ICONS: Record<string, string> = {
  ACTIVE: '🟢',
  RENEW_TODAY: '🟡',
  EXPIRED: '🔴',
};

export default function HomeScreen({ navigation }: any) {
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

      const ts = await getCacheTimestamp('policy_status');
      if (ts) {
        const mins = Math.round((Date.now() - ts) / 60000);
        setLastUpdated(mins > 0 ? t('last_updated', { time: mins.toString() }) : null);
      }
    } catch {
      // Try cached data
      setLastUpdated(t('last_updated', { time: '?' }));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  const status = policy?.status || 'ACTIVE';
  const statusColor = STATUS_COLORS[status] || '#22C55E';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Shield Status */}
      <View style={[styles.shieldCircle, { borderColor: statusColor, shadowColor: statusColor }]}>
        <Text style={styles.shieldEmoji}>🛡️</Text>
        <Text style={styles.statusIcon}>{STATUS_ICONS[status]}</Text>
      </View>

      <Text style={[styles.statusText, { color: statusColor }]}>
        {status === 'ACTIVE' && t('shield_active')}
        {status === 'RENEW_TODAY' && t('shield_renew')}
        {status === 'EXPIRED' && t('shield_expired')}
      </Text>

      {/* Info Cards */}
      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{t('next_renewal')}</Text>
          <Text style={styles.infoValue}>{policy?.renewal_date || '—'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{t('last_payout')}</Text>
          <Text style={styles.infoValue}>
            {policy?.last_payout
              ? `₹${policy.last_payout.amount} (${policy.last_payout.date})`
              : '—'}
          </Text>
        </View>
      </View>

      {lastUpdated && <Text style={styles.cacheLabel}>{lastUpdated}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 16,
  },
  shieldCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  shieldEmoji: { fontSize: 64 },
  statusIcon: { fontSize: 24, position: 'absolute', bottom: 8, right: 8 },
  statusText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  cacheLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
});
