import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';

const MOCK_WEEK = {
  earnings: 3800,
  daysActive: 5,
  disruptionDays: 1,
};

export default function MyWeekScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
      <Text style={styles.title}>📊 {t('my_week')}</Text>

      {/* Earnings */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('earnings_this_week')}</Text>
        <Text style={styles.cardValueBig}>₹{MOCK_WEEK.earnings.toLocaleString('en-IN')}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '76%' }]} />
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: '#22C55E' }]}>
          <Text style={styles.statValue}>{MOCK_WEEK.daysActive}</Text>
          <Text style={styles.statLabel}>{t('days_active')}</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#EAB308' }]}>
          <Text style={styles.statValue}>{MOCK_WEEK.disruptionDays}</Text>
          <Text style={styles.statLabel}>{t('disruption_days')}</Text>
        </View>
      </View>

      {/* Weekly Progress */}
      <View style={styles.weekRow}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
          <View key={day} style={styles.dayCol}>
            <View
              style={[
                styles.dayDot,
                i < MOCK_WEEK.daysActive
                  ? styles.dayActive
                  : i === MOCK_WEEK.daysActive
                  ? styles.dayDisruption
                  : styles.dayInactive,
              ]}
            />
            <Text style={styles.dayText}>{day}</Text>
          </View>
        ))}
      </View>
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardValueBig: {
    fontSize: 40,
    fontWeight: '800',
    color: '#22C55E',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    marginHorizontal: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  dayCol: { alignItems: 'center' },
  dayDot: { width: 28, height: 28, borderRadius: 14 },
  dayActive: { backgroundColor: '#22C55E' },
  dayDisruption: { backgroundColor: '#EAB308' },
  dayInactive: { backgroundColor: '#334155' },
  dayText: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 8 },
});
