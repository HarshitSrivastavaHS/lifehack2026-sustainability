export const POINTS_PER_KWH = 10;
export const MAX_KWH_PER_ENTRY = 100;

export function pointsForKwh(kwh: number) {
  return Math.round(kwh * POINTS_PER_KWH);
}

export function validateKwhInput(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return 'Enter a valid kWh amount with up to two decimal places.';
  const kwh = Number(trimmed);
  if (kwh <= 0) return 'Electricity saved must be greater than zero.';
  if (kwh > MAX_KWH_PER_ENTRY) return `Electricity saved cannot exceed ${MAX_KWH_PER_ENTRY} kWh per entry.`;
  return null;
}

export function rewardProgress(totalPoints: number, requiredPoints: number | null) {
  if (!requiredPoints || requiredPoints <= 0) return { ratio: 1, percentage: 100, remaining: 0 };
  const ratio = Math.max(0, Math.min(totalPoints / requiredPoints, 1));
  return {
    ratio,
    percentage: Math.round(ratio * 100),
    remaining: Math.max(requiredPoints - totalPoints, 0),
  };
}
