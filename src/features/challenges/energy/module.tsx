import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import type { ChallengeCardProps, ChallengeModule, SharedProgress } from '@/core/challenges/types';

export interface IdleAcConfig {
  targetPercent: number;
  expectedKwh: number;
  occupancyThreshold: number;
}

export interface EnergySample {
  id: string;
  actualKwh: number;
  expectedKwh: number;
  occupancyRatio: number;
}

export interface EnergyProgress extends SharedProgress {
  savedKwh: number;
  savedPercent: number;
  expectedKwh: number;
  actualKwh: number;
}

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
  version: 1,
  supportedScopes: ['floor', 'residence', 'university'],
  validateConfig: (config) => {
    const errors: string[] = [];
    if (config.targetPercent < 1 || config.targetPercent > 30) {
      errors.push('Target must be between 1% and 30%.');
    }
    if (config.expectedKwh <= 0) errors.push('Expected energy must be positive.');
    return errors;
  },
  normalizeSample: (input) => input as EnergySample,
  calculateProgress: (config, samples) => {
    const eligible = samples.filter((sample) => sample.occupancyRatio < config.occupancyThreshold);
    const expectedKwh = eligible.reduce((sum, sample) => sum + sample.expectedKwh, 0);
    const actualKwh = eligible.reduce((sum, sample) => sum + sample.actualKwh, 0);
    const savedKwh = Math.max(0, expectedKwh - actualKwh);
    const targetValue = expectedKwh * (config.targetPercent / 100);
    return {
      currentValue: savedKwh,
      targetValue,
      unit: 'kWh',
      progressRatio: targetValue ? Math.min(savedKwh / targetValue, 1) : 0,
      verified: true,
      updatedAt: new Date().toISOString(),
      displayMetrics: { expectedKwh, actualKwh },
      savedKwh,
      savedPercent: expectedKwh ? (savedKwh / expectedKwh) * 100 : 0,
      expectedKwh,
      actualKwh,
    };
  },
  calculateImpact: (progress) => ({
    co2Kg: progress.savedKwh * 0.408,
    costSaved: progress.savedKwh * 0.3,
  }),
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
