import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import type { ChallengeCardProps, ChallengeModule } from '@/core/challenges/types';
import { calculateEnergyProgress, normalizeEnergySample, validateIdleAcConfig, type EnergyProgress, type EnergySample, type IdleAcConfig } from './processor';
export type { EnergyProgress, EnergySample, IdleAcConfig } from './processor';

function EnergyCard({ progress }: ChallengeCardProps<EnergyProgress>) {
  return (
    <View style={styles.card}>
      <View style={styles.metricRow}>
        <View>
          <Text style={styles.eyebrow}>VERIFIED BY BUILDING DATA</Text>
          <Text style={styles.hero}>{progress.savedKwh.toFixed(1)} kWh</Text>
          <Text style={styles.caption}>idle cooling avoided</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeValue}>{progress.savedPercent.toFixed(1)}%</Text>
          <Text style={styles.badgeLabel}>below baseline</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Palette.mintDark }]} />
          <Text style={styles.legendText}>Actual {progress.actualKwh.toFixed(1)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: Palette.line }]} />
          <Text style={styles.legendText}>Expected {progress.expectedKwh.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
}

export const energyModule: ChallengeModule<IdleAcConfig, EnergySample, EnergyProgress> = {
  key: 'idle-ac',
  label: 'Idle AC',
  icon: '❄',
  description: 'Reduce cooling when shared spaces are empty.',
  category: 'energy',
  version: 1,
  supportedScopes: ['residence', 'university'],
  metrics: [
    { key: 'saved_kwh', label: 'Idle cooling avoided', unit: 'kWh', color: Palette.mintDark, precision: 1 },
    { key: 'saved_percent', label: 'Below baseline', unit: '%', color: Palette.lime, precision: 1 },
  ],
  validateConfig: validateIdleAcConfig,
  normalizeSample: normalizeEnergySample,
  calculateProgress: calculateEnergyProgress,
  calculateImpact: (progress) => ({
    co2Kg: progress.savedKwh * 0.408,
    costSaved: progress.savedKwh * 0.3,
  }),
  buildCharts: (progress, history) => [{ key: 'energy-use', title: 'Actual against expected use', kind: 'grouped-bar', unit: 'kWh', points: history, primaryLabel: 'Actual', comparisonLabel: 'Expected', accessibilitySummary: progress.savedKwh.toFixed(1) + ' kWh of idle cooling avoided.' }],
  StudentCard: EnergyCard,
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F3FBF7',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#D8EFE2',
  },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '800', color: Palette.mintDark, letterSpacing: 1 },
  hero: { fontSize: 30, fontWeight: '900', color: Palette.ink, marginTop: 6 },
  caption: { fontSize: 13, color: Palette.inkSoft },
  badge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeValue: { fontSize: 21, fontWeight: '900', color: Palette.ink },
  badgeLabel: { fontSize: 10, color: Palette.inkSoft, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 18, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Palette.inkSoft },
});
