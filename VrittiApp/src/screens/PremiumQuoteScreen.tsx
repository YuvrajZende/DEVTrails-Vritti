import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { workerOnboard, policyActivate } from '../services/api';

export default function PremiumQuoteScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const params = route?.params ?? {};
  const [activating, setActivating] = useState(false);

  const premiumAmount = 49;
  const coverageCap = 800;

  const handleActivate = async () => {
    setActivating(true);
    try {
      // 1. Onboard the worker
      const onboardRes = await workerOnboard({
        phone: params.phone || '9999999999',
        platform: params.platform || 'amazon',
        partner_id: params.partnerId || 'AMZ-001',
      });

      // 2. Open UPI deeplink
      const upiUrl = `upi://pay?pa=vritti@razorpay&pn=Vritti&am=${premiumAmount}&tn=WeeklyShield&cu=INR`;
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      }

      // 3. Activate policy (mock — in real app, wait for payment callback)
      await policyActivate(onboardRes.worker_id, 'mock-payment-ref');

      // 4. Mark onboarding complete
      await AsyncStorage.setItem('@vritti_onboarded', 'true');
      await AsyncStorage.setItem('@vritti_worker_id', onboardRes.worker_id);

      // 5. Navigate to main app
      if (params.onComplete) {
        params.onComplete();
      }
    } catch (err) {
      // For hackathon: still mark as complete even on error
      await AsyncStorage.setItem('@vritti_onboarded', 'true');
      if (params.onComplete) {
        params.onComplete();
      }
    }
    setActivating(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.shield}>🛡️</Text>

      <View style={styles.priceCard}>
        <Text style={styles.costLabel}>{t('weekly_shield_cost')}</Text>
        <Text style={styles.price}>₹{premiumAmount}</Text>
        <Text style={styles.perWeek}>{t('per_week')}</Text>
      </View>

      <View style={styles.protectionCard}>
        <Text style={styles.protectionLabel}>{t('your_protection')}</Text>
        <Text style={styles.protectionAmount}>₹{coverageCap}</Text>
      </View>

      {activating ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.activateBtn}
          onPress={handleActivate}
          activeOpacity={0.8}
        >
          <Text style={styles.activateBtnText}>{t('activate_shield')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  shield: { fontSize: 80, marginBottom: 24 },
  priceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  costLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  price: {
    fontSize: 56,
    fontWeight: '800',
    color: '#22C55E',
  },
  perWeek: {
    fontSize: 18,
    color: '#94A3B8',
    marginTop: 4,
  },
  protectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
  },
  protectionLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  protectionAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingRow: { padding: 20 },
  activateBtn: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  activateBtnText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
