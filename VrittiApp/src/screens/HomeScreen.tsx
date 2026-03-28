import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPolicyStatus, getCacheTimestamp, PolicyStatusResponse } from '../services/api';
import { Feather } from '@expo/vector-icons';

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
      setLastUpdated(t('last_updated', { time: '?' }));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  const status = policy?.status || 'ACTIVE';
  const isExpired = status === 'EXPIRED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.profileAvatar}>
          <View style={styles.avatarLineShort} />
          <View style={styles.avatarLineLong} />
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="search" size={18} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="bell" size={18} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Text */}
      <View style={styles.heroSection}>
        <Text style={styles.heroText}>
          Keep your earnings <Text style={styles.heroTextHighlight}>Protected</Text> with Weekly <Text style={styles.heroTextUnderline}>Shield</Text>
        </Text>
      </View>

      {/* Main Feature Card */}
      <View style={[styles.mainCard, isExpired ? styles.mainCardExpired : styles.mainCardActive]}>
        <View style={styles.mainCardHeader}>
          <View style={styles.avatarGroup}>
            <View style={styles.miniAvatarWhite}>
              <Text style={styles.miniAvatarText}>V</Text>
            </View>
            <View style={styles.miniAvatarBlue}>
              <View style={styles.miniAvatarInnerBlue} />
            </View>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {status === 'ACTIVE' && t('shield_active')}
              {status === 'RENEW_TODAY' && t('shield_renew')}
              {status === 'EXPIRED' && t('shield_expired')}
            </Text>
          </View>
        </View>

        <Text style={styles.mainCardTitle}>
          Your comprehensive weekly cover against all major disruptions.
        </Text>
        <Text style={styles.mainCardSubtitle}>
          Ensure non-stop peace of mind while driving.
        </Text>

        <View style={styles.mainCardFooter}>
          <View style={styles.usedGroup}>
            <View style={styles.usedCircle}>
              <Text style={styles.usedCircleText}>30</Text>
            </View>
            <Text style={styles.usedLabel}>Days Active</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>View</Text>
            <View style={styles.actionBtnArrow} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Next Renewal */}
        <View style={[styles.statCard, styles.statCardWhite]}>
          <View style={styles.statHeader}>
            <View style={styles.statHeaderLeft}>
              <View style={styles.statIconBox}>
                <Feather name="calendar" size={18} color="#111827" />
              </View>
              <Text style={styles.statTitle}>{t('next_renewal')}</Text>
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValueBig}>{policy?.renewal_date || '—'}</Text>
          </View>
          <View style={styles.statBars}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <View key={i} style={[styles.statBarItem, i <= 4 ? styles.statBarFilledTeal : styles.statBarEmpty]} />
            ))}
          </View>
        </View>

        {/* Last Payout */}
        <View style={[styles.statCard, styles.statCardTeal]}>
          <View style={styles.statHeader}>
            <View style={styles.statHeaderLeft}>
              <View style={styles.statIconBoxWhite}>
                <Feather name="dollar-sign" size={18} color="#111827" />
              </View>
              <Text style={styles.statTitle}>{t('last_payout')}</Text>
            </View>
          </View>
          <View style={styles.statValueRow}>
            <Text style={styles.statValueBig}>
              {policy?.last_payout ? `₹${policy.last_payout.amount}` : '—'}
            </Text>
            <Text style={styles.statValueLabel}>
               {policy?.last_payout?.paid_at || ''}
            </Text>
          </View>
          <View style={styles.statBars}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <View key={i} style={[styles.statBarItem, i <= 2 ? styles.statBarFilledAmber : styles.statBarEmpty]} />
            ))}
          </View>
        </View>
      </View>

      {lastUpdated && <Text style={styles.cacheLabel}>{lastUpdated}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  profileAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#111827',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLineShort: { width: 20, height: 2, backgroundColor: '#FFFFFF', marginBottom: 4 },
  avatarLineLong: { width: 20, height: 2, backgroundColor: '#FFFFFF' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  iconButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  heroSection: { marginBottom: 24 },
  heroText: { fontSize: 32, fontWeight: '900', color: '#111827', lineHeight: 38 },
  heroTextHighlight: { color: '#2563EB' },
  heroTextUnderline: { textDecorationLine: 'underline', textDecorationColor: '#DBEAFE', textDecorationStyle: 'solid' },
  mainCard: {
    borderRadius: 24, padding: 24, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 6,
  },
  mainCardActive: { backgroundColor: '#E0E7FF' },
  mainCardExpired: { backgroundColor: '#FEE2E2' },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  avatarGroup: { flexDirection: 'row', marginLeft: 8 },
  miniAvatarWhite: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F9FAFB', zIndex: 2,
    marginLeft: -8,
  },
  miniAvatarText: { fontWeight: '800', fontSize: 14, color: '#111827' },
  miniAvatarBlue: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F9FAFB', zIndex: 1,
    marginLeft: -8,
  },
  miniAvatarInnerBlue: { width: 20, height: 20, backgroundColor: '#FFFFFF', borderRadius: 4 },
  statusBadge: { backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  mainCardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24, marginBottom: 8 },
  mainCardSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 24 },
  mainCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usedGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usedCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#9CA3AF', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  usedCircleText: { fontSize: 10, fontWeight: '800', color: '#111827' },
  usedLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  actionBtn: { 
    backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: '#111827' },
  actionBtnArrow: {
    width: 0, height: 0, borderTopWidth: 5, borderTopColor: 'transparent',
    borderLeftWidth: 8, borderLeftColor: '#111827',
    borderBottomWidth: 5, borderBottomColor: 'transparent',
  },
  statsGrid: { gap: 16 },
  statCard: { 
    borderRadius: 24, padding: 24, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4,
  },
  statCardWhite: { backgroundColor: '#FFFFFF' },
  statCardTeal: { backgroundColor: '#F0FDF4' },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  statIconBoxWhite: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  statTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValueBig: { fontSize: 40, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  statValueLabel: { fontSize: 16, fontWeight: '800', color: '#9CA3AF' },
  statBars: { flexDirection: 'row', gap: 6, height: 40 },
  statBarItem: { flex: 1, borderRadius: 12 },
  statBarEmpty: { borderWidth: 2, borderColor: '#F3F4F6', borderStyle: 'dashed' },
  statBarFilledTeal: { backgroundColor: '#99F6E4' },
  statBarFilledAmber: { backgroundColor: '#FDE68A' },
  cacheLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 24, fontWeight: '600' },
});
