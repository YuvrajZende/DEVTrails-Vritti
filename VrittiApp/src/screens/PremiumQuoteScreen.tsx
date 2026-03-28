import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { workerOnboard, policyActivate } from '../services/api';
import { Feather } from '@expo/vector-icons';

export default function PremiumQuoteScreen({ navigation, route, onComplete }: any) {
  const { t } = useTranslation();
  const params = route?.params ?? {};

  const [loadingQuote, setLoadingQuote] = useState(true);
  const [activating, setActivating] = useState(false);
  const [workerData, setWorkerData] = useState<any>(null);

  React.useEffect(() => {
    const generateQuote = async () => {
      try {
        const onboardRes = await workerOnboard({
          phone: params.phone || '9999999999',
          platform: params.platform || 'amazon',
          partner_id: params.partnerId || 'AMZ-001',
        });
        setWorkerData(onboardRes);
      } catch (err: any) {}
      finally { setLoadingQuote(false); }
    };
    generateQuote();
  }, []);

  const premiumAmount = workerData?.premium_tier || 49;
  const coverageCap = workerData?.coverage_cap || 800;
  const riskScore = workerData?.risk_score || 0.40;

  const handleActivate = async () => {
    if (!workerData?.worker_id) {
      // Fallback: finalize onboarding anyway
      await AsyncStorage.setItem('@vritti_onboarded', 'true');
      if (onComplete) onComplete();
      return;
    }
    setActivating(true);
    try {
      const upiUrl = `upi://pay?pa=vritti@razorpay&pn=Vritti&am=${premiumAmount}&tn=WeeklyShield&cu=INR`;
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) await Linking.openURL(upiUrl);

      await policyActivate(workerData.worker_id, 'mock-payment-ref', premiumAmount, coverageCap, riskScore);
      await AsyncStorage.setItem('@vritti_onboarded', 'true');
      await AsyncStorage.setItem('@vritti_worker_id', workerData.worker_id);

      if (onComplete) onComplete();
    } catch (err) {
      await AsyncStorage.setItem('@vritti_onboarded', 'true');
      if (onComplete) onComplete();
    }
    setActivating(false);
  };

  if (loadingQuote) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Calculating your premium...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.innerContainer}>
        {/* Amber Quote Card */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteCardBgBlur} />

          <View style={styles.quoteCardInner}>
            {/* Shield Icon */}
            <View style={styles.shieldBox}>
              <Feather name="shield" size={40} color="#F59E0B" />
            </View>

            <Text style={styles.premiumLabel}>WEEKLY PREMIUM</Text>
            <Text style={styles.priceText}>₹{premiumAmount}</Text>

            {/* Coverage Features */}
            <View style={styles.featuresBox}>
              {['Accidental Disability Cover', 'Income Protection (Rain/Heat)', 'Hospital Cash Benefit'].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.featureCheckCircle}>
                    <Feather name="check" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {activating ? (
              <View style={styles.activatingRow}>
                <ActivityIndicator size="large" color="#111827" />
              </View>
            ) : (
              <TouchableOpacity style={styles.activateBtn} onPress={handleActivate} activeOpacity={0.9}>
                <Text style={styles.activateBtnText}>{t('activate_shield', 'ACTIVATE POLICY')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.legalNote}>
          By activating, you authorize recurring weekly payments of ₹{premiumAmount}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '800', color: 'rgba(0,0,0,0.4)', marginTop: 16 },
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, paddingTop: 60 },
  innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  quoteCard: {
    width: '100%', backgroundColor: '#FFFBEB', borderRadius: 32, padding: 40,
    alignItems: 'center', position: 'relative', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
  },
  quoteCardBgBlur: { position: 'absolute', top: -20, left: -20, width: 160, height: 160, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 80, opacity: 0.8 },
  quoteCardInner: { width: '100%', alignItems: 'center', zIndex: 10 },
  shieldBox: {
    width: 80, height: 80, backgroundColor: '#111827', borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 32,
    transform: [{ rotate: '3deg' }],
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  premiumLabel: { fontSize: 14, fontWeight: '900', color: 'rgba(0,0,0,0.5)', letterSpacing: 3, marginBottom: 8 },
  priceText: { fontSize: 64, fontWeight: '900', color: '#111827', letterSpacing: -3, marginBottom: 32 },
  featuresBox: {
    width: '100%', gap: 20, backgroundColor: 'rgba(255,255,255,0.4)', padding: 24, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', marginBottom: 40,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureCheckCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 15, fontWeight: '900', color: '#111827', letterSpacing: -0.2 },
  activatingRow: { padding: 20 },
  activateBtn: {
    width: '100%', height: 64, backgroundColor: '#111827', borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  activateBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  legalNote: { marginTop: 32, fontSize: 12, fontWeight: '800', color: 'rgba(0,0,0,0.3)', textAlign: 'center', maxWidth: 240 },
});
