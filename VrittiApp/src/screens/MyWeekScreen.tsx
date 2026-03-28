import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

const MOCK_WEEK = {
  earnings: 3800,
  daysActive: 5,
  disruptionDays: 1,
};

// Simulated chart data
const CHART_DATA = [
  { day: 'Wed', data: 0.8, op: 0.4 },
  { day: 'Thu', data: 0.6, op: 0.3 },
  { day: 'Fri', data: 0.4, op: 0.5, opLabel: '37%', dataLabel: '87%' },
  { day: 'Sat', data: 0.35, op: 0.45 },
];

export default function MyWeekScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.profileAvatar}>
          <View style={styles.avatarLineShort} />
          <View style={styles.avatarLineLong} />
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="settings" size={18} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillButton}>
            <Feather name="plus" size={14} color="#111827" />
            <Text style={styles.pillButtonText}>{t('new_scenario', '+ New tracking')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.screenTitle}>{t('statistics', 'Statistics')}</Text>

      {/* Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('weekly_usage', 'Usage')}</Text>
          <TouchableOpacity style={styles.yearButton}>
            <Text style={styles.yearButtonText}>2026</Text>
            <Feather name="chevron-down" size={14} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.chartArea}>
          {CHART_DATA.map((item, i) => (
            <View key={i} style={styles.chartColumn}>
              <View style={styles.barsContainer}>
                {/* Background dashed stripes */}
                <View style={[StyleSheet.absoluteFill, styles.bgStripes]}>
                  {[1, 2, 3, 4, 5].map(j => <View key={j} style={styles.bgStripeItem} />)}
                </View>
                
                {/* Data Bar (Pink) */}
                <View style={[styles.dataBar, { height: `${item.data * 100}%` }]}>
                  {item.dataLabel && (
                    <View style={styles.dataLabelTooltip}>
                      <Text style={styles.tooltipText}>{item.dataLabel}</Text>
                    </View>
                  )}
                </View>
                
                {/* Op Bar (Blue) */}
                <View style={[styles.opBar, { height: `${item.op * 100}%` }]}>
                  {item.opLabel && (
                    <View style={styles.opLabelTooltip}>
                      <Text style={styles.tooltipText}>{item.opLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.dayText}>{item.day}</Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.legendDotBlue} />
            <Text style={styles.legendText}>{t('days_active', 'Days Active')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDotPink} />
            <Text style={styles.legendText}>{t('earnings', 'Earnings')}</Text>
          </View>
        </View>
      </View>

      {/* Recommended Section */}
      <View style={styles.recommendedSection}>
        <Text style={styles.recommendedTitle}>{t('recommended', 'Recommended for you')}</Text>
        <View style={styles.gridRow}>
          {/* Support Community Card */}
          <View style={styles.gridCard}>
            <View style={styles.iconBoxPink}>
               <View style={styles.squareIconOuter}>
                 <View style={styles.squareIconInnerDot} />
               </View>
            </View>
            <Text style={styles.gridCardTitle}>Community</Text>
          </View>

          {/* Academy Card */}
          <View style={styles.gridCard}>
            <View style={styles.iconBoxBlue}>
               <View style={styles.pillIcon} />
            </View>
            <Text style={styles.gridCardTitle}>Academy</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  profileAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#111827',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLineShort: { width: 20, height: 2, backgroundColor: '#FFFFFF', marginBottom: 4 },
  avatarLineLong: { width: 20, height: 2, backgroundColor: '#FFFFFF' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  iconButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  pillButton: {
    height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  pillButtonText: { fontSize: 13, fontWeight: '800', color: '#111827' },
  screenTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 16 },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  chartTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  yearButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  yearButtonText: { fontSize: 12, fontWeight: '800', color: '#111827' },
  chartArea: { flexDirection: 'row', justifyContent: 'space-between', height: 240, marginBottom: 24, paddingHorizontal: 8 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 12 },
  barsContainer: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  bgStripes: { flexDirection: 'column', justifyContent: 'space-between', paddingVertical: 4 },
  bgStripeItem: { width: '100%', height: 32, backgroundColor: '#F3F4F6', borderRadius: 12 },
  dataBar: { width: 44, backgroundColor: '#FCE7F3', borderRadius: 20, position: 'absolute', bottom: 0, justifyContent: 'center', alignItems: 'center' },
  opBar: { width: 44, backgroundColor: '#DBEAFE', borderRadius: 20, position: 'absolute', bottom: 0, justifyContent: 'center', alignItems: 'center' },
  dataLabelTooltip: { position: 'absolute', top: -30, backgroundColor: '#111827', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  opLabelTooltip: { position: 'absolute', top: -30, backgroundColor: '#111827', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tooltipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  dayText: { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDotBlue: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BFDBFE' },
  legendDotPink: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBCFE8' },
  legendText: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  recommendedSection: { marginTop: 8 },
  recommendedTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 16 },
  gridRow: { flexDirection: 'row', gap: 16 },
  gridCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  iconBoxPink: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FDF2F8', justifyContent: 'center', alignItems: 'center' },
  squareIconOuter: { width: 20, height: 20, borderWidth: 2, borderColor: '#111827', borderRadius: 4, position: 'relative' },
  squareIconInnerDot: { width: 8, height: 8, backgroundColor: '#111827', borderRadius: 4, position: 'absolute', bottom: -4, right: -4 },
  iconBoxBlue: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  pillIcon: { width: 24, height: 16, borderWidth: 2, borderColor: '#111827', borderRadius: 8 },
  gridCardTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
});
