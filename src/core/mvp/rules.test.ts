import { describe, expect, it } from 'vitest';

import { pointsForKwh, rewardProgress, validateKwhInput } from './rules';

describe('MVP electricity rules', () => {
  it('awards ten points per kWh', () => {
    expect(pointsForKwh(8)).toBe(80);
    expect(pointsForKwh(1.25)).toBe(13);
  });

  it('validates simulation amounts', () => {
    expect(validateKwhInput('8')).toBeNull();
    expect(validateKwhInput('8.25')).toBeNull();
    expect(validateKwhInput('0')).toContain('greater than zero');
    expect(validateKwhInput('100.01')).toContain('cannot exceed');
    expect(validateKwhInput('2.345')).toContain('valid kWh');
  });

  it('calculates the shared milestone progress', () => {
    expect(rewardProgress(920, 1000)).toEqual({ ratio: 0.92, percentage: 92, remaining: 80 });
    expect(rewardProgress(1200, 1000)).toEqual({ ratio: 1, percentage: 100, remaining: 0 });
  });
});
