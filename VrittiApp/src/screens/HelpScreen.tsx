import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';

const FAQS = [
  { key: 'faq_what_is', emoji: '❓' },
  { key: 'faq_how_paid', emoji: '💸' },
  { key: 'faq_held', emoji: '⏸️' },
  { key: 'faq_how_renew', emoji: '🔄' },
  { key: 'faq_shield', emoji: '🛡️' },
] as const;

export default function HelpScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const handleFAQ = (key: string) => {
    // In production: use expo-av to play pre-recorded Hindi audio
    // For hackathon: just show a simple alert or do nothing
  };

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.title}>🎧 {t('help')}</Text>

      <View style={styles.faqList}>
        {FAQS.map((faq) => (
          <TouchableOpacity
            key={faq.key}
            style={styles.faqBtn}
            onPress={() => handleFAQ(faq.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.faqEmoji}>{faq.emoji}</Text>
            <Text style={styles.faqText}>{t(faq.key)}</Text>
            <Text style={styles.playIcon}>🔊</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.whatsappBtn}
        onPress={handleWhatsApp}
        activeOpacity={0.8}
      >
        <Text style={styles.whatsappEmoji}>💬</Text>
        <Text style={styles.whatsappText}>{t('whatsapp_support')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resetBtn}
        onPress={handleResetSession}
        activeOpacity={0.8}
      >
        <Text style={styles.resetEmoji}>⚠️</Text>
        <Text style={styles.resetText}>Reset App Session</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  faqList: { flex: 1 },
  faqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
  },
  faqEmoji: { fontSize: 28, marginRight: 14 },
  faqText: {
    flex: 1,
    fontSize: 16,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  playIcon: { fontSize: 20 },
  whatsappBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    elevation: 4,
  },
  whatsappEmoji: { fontSize: 24, marginRight: 10 },
  whatsappText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    elevation: 4,
  },
  resetEmoji: { fontSize: 24, marginRight: 10 },
  resetText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
