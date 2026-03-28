import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

const PLATFORMS = [
  { id: 'amazon', label: 'Amazon', emoji: '📦' },
  { id: 'flipkart', label: 'Flipkart', emoji: '🛒' },
  { id: 'meesho', label: 'Meesho', emoji: '🛍️' },
  { id: 'other', label: 'Other', emoji: '🚲' },
];

export default function PlatformSelectScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const phone = route?.params?.phone ?? '';
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (platform: string) => {
    setSelected(platform);
    setTimeout(() => {
      navigation.navigate('PartnerID', { phone, platform });
    }, 300);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={20} color="#111827" />
      </TouchableOpacity>

      <Text style={styles.title}>{t('select_platform', 'Which platform do you work with?')}</Text>
      <Text style={styles.subtitle}>Select your delivery or gig platform</Text>

      <View style={styles.grid}>
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.platformCard, selected === p.id ? styles.platformCardSelected : styles.platformCardDefault]}
            onPress={() => handleSelect(p.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.platformEmoji}>{p.emoji}</Text>
            <Text style={[styles.platformLabel, selected === p.id ? styles.labelSelected : styles.labelDefault]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 24, paddingTop: 60 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', marginBottom: 32,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '800', color: 'rgba(0,0,0,0.4)', marginBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  platformCard: {
    width: '47%', aspectRatio: 1, borderRadius: 24, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  platformCardSelected: { borderColor: '#111827', backgroundColor: '#111827', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  platformCardDefault: { borderColor: 'rgba(0,0,0,0.05)', backgroundColor: '#FFFFFF' },
  platformEmoji: { fontSize: 48 },
  platformLabel: { fontSize: 16, fontWeight: '900' },
  labelSelected: { color: '#FFFFFF' },
  labelDefault: { color: '#111827' },
});
