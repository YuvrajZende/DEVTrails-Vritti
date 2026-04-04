import React, { useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppScreen, PrimaryButton, ScreenHeading } from '../ui/components';
import { colors } from '../ui/theme';

const platforms = [
  { id: 'amazon', label: 'Amazon', icon: 'package-variant-closed', color: '#FFFBEB' },
  { id: 'flipkart', label: 'Flipkart', icon: 'shopping-outline', color: '#DBEAFE' },
  { id: 'meesho', label: 'Meesho', icon: 'storefront-outline', color: '#FCE7F3' },
  { id: 'other', label: 'Other', icon: 'bike-fast', color: '#ECFDF5' },
] as const;

export default function PlatformSelectScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const phone = route?.params?.phone ?? '';
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />
      <Text style={styles.stepText}>Step 4 of 5</Text>
      <ScreenHeading title={t('select_platform')} subtitle="Choose the platform that maps to your worker ID and renewal journey." />

      <View style={styles.grid}>
        {platforms.map((platform) => {
          const active = selected === platform.id;
          return (
            <Pressable
              key={platform.id}
              onPress={() => setSelected(platform.id)}
              style={({ pressed }) => [styles.card, { backgroundColor: platform.color }, active && styles.cardActive, pressed && styles.cardPressed]}
            >
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name={platform.icon} size={28} color={colors.text} />
              </View>
              <Text style={styles.cardLabel}>{platform.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        title={selected ? 'Continue' : 'Select platform'}
        disabled={!selected}
        onPress={() => navigation.navigate('PartnerID', { phone, platform: selected })}
      />
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
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: '48%',
    minHeight: 140,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: colors.black,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  cardIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
});


