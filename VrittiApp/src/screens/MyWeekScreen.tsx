import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard, AppScreen, HeaderAction, ScreenHeading } from '../ui/components';
import { colors, formatCurrency } from '../ui/theme';

const weekData = [
  { label: '27 Mar', operations: 0.4, earnings: 0.8 },
  { label: '28 Mar', operations: 0.3, earnings: 0.6 },
  { label: '29 Mar', operations: 0.55, earnings: 0.42, opLabel: '5 rides', earnLabel: 'Rs 870' },
  { label: '30 Mar', operations: 0.46, earnings: 0.36 },
];

export default function MyWeekScreen() {
  const { t } = useTranslation();

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.page} />

      <View style={styles.topRow}>
        <HeaderAction icon={<Feather name="menu" size={18} color={colors.text} />} />
        <View style={styles.topActions}>
          <HeaderAction icon={<Feather name="settings" size={18} color={colors.text} />} />
          <HeaderAction
            wide
            label="New week"
            icon={<Feather name="plus" size={16} color={colors.text} />}
          />
        </View>
      </View>

      <ScreenHeading title="Statistics" subtitle="A cleaner summary of activity, earnings, and disruption exposure for the current work cycle." />

      <AppCard style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Usage</Text>
          <View style={styles.yearBadge}>
            <Text style={styles.yearText}>2026</Text>
            <Feather name="chevron-down" size={16} color={colors.text} />
          </View>
        </View>

        <View style={styles.chartColumns}>
          {weekData.map((item) => (
            <View key={item.label} style={styles.chartColumn}>
              <View style={styles.chartStack}>
                <View style={styles.chartGhosts}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <View key={index} style={styles.chartGhost} />
                  ))}
                </View>
                <View style={[styles.chartBar, styles.chartBarPink, { height: `${item.earnings * 100}%` }]}>
                  {item.earnLabel ? <Text style={styles.barTag}>{item.earnLabel}</Text> : null}
                </View>
                <View style={[styles.chartBar, styles.chartBarBlue, { height: `${item.operations * 100}%` }]}>
                  {item.opLabel ? <Text style={styles.barTag}>{item.opLabel}</Text> : null}
                </View>
              </View>
              <Text style={styles.chartLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#BFDBFE' }]} />
            <Text style={styles.legendText}>Operations</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FBCFE8' }]} />
            <Text style={styles.legendText}>{t('earnings_this_week')}</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.metricsGrid}>
        <AppCard variant="pink" style={styles.metricCard}>
          <Text style={styles.metricBig}>{formatCurrency(3800)}</Text>
          <Text style={styles.metricTitle}>{t('earnings_this_week')}</Text>
          <Text style={styles.metricBody}>Strong weekday trend with a smaller weekend drop.</Text>
        </AppCard>

        <AppCard variant="blue" style={styles.metricCard}>
          <Text style={styles.metricBig}>5</Text>
          <Text style={styles.metricTitle}>{t('days_active')}</Text>
          <Text style={styles.metricBody}>You stayed active for most of the current cycle.</Text>
        </AppCard>
      </View>

      <AppCard style={styles.recommendCard}>
        <Text style={styles.recommendTitle}>Recommended next steps</Text>
        <View style={styles.recommendGrid}>
          <View style={styles.recommendItem}>
            <View style={[styles.recommendIcon, { backgroundColor: '#FDF2F8' }]}>
              <Feather name="users" size={18} color={colors.text} />
            </View>
            <Text style={styles.recommendLabel}>Community</Text>
          </View>
          <View style={styles.recommendItem}>
            <View style={[styles.recommendIcon, { backgroundColor: '#DBEAFE' }]}>
              <Feather name="book-open" size={18} color={colors.text} />
            </View>
            <Text style={styles.recommendLabel}>Academy</Text>
          </View>
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 140,
  },
  topRow: {
    marginTop: 4,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    marginBottom: 18,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  yearText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  chartColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 22,
    gap: 8,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartStack: {
    width: '100%',
    height: 220,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  chartGhosts: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  chartGhost: {
    height: 32,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.05)',
  },
  chartBar: {
    width: '72%',
    borderRadius: 18,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  chartBarPink: {
    backgroundColor: '#FBCFE8',
  },
  chartBarBlue: {
    backgroundColor: '#BFDBFE',
  },
  barTag: {
    position: 'absolute',
    top: -34,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.black,
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  chartLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '800',
    color: colors.softText,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
  },
  metricsGrid: {
    gap: 14,
    marginBottom: 18,
  },
  metricCard: {
    gap: 10,
  },
  metricBig: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.text,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  metricBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: '600',
  },
  recommendCard: {
    marginBottom: 4,
  },
  recommendTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 16,
  },
  recommendGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  recommendItem: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  recommendIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  recommendLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
});
