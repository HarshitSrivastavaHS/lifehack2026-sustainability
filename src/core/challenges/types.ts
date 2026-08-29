import type { ComponentType } from 'react';

export type ChallengeScope = 'individual' | 'floor' | 'residence' | 'university';
export type ChallengeState = 'scheduled' | 'active' | 'completed';

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
  version: number;
  supportedScopes: ChallengeScope[];
  validateConfig: (config: TConfig) => string[];
  normalizeSample: (input: unknown) => TSample;
  calculateProgress: (config: TConfig, samples: TSample[]) => TProgress;
  calculateImpact: (progress: TProgress) => { co2Kg: number; costSaved: number };
  StudentCard: ComponentType<ChallengeCardProps<TProgress>>;
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
