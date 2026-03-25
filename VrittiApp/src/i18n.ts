import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import hi from './locales/hi.json';
import gu from './locales/gu.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import te from './locales/te.json';

const LANGUAGE_KEY = '@vritti_language';
const SUPPORTED_LANGUAGES = ['hi', 'gu', 'mr', 'ta', 'te'];

export const getStoredLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
};

export const setStoredLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18next.changeLanguage(lang);
  } catch {
    // silent fail
  }
};

const getDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const code = locales[0].languageCode ?? 'hi';
    if (SUPPORTED_LANGUAGES.includes(code)) return code;
  }
  return 'hi';
};

export const initI18n = async () => {
  const stored = await getStoredLanguage();
  const lng = stored || getDeviceLanguage();

  await i18next.use(initReactI18next).init({
    resources: {
      hi: { translation: hi },
      gu: { translation: gu },
      mr: { translation: mr },
      ta: { translation: ta },
      te: { translation: te },
    },
    lng,
    fallbackLng: 'hi',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
};

export default i18next;
