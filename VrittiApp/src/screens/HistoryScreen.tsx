import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, Chip, HeaderAction, ScreenHeading } from '../ui/components';
import { colors, formatCurrency } from '../ui/theme';
import { getPayoutHistory, PayoutRecord } from '../services/api';

const filters = ['All', 'Paid', 'Pending', 'Rejected'];

const triggerMeta: Record<string, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: 'teal' | 'amber' | 'blue' | 'pink' }> = {
  T1: { label: 'Rain disruption', icon: 'weather-pouring', accent: 'teal' },
  T2: { label: 'Air quality alert', icon: 'weather-dust', accent: 'amber' },
  T3: { label: 'Heatwave alert', icon: 'white-balance-sunny', accent: 'amber' },
  T4: { label: 'City curfew', icon: 'alert-octagon-outline', accent: 'pink' },
  T5: { label: 'Emergency trigger', icon: 'flash-outline', accent: 'blue' },
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const workerId = (await AsyncStorage.getItem('@vritti_worker_id')) || 'WRK-DEMO';
      const data = await getPayoutHistory(workerId);
      setPayouts(data);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayouts = useMemo(() => {
    if (filter === 'All') {
      return payouts;
    }

    return payouts.filter((payout) => payout.status?.toLowerCase() === filter.toLowerCase());
  }, [filter, payouts]);

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

      <View style={styles.topRow}>
        <ScreenHeading title="History" subtitle="Payout events, neatly filtered and restyled to match the reference app." />
        <View style={styles.topActions}>
          <HeaderAction icon={<Feather name="search" size={18} color={colors.text} />} />
          <HeaderAction icon={<Feather name="filter" size={18} color={colors.text} />} />
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((item) => (
          <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />
        ))}
      </View>

      {filteredPayouts.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Feather name="clock" size={28} color={colors.softText} />
          </View>
          <Text style={styles.emptyTitle}>{t('no_payouts')}</Text>
          <Text style={styles.emptyBody}>When the first approved event is paid out, it will appear here with amount and settlement date.</Text>
        </AppCard>
      ) : (
        <FlatList
          data={filteredPayouts}
          keyExtractor={(item, index) => item.payout_id || `payout-${index}`}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const meta = triggerMeta[item.trigger_id] || triggerMeta.T5;
            const paid = item.status?.toUpperCase() === 'PAID';
            const dateText = item.paid_at ? new Date(item.paid_at).toLocaleDateString('en-IN') : 'Awaiting settlement';

            return (
              <AppCard key={item.payout_id} variant={meta.accent} style={styles.rowCard}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons name={meta.icon} size={26} color={colors.text} />
                </View>

                <View style={styles.rowBody}>
                  <View style={styles.rowTitleWrap}>
                    <Text style={styles.rowTitle}>{meta.label}</Text>
                    <Feather
                      name={paid ? 'arrow-up-right' : 'clock'}
                      size={14}
                      color={paid ? colors.success : colors.warning}
                    />
                  </View>
                  <Text style={styles.rowDate}>{dateText}</Text>
                </View>

                <View style={styles.rowRight}>
                  <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
                  <View style={[styles.statusPill, paid ? styles.statusPaid : styles.statusPending]}>
                    <Text style={[styles.statusPillText, paid ? styles.statusPaidText : styles.statusPendingText]}>
                      {paid ? 'Paid' : item.status || 'Pending'}
                    </Text>
                  </View>
                </View>
              </AppCard>
            );
          }}
        />
      )}

      <AppCard style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Feather name="download" size={26} color="rgba(17, 24, 39, 0.25)" />
        </View>
        <Text style={styles.summaryTitle}>Need a detailed report?</Text>
        <Text style={styles.summaryBody}>This UI keeps the reference card layout. Export wiring for PDF can be added next if you want actual downloads.</Text>
        <Pressable style={styles.summaryButton}>
          <Text style={styles.summaryButtonText}>Download PDF</Text>
        </Pressable>
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
  topRow: {
    marginBottom: 18,
    gap: 14,
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  list: {
    gap: 14,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBody: {
    flex: 1,
  },
  rowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  rowDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.softText,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rowAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusPaid: {
    backgroundColor: '#ECFDF5',
    borderColor: 'rgba(29, 158, 117, 0.2)',
  },
  statusPaidText: {
    color: colors.success,
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  statusPendingText: {
    color: colors.warning,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    marginBottom: 18,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(17, 24, 39, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  summaryCard: {
    marginTop: 18,
    marginBottom: 4,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(17, 24, 39, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryButton: {
    borderRadius: 999,
    backgroundColor: colors.black,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  summaryButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
