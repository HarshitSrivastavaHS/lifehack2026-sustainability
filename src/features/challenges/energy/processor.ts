import type { HabitProcessor, SharedProgress } from '@/core/challenges/types';

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

export function validateIdleAcConfig(config: IdleAcConfig) {
  const errors: string[] = [];
  if (config.targetPercent < 1 || config.targetPercent > 30) errors.push('Target must be between 1% and 30%.');
  if (config.expectedKwh <= 0) errors.push('Expected energy must be positive.');
  if (config.occupancyThreshold <= 0 || config.occupancyThreshold > 1) errors.push('Occupancy threshold must be between 0 and 1.');
  return errors;
}

export function normalizeEnergySample(input: unknown): EnergySample {
  if (!input || typeof input !== 'object') throw new Error('Energy sample must be an object.');
  const value = input as Record<string, unknown>;
  const sample = { id: String(value.id ?? ''), actualKwh: Number(value.actualKwh), expectedKwh: Number(value.expectedKwh), occupancyRatio: Number(value.occupancyRatio) };
  if (!sample.id || !Number.isFinite(sample.actualKwh) || sample.actualKwh < 0 || !Number.isFinite(sample.expectedKwh) || sample.expectedKwh < 0 || !Number.isFinite(sample.occupancyRatio) || sample.occupancyRatio < 0 || sample.occupancyRatio > 1) throw new Error('Energy sample is invalid.');
  return sample;
}

export function calculateEnergyProgress(config: IdleAcConfig, samples: EnergySample[]): EnergyProgress {
  const eligible = samples.filter((sample) => sample.occupancyRatio < config.occupancyThreshold);
  const expectedKwh = eligible.reduce((sum, sample) => sum + sample.expectedKwh, 0);
  const actualKwh = eligible.reduce((sum, sample) => sum + sample.actualKwh, 0);
  const savedKwh = Math.max(0, expectedKwh - actualKwh);
  const targetValue = expectedKwh * (config.targetPercent / 100);
  return {
    currentValue: savedKwh, targetValue, unit: 'kWh', progressRatio: targetValue ? Math.min(savedKwh / targetValue, 1) : 0,
    verified: true, updatedAt: new Date().toISOString(), displayMetrics: { expectedKwh, actualKwh },
    savedKwh, savedPercent: expectedKwh ? (savedKwh / expectedKwh) * 100 : 0, expectedKwh, actualKwh,
  };
}

export const energyProcessor: HabitProcessor<IdleAcConfig, EnergySample> = {
  moduleKey: 'idle-ac',
  validateInput: normalizeEnergySample,
  buildBaseline: (_config, history) => {
    const sorted = history.map((sample) => sample.actualKwh).sort((a, b) => a - b);
    if (!sorted.length) throw new Error('Baseline history is empty.');
    const middle = Math.floor(sorted.length / 2);
    return { expectedKwh: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2, method: 'median' };
  },
  calculateVerifiedSnapshot: calculateEnergyProgress,
};

