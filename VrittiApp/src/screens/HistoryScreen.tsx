import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPayoutHistory, PayoutRecord } from '../services/api';
import { Feather } from '@expo/vector-icons';

// Map trigger_id from backend (T1-T5) to display icons and labels
const TRIGGER_MAP: Record<string, { emoji: string; label: string }> = {
  T1: { emoji: '🌧️', label: 'Rain Disruption' },
  T2: { emoji: '🌫️', label: 'AQI Alert' },
  T3: { emoji: '🌡️', label: 'Heatwave' },
  T4: { emoji: '🚫', label: 'City Curfew' },
  T5: { emoji: '⚡', label: 'Flash Flood' },
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
    } catch {}
    setLoading(false);
  };

  const filteredPayouts = payouts.filter(p => {
    if (filter === 'All') return true;
    return p.status?.toUpperCase() === filter.toUpperCase();
  });

  const renderItem = ({ item }: { item: PayoutRecord }) => {
    const isPaid = item.status?.toUpperCase() === 'PAID';
    const trigger = TRIGGER_MAP[item.trigger_id] || { emoji: '⚡', label: 'Other Event' };

    return (
      <TouchableOpacity style={styles.payoutCard} activeOpacity={0.9}>
        <View style={styles.emojiSquare}>
          <Text style={styles.emojiText}>{trigger.emoji}</Text>
        </View>
        
        <View style={styles.payoutMiddle}>
          <View style={styles.typeRow}>
            <Text style={styles.typeTitle}>{trigger.label}</Text>
            {isPaid ? (
              <Feather name="arrow-up-right" size={14} color="#1D9E75" />
            ) : (
              <Feather name="clock" size={14} color="#F59E0B" />
            )}
          </View>
          <Text style={styles.dateText}>{item.paid_at || '—'}</Text>
        </View>

        <View style={styles.payoutRight}>
          <Text style={styles.amountText}>₹{item.amount}</Text>
          <View style={[styles.statusPill, isPaid ? styles.statusPillPaid : styles.statusPillPending]}>
            <Text style={[styles.statusPillText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
              {item.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>{t('history', 'History')}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="search" size={18} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="filter" size={18} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Paid', 'Pending', 'Rejected'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f ? styles.filterChipActive : styles.filterChipInactive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, filter === f ? styles.filterTextActive : styles.filterTextInactive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Payouts List */}
      <FlatList
        data={filteredPayouts}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.trigger_id + index}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyText}>{t('no_payouts', 'No payouts found.')}</Text>
          </View>
        }
        ListFooterComponent={
          filteredPayouts.length > 0 ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconBox}>
                <Feather name="clock" size={32} color="rgba(0,0,0,0.2)" />
              </View>
              <Text style={styles.summaryTitle}>Need more details?</Text>
              <Text style={styles.summarySub}>Download your full transaction history for tax purposes.</Text>
              <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.9}>
                <Text style={styles.downloadBtnText}>DOWNLOAD PDF</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, backgroundColor: '#F9FAFB', zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  screenTitle: { fontSize: 32, fontWeight: '900', color: '#111827' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  filterScroll: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  filterChip: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#111827', borderColor: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  filterChipInactive: { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.05)' },
  filterChipText: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  filterTextActive: { color: '#FFFFFF' },
  filterTextInactive: { color: 'rgba(0,0,0,0.4)' },
  listContent: { paddingHorizontal: 24, paddingBottom: 120, paddingTop: 8, gap: 16 },
  payoutCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  emojiSquare: {
    width: 56, height: 56, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  emojiText: { fontSize: 28 },
  payoutMiddle: { flex: 1 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  typeTitle: { fontSize: 16, fontWeight: '900', color: '#111827', letterSpacing: -0.2 },
  dateText: { fontSize: 12, fontWeight: '800', color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  payoutRight: { alignItems: 'flex-end' },
  amountText: { fontSize: 20, fontWeight: '900', color: '#111827', letterSpacing: -1, marginBottom: 4 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusPillPaid: { backgroundColor: '#F0FDF4', borderColor: 'rgba(29,158,117,0.2)' },
  statusPillPending: { backgroundColor: '#FFFBEB', borderColor: 'rgba(245,158,11,0.2)' },
  statusPillText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  statusTextPaid: { color: '#1D9E75' },
  statusTextPending: { color: '#F59E0B' },
  emptyContainer: { alignItems: 'center', marginTop: 64 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '800', color: 'rgba(0,0,0,0.4)' },
  summaryCard: {
    marginTop: 16, padding: 32, borderRadius: 24, backgroundColor: 'transparent',
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', borderStyle: 'dashed', alignItems: 'center',
  },
  summaryIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 8 },
  summarySub: { fontSize: 14, fontWeight: '800', color: 'rgba(0,0,0,0.4)', textAlign: 'center', marginBottom: 24 },
  downloadBtn: { backgroundColor: '#111827', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  downloadBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
});
