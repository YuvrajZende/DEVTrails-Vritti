import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', color: '#3B82F6' },
  { code: 'hi', label: 'हिन्दी', color: '#FF6B35' },
  { code: 'gu', label: 'ગુજરાતી', color: '#2EC4B6' },
  { code: 'mr', label: 'मराठी', color: '#E71D36' },
  { code: 'ta', label: 'தமிழ்', color: '#011627' },
  { code: 'te', label: 'తెలుగు', color: '#6B4226' },
];

export default function LanguageSelectScreen({ navigation }: any) {
  const { t } = useTranslation();

  const handleSelect = async (code: string) => {
    await setStoredLanguage(code);
    navigation.navigate('PhoneEntry');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.title}>🛡️ Vritti</Text>
      <Text style={styles.subtitle}>भाषा चुनें / Select Language</Text>
      <View style={styles.grid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.btn, { backgroundColor: lang.color }]}
            onPress={() => handleSelect(lang.code)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 40,
    textAlign: 'center',
  },
  grid: {
    width: '100%',
  },
  btn: {
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: 14,
  },
  btnText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
