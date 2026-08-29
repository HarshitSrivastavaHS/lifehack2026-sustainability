import { describe, expect, it } from 'vitest';

import { calculateEnergyProgress, energyProcessor, normalizeEnergySample, validateIdleAcConfig } from './processor';

describe('idle AC processor', () => {
  it('counts only low-occupancy readings and caps progress', () => {
    const result = calculateEnergyProgress({ targetPercent: 10, expectedKwh: 200, occupancyThreshold: 0.2 }, [
      { id: 'quiet', expectedKwh: 100, actualKwh: 80, occupancyRatio: 0.1 },
      { id: 'busy', expectedKwh: 100, actualKwh: 20, occupancyRatio: 0.8 },
    ]);
    expect(result.savedKwh).toBe(20);
    expect(result.savedPercent).toBe(20);
    expect(result.progressRatio).toBe(1);
  });

  it('never rewards consumption above baseline', () => {
    const result = calculateEnergyProgress({ targetPercent: 10, expectedKwh: 100, occupancyThreshold: 0.2 }, [
      { id: 'one', expectedKwh: 100, actualKwh: 120, occupancyRatio: 0.1 },
    ]);
    expect(result.savedKwh).toBe(0);
    expect(result.progressRatio).toBe(0);
  });

  it('validates configuration and incoming samples', () => {
    expect(validateIdleAcConfig({ targetPercent: 0, expectedKwh: 0, occupancyThreshold: 2 })).toHaveLength(3);
    expect(() => normalizeEnergySample({ id: 'bad', actualKwh: -1, expectedKwh: 1, occupancyRatio: 0 })).toThrow();
  });

  it('builds a median baseline', () => {
    const baseline = energyProcessor.buildBaseline({ targetPercent: 10, expectedKwh: 1, occupancyThreshold: 0.2 }, [
      { id: 'a', actualKwh: 10, expectedKwh: 0, occupancyRatio: 0 },
      { id: 'b', actualKwh: 14, expectedKwh: 0, occupancyRatio: 0 },
    ]) as { expectedKwh: number };
    expect(baseline.expectedKwh).toBe(12);
  });
});

