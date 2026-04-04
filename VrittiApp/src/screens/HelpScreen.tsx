import React from 'react';
import { Alert, Linking, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

const faqKeys = [
  'faq_what_is',
  'faq_how_paid',
  'faq_held',
  'faq_how_renew',
  'faq_shield',
] as const;

export default function HelpScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/919999999999');
  };

  const handleResetSession = () => {
    Alert.alert(
      'Reset session',
      'Clear local app data and return to language selection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'LanguageSelect' as never }],
              })
            );
          },
        },
      ]
    );
  };

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />

      <ScreenHeading title="Support" subtitle="The help area now follows the same high-contrast card language as the GigShield reference." />

      <View style={styles.faqList}>
        {faqKeys.map((faqKey) => (
          <AppCard key={faqKey} style={styles.faqCard}>
            <View style={styles.faqIcon}>
              <Feather name="help-circle" size={20} color={colors.text} />
            </View>
            <Text style={styles.faqText}>{t(faqKey)}</Text>
            <View style={styles.faqArrow}>
              <Feather name="arrow-up-right" size={18} color={colors.white} />
            </View>
          </AppCard>
        ))}
      </View>

      <PrimaryButton title={t('whatsapp_support')} onPress={handleWhatsApp} style={styles.buttonSpacing} />

      <Pressable onPress={handleResetSession} style={({ pressed }) => [styles.resetButton, pressed && styles.resetPressed]}>
        <Feather name="alert-triangle" size={18} color={colors.white} />
        <Text style={styles.resetText}>Reset app session</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 140,
  },
  faqList: {
    gap: 14,
    marginBottom: 18,
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  faqIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.text,
  },
  faqArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpacing: {
    marginBottom: 14,
  },
  resetButton: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  resetPressed: {
    opacity: 0.92,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
