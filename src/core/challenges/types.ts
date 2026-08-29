import type { ComponentType } from 'react';

export type ChallengeScope = 'individual' | 'floor' | 'residence' | 'university';
export type ChallengeState = 'scheduled' | 'active' | 'completed';
export type ChartKind = 'line' | 'bar' | 'grouped-bar' | 'sparkline' | 'progress-ring';

export interface MetricDefinition { key: string; label: string; unit: string; color: string; precision?: number; }
export interface ChartPoint { label: string; value: number; comparison?: number; }
export interface ChartSpec { key: string; title: string; kind: ChartKind; unit: string; points: ChartPoint[]; primaryLabel: string; comparisonLabel?: string; accessibilitySummary: string; }

export interface SharedProgress {
  currentValue: number;
  targetValue: number;
  unit: string;
  progressRatio: number;
  verified: boolean;
  updatedAt: string;
  displayMetrics: Record<string, string | number>;
}

export interface ChallengeCardProps<TProgress extends SharedProgress> {
  progress: TProgress;
  compact?: boolean;
}

export interface ChallengeModule<TConfig, TSample, TProgress extends SharedProgress> {
  key: string;
  label: string;
  icon: string;
  description: string;
  category: 'energy' | 'water' | 'waste' | 'food' | 'transport' | 'consumption';
  version: number;
  supportedScopes: ChallengeScope[];
  metrics: MetricDefinition[];
  validateConfig: (config: TConfig) => string[];
  normalizeSample: (input: unknown) => TSample;
  calculateProgress: (config: TConfig, samples: TSample[]) => TProgress;
  calculateImpact: (progress: TProgress) => { co2Kg: number; costSaved: number };
  buildCharts: (progress: TProgress, history: ChartPoint[]) => ChartSpec[];
  StudentCard: ComponentType<ChallengeCardProps<TProgress>>;
}

export interface HabitProcessor<TConfig, TInput> {
  moduleKey: string;
  validateInput: (input: unknown) => TInput;
  buildBaseline: (config: TConfig, history: TInput[]) => unknown;
  calculateVerifiedSnapshot: (config: TConfig, input: TInput[]) => SharedProgress;
}

export interface Challenge<TConfig = unknown> {
  id: string;
  moduleKey: string;
  title: string;
  subtitle: string;
  scope: ChallengeScope;
  state: ChallengeState;
  day: number;
  totalDays: number;
  config: TConfig;
}
