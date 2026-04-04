import React from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { setStoredLanguage } from '../i18n';
import { AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

const languages = [
  { code: 'en', label: 'English', note: 'Default' },
  { code: 'hi', label: '??????', note: 'Native' },
  { code: 'gu', label: '???????', note: 'Native' },
  { code: 'mr', label: '?????', note: 'Native' },
  { code: 'ta', label: '?????', note: 'Native' },
  { code: 'te', label: '??????', note: 'Native' },
];

export default function LanguageSelectScreen({ navigation }: any) {
  const [selected, setSelected] = React.useState('en');

  const handleContinue = async () => {
    await setStoredLanguage(selected);
    navigation.navigate('PhoneEntry');
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.stepText}>Step 1 of 5</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '20%' }]} />
      </View>

      <ScreenHeading title="Language" subtitle="Choose the language you want to use before you continue through onboarding." />

      <View style={styles.grid}>
        {languages.map((language) => {
          const active = selected === language.code;
          return (
            <Pressable
              key={language.code}
              onPress={() => setSelected(language.code)}
              style={({ pressed }) => [styles.languageCard, active && styles.languageCardActive, pressed && styles.languageCardPressed]}
            >
              <Text style={[styles.languageLabel, active && styles.languageLabelActive]}>{language.label}</Text>
              <Text style={[styles.languageNote, active && styles.languageNoteActive]}>{language.note}</Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton title="Continue" onPress={handleContinue} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 44,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.softText,
    marginBottom: 10,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
    overflow: 'hidden',
    marginBottom: 28,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.black,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  languageCard: {
    width: '48%',
    minHeight: 112,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  languageCardActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  languageCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  languageLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  languageLabelActive: {
    color: colors.white,
  },
  languageNote: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.softText,
    textTransform: 'uppercase',
  },
  languageNoteActive: {
    color: 'rgba(255,255,255,0.65)',
  },
});


