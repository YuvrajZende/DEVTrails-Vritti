import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Switch, Linking, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { policyActivate } from '../services/api';

export default function RenewScreen() {
  const { t } = useTranslation();
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const premiumAmount = 49;

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

      // Activate policy via backend
      const workerId = (await AsyncStorage.getItem('@vritti_worker_id')) || '';
      if (workerId) {
        await policyActivate(workerId, `UPI_RENEW_${Date.now()}`);
      }
    } catch (err: any) {
      console.error('Renewal failed:', err.message);
    }
    setRenewing(false);
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

      {/* Auto-renew toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{t('auto_renew')}</Text>
        <Switch
          value={autoRenew}
          onValueChange={handleAutoRenewToggle}
          trackColor={{ false: '#334155', true: '#166534' }}
          thumbColor={autoRenew ? '#22C55E' : '#94A3B8'}
        />
      </View>

      <TouchableOpacity
        style={styles.renewBtn}
        onPress={handleRenew}
        activeOpacity={0.8}
      >
        <Text style={styles.renewBtnText}>{t('renew_shield')}</Text>
      </TouchableOpacity>
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
  shield: { fontSize: 72, marginBottom: 24 },
  priceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 28,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  renewBtn: {
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
  renewBtnText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
