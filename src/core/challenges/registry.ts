import type { ChallengeModule, SharedProgress } from './types';
import { energyModule } from '@/features/challenges/energy/module';

const modules = [energyModule] as unknown as ChallengeModule<unknown, unknown, SharedProgress>[];
export const challengeRegistry = new Map(modules.map((module) => [module.key, module]));

export function getChallengeModule(key: string) {
  const module = challengeRegistry.get(key);
  if (!module) throw new Error(`Challenge module “${key}” is not installed.`);
  return module;
}
