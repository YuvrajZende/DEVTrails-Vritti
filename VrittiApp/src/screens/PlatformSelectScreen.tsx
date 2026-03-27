import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';

const PLATFORMS = [
  { id: 'amazon', label: 'Amazon', emoji: '📦', color: '#FF9900' },
  { id: 'flipkart', label: 'Flipkart', emoji: '🛒', color: '#2874F0' },
  { id: 'meesho', label: 'Meesho', emoji: '🛍️', color: '#E91E63' },
  { id: 'other', label: 'Other', emoji: '🚲', color: '#6B7280' },
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.emoji}>🏢</Text>
      <Text style={styles.title}>{t('select_platform')}</Text>
      <View style={styles.grid}>
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.btn,
              { backgroundColor: p.color },
              selected === p.id && styles.btnSelected,
            ]}
            onPress={() => handleSelect(p.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.platformEmoji}>{p.emoji}</Text>
            <Text style={styles.platformLabel}>{p.label}</Text>
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
  emoji: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btn: {
    width: '45%',
    paddingVertical: 28,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    margin: 7,
  },
  btnSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.02 }],
  },
  platformEmoji: { fontSize: 40, marginBottom: 8 },
  platformLabel: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
