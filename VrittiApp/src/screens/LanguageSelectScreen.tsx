import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage } from '../i18n';
import { Feather } from '@expo/vector-icons';

const LANGUAGES = [
  { code: 'en', label: 'English', sub: 'Default' },
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
  { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
  { code: 'mr', label: 'मराठी', sub: 'Marathi' },
];

export default function LanguageSelectScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState('en');

  const handleContinue = async () => {
    await setStoredLanguage(selectedLang);
    navigation.navigate('PhoneEntry');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Progress */}
      <View style={styles.progressHeader}>
        <View style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#111827" />
        </View>
        <Text style={styles.stepText}>STEP 1 OF 4</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: '25%' }]} />
      </View>

      <Text style={styles.title}>Language</Text>
      <Text style={styles.subtitle}>Choose your preferred language to continue</Text>

      <View style={styles.grid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langBtn, selectedLang === lang.code ? styles.langBtnActive : styles.langBtnInactive]}
            onPress={() => setSelectedLang(lang.code)}
            activeOpacity={0.8}
          >
            <Text style={[styles.langText, selectedLang === lang.code ? styles.langTextActive : styles.langTextInactive]}>
              {lang.label}
            </Text>
            <Text style={[styles.langSub, selectedLang === lang.code ? styles.langSubActive : styles.langSubInactive]}>
              {lang.sub}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.9}>
        <Text style={styles.continueBtnText}>CONTINUE</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stepText: { fontSize: 12, fontWeight: '900', color: 'rgba(0,0,0,0.4)', letterSpacing: 2 },
  progressBarBg: { width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden', marginBottom: 40, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  progressBarFill: { height: '100%', backgroundColor: '#111827', borderRadius: 4 },
  title: { fontSize: 36, fontWeight: '900', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '800', color: 'rgba(0,0,0,0.4)', marginBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  langBtn: {
    width: '47%', height: 112, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  langBtnActive: { borderColor: '#111827', backgroundColor: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  langBtnInactive: { borderColor: 'rgba(0,0,0,0.05)', backgroundColor: '#FFFFFF' },
  langText: { fontSize: 20, fontWeight: '900' },
  langTextActive: { color: '#FFFFFF' },
  langTextInactive: { color: 'rgba(0,0,0,0.4)' },
  langSub: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
  langSubActive: { color: 'rgba(255,255,255,0.6)' },
  langSubInactive: { color: 'rgba(0,0,0,0.3)' },
  continueBtn: {
    width: '100%', height: 64, backgroundColor: '#111827', borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginTop: 48,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
});
