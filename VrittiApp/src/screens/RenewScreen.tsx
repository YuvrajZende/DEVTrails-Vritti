import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Switch, Linking, ActivityIndicator, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { policyActivate, getPolicyStatus } from '../services/api';
import { Feather } from '@expo/vector-icons';

export default function RenewScreen() {
  const { t } = useTranslation();
  const [autoRenew, setAutoRenew] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [premiumAmount, setPremiumAmount] = useState(49);

  useEffect(() => {
    loadPremium();
  }, []);

  const loadPremium = async () => {
    try {
      const workerId = (await AsyncStorage.getItem('@vritti_worker_id')) || '';
      if (workerId) {
        const status = await getPolicyStatus(workerId);
        if (status && (status as any).premium_amount) {
          setPremiumAmount((status as any).premium_amount);
        }
      }
    } catch (err) {
      console.log('Failed to fetch premium', err);
    }
    setLoading(false);
  };

  const handleAutoRenewToggle = async (value: boolean) => {
    setAutoRenew(value);
    await AsyncStorage.setItem('@vritti_auto_renew', value ? 'true' : 'false');
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
    } catch (err: any) {
      console.error('Renewal failed:', err.message);
    }
    setRenewing(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>{t('plan', 'Plan')}</Text>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>{t('active', 'ACTIVE')}</Text>
        </View>
      </View>

      {/* Premium Card */}
      <View style={styles.premiumCard}>
        <View style={styles.premiumBgEffect} />
        <Text style={styles.premiumLabel}>{t('weekly_premium', 'WEEKLY PREMIUM')}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceBig}>₹{premiumAmount}</Text>
          <Text style={styles.priceUnit}>{t('per_week', '/ week')}</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{t('payment_progress', 'Payment Progress')}</Text>
            <Text style={styles.progressValue}>8/12 weeks</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '66%' }]} />
          </View>
          <Text style={styles.progressHelper}>{t('next_payment_due', 'Next payment due in 3 days')}</Text>
        </View>
      </View>

      {/* Auto Renew Toggle */}
      <View style={styles.autoRenewCard}>
        <View style={styles.autoRenewLeft}>
          <View style={styles.iconBoxWhite}>
            <Feather name="zap" size={24} color="#111827" />
          </View>
          <View>
            <Text style={styles.autoRenewTitle}>{t('auto_renew', 'Auto Renew')}</Text>
            <Text style={styles.autoRenewSub}>{t('never_miss', 'Never miss a renewal')}</Text>
          </View>
        </View>
        <Switch
          value={autoRenew}
          onValueChange={handleAutoRenewToggle}
          trackColor={{ false: 'rgba(0,0,0,0.1)', true: '#111827' }}
          thumbColor={autoRenew ? '#F59E0B' : '#FFFFFF'}
          ios_backgroundColor="rgba(0,0,0,0.1)"
        />
      </View>

      {/* Payment Methods */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('quick_pay', 'Quick Pay')}</Text>
      </View>
      <View style={styles.paymentGrid}>
        <TouchableOpacity style={[styles.paymentBtn, styles.bgBlueLight]} activeOpacity={0.8} onPress={handleRenew}>
          <Feather name="smartphone" size={20} color="#111827" />
          <Text style={styles.paymentBtnText}>GPay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.paymentBtn, styles.bgPinkLight]} activeOpacity={0.8} onPress={handleRenew}>
          <Feather name="credit-card" size={20} color="#111827" />
          <Text style={styles.paymentBtnText}>Cards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.paymentBtn, styles.bgAmberLight]} activeOpacity={0.8} onPress={handleRenew}>
          <Feather name="zap" size={20} color="#111827" />
          <Text style={styles.paymentBtnText}>UPI</Text>
        </TouchableOpacity>
      </View>

      {/* Plan Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>{t('coverage_details', 'Coverage Details')}</Text>
        <View style={styles.featuresList}>
          {['Accidental Disability Cover', 'Income Protection (Rain/Heat)', 'Hospital Cash Benefit', '24/7 Tele-consultation'].map((feature, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.checkInnerCircle}>
                <Feather name="check" size={14} color="#1D9E75" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.viewPolicyBtn} activeOpacity={0.9}>
          <Text style={styles.viewPolicyText}>{t('view_full_policy', 'VIEW FULL POLICY')}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  screenTitle: { fontSize: 32, fontWeight: '900', color: '#111827' },
  activeBadge: { backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  activeBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  premiumCard: {
    backgroundColor: '#FFFBEB', borderRadius: 24, padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  premiumBgEffect: {
    position: 'absolute', top: -30, right: -30, width: 160, height: 160, backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 80, opacity: 0.8,
  },
  premiumLabel: { fontSize: 13, fontWeight: '900', color: 'rgba(0,0,0,0.6)', letterSpacing: 1.5, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 24 },
  priceBig: { fontSize: 56, fontWeight: '900', color: '#111827', letterSpacing: -2 },
  priceUnit: { fontSize: 18, fontWeight: '900', color: 'rgba(0,0,0,0.4)' },
  progressContainer: { gap: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressLabel: { fontSize: 13, fontWeight: '900', color: 'rgba(0,0,0,0.6)' },
  progressValue: { fontSize: 15, fontWeight: '900', color: '#111827' },
  progressBarBg: { width: '100%', height: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  progressBarFill: { height: '100%', backgroundColor: '#111827', borderRadius: 8 },
  progressHelper: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.4)', fontStyle: 'italic' },
  autoRenewCard: {
    backgroundColor: '#F0FDF4', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  autoRenewLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBoxWhite: { width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  autoRenewTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  autoRenewSub: { fontSize: 13, fontWeight: '800', color: 'rgba(0,0,0,0.5)' },
  sectionHeader: { marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  paymentGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  paymentBtn: {
    flex: 1, aspectRatio: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  bgBlueLight: { backgroundColor: '#EFF6FF' },
  bgPinkLight: { backgroundColor: '#FDF2F8' },
  bgAmberLight: { backgroundColor: '#FFFBEB' },
  paymentBtnText: { fontSize: 12, fontWeight: '900', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4 },
  detailsTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 24 },
  featuresList: { gap: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  checkInnerCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: 'rgba(29,158,117,0.2)', justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 15, fontWeight: '800', color: '#111827', letterSpacing: -0.2 },
  viewPolicyBtn: { width: '100%', marginTop: 32, paddingVertical: 18, backgroundColor: '#111827', borderRadius: 20, alignItems: 'center' },
  viewPolicyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
});
