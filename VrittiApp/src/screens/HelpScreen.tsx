import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

const FAQS = [
  { key: 'faq_what_is', defaultText: 'What is Weekly Shield?' },
  { key: 'faq_how_paid', defaultText: 'How do payouts work?' },
  { key: 'faq_held', defaultText: 'Why is my payout held?' },
  { key: 'faq_how_renew', defaultText: 'How to auto-renew?' },
  { key: 'faq_shield', defaultText: 'What disruptions are covered?' },
] as const;

export default function HelpScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const handleFAQ = (key: string) => {};

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/919999999999');
  };

  const handleResetSession = () => {
    Alert.alert(
      "Reset Session",
      "Are you sure you want to clear your data and return to the language screen?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Reset", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'LanguageSelect' }],
              })
            );
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <Text style={styles.title}>{t('support', 'Support')}</Text>

      <View style={styles.faqList}>
        {FAQS.map((faq) => (
          <TouchableOpacity
            key={faq.key}
            style={styles.faqCard}
            onPress={() => handleFAQ(faq.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.faqText}>{t(faq.key, faq.defaultText)}</Text>
            <View style={styles.arrowCircle}>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleWhatsApp}
        activeOpacity={0.8}
      >
        <Feather name="message-circle" size={24} color="#111827" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.actionCardTitle}>{t('whatsapp_support', 'Contact WhatsApp Support')}</Text>
          <Text style={styles.actionCardSub}>Get help from a real person</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, styles.dangerCard]}
        onPress={handleResetSession}
        activeOpacity={0.8}
      >
        <Feather name="alert-triangle" size={24} color="#DC2626" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.dangerTitle}>Reset App Session</Text>
          <Text style={styles.dangerSub}>Clear local data & restart onboarding</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 24 },
  faqList: { gap: 16, marginBottom: 32 },
  faqCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3,
  },
  faqText: { flex: 1, fontSize: 16, fontWeight: '800', color: '#111827' },
  arrowCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  actionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3,
  },
  actionCardTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  actionCardSub: { fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.4)', marginTop: 4 },
  dangerCard: { borderColor: 'rgba(220,38,38,0.2)', backgroundColor: '#FEF2F2' },
  dangerTitle: { fontSize: 16, fontWeight: '900', color: '#DC2626' },
  dangerSub: { fontSize: 13, fontWeight: '600', color: 'rgba(220,38,38,0.6)', marginTop: 4 },
});
