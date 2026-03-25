import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPayoutHistory, PayoutRecord } from '../services/api';

const TRIGGER_ICONS: Record<string, string> = {
  rain: '🌧️',
  aqi: '🌫️',
  heat: '🌡️',
  curfew: '🚫',
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const workerId = (await AsyncStorage.getItem('@vritti_worker_id')) || 'WRK-DEMO';
      const data = await getPayoutHistory(workerId);
      setPayouts(data);
    } catch {}
    setLoading(false);
  };

  const renderItem = ({ item }: { item: PayoutRecord }) => (
    <View style={styles.row}>
      <Text style={styles.triggerIcon}>{TRIGGER_ICONS[item.trigger_type] || '⚡'}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowAmount}>₹{item.amount}</Text>
        <Text style={styles.rowDate}>{item.paid_at}</Text>
      </View>
      <View style={[styles.badge, item.status === 'paid' ? styles.badgePaid : styles.badgePending]}>
        <Text style={styles.badgeText}>{item.status === 'paid' ? '✅' : '⏳'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.title}>💰 {t('history')}</Text>
      {payouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyText}>{t('no_payouts')}</Text>
        </View>
      ) : (
        <FlatList
          data={payouts}
          renderItem={renderItem}
          keyExtractor={(item) => item.trigger_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    padding: 24,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
  },
  triggerIcon: { fontSize: 32, marginRight: 14 },
  rowInfo: { flex: 1 },
  rowAmount: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  rowDate: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgePaid: { backgroundColor: '#166534' },
  badgePending: { backgroundColor: '#854D0E' },
  badgeText: { fontSize: 16 },
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyIcon: { fontSize: 64 },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
});
