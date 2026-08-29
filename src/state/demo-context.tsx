import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import type { EnergySample, IdleAcConfig } from '@/features/challenges/energy/module';
import { energyModule } from '@/features/challenges/energy/module';

export type UserRole = 'student' | 'university_admin';
export type StudentTab = 'home' | 'challenges' | 'league' | 'impact' | 'wallet';
export type AdminTab = 'overview' | 'challenge' | 'rewards' | 'organizations';

export interface RewardItem {
  id: string;
  title: string;
  detail: string;
  value: string;
  weight: number;
  inventory: number;
  color: string;
}

const initialRewards: RewardItem[] = [
  { id: 'coffee', title: 'Campus coffee', detail: 'Any regular drink', value: '$5', weight: 55, inventory: 80, color: '#F7C85B' },
  { id: 'meal', title: 'Dining credit', detail: 'Valid at residence dining', value: '$10', weight: 30, inventory: 45, color: '#73E6AF' },
  { id: 'laundry', title: 'Laundry credit', detail: 'Two free wash cycles', value: '2×', weight: 15, inventory: 25, color: '#79C8F2' },
];

interface DemoContextValue {
  role: UserRole | null;
  onboardingComplete: boolean;
  studentTab: StudentTab;
  adminTab: AdminTab;
  day: number;
  checkedDays: number[];
  targetPercent: number;
  rewardMode: 'fixed_all' | 'weighted_guaranteed';
  rewardItems: RewardItem[];
  rewardIssued: boolean;
  rewardRevealed: boolean;
  progress: ReturnType<typeof energyModule.calculateProgress>;
  impact: ReturnType<typeof energyModule.calculateImpact>;
  login: (role: UserRole) => void;
  logout: () => void;
  finishOnboarding: () => void;
  setStudentTab: (tab: StudentTab) => void;
  setAdminTab: (tab: AdminTab) => void;
  checkIn: () => void;
  advanceDay: () => void;
  resetDemo: () => void;
  revealReward: () => void;
  setTargetPercent: (value: number) => void;
  setRewardMode: (mode: 'fixed_all' | 'weighted_guaranteed') => void;
  updateRewardWeight: (id: string, change: number) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function makeSamples(day: number): EnergySample[] {
  const dailyActual = [66, 65, 67, 66, 63, 61, 60];
  return Array.from({ length: 7 }, (_, index) => ({
    id: `day-${index + 1}`,
    expectedKwh: 80,
    actualKwh: index < day ? dailyActual[index] : 80,
    occupancyRatio: 0.12,
  }));
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [studentTab, setStudentTab] = useState<StudentTab>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [day, setDay] = useState(4);
  const [checkedDays, setCheckedDays] = useState<number[]>([1, 2, 3]);
  const [targetPercent, setTargetPercent] = useState(12);
  const [rewardMode, setRewardMode] = useState<'fixed_all' | 'weighted_guaranteed'>('weighted_guaranteed');
  const [rewardItems, setRewardItems] = useState(initialRewards);
  const [rewardRevealed, setRewardRevealed] = useState(false);

  const config: IdleAcConfig = { targetPercent, expectedKwh: 560, occupancyThreshold: 0.2 };
  const progress = useMemo(() => energyModule.calculateProgress(config, makeSamples(day)), [day, targetPercent]);
  const impact = useMemo(() => energyModule.calculateImpact(progress), [progress]);
  const rewardIssued = day >= 7 && progress.progressRatio >= 1;

  const resetDemo = () => {
    setDay(1);
    setCheckedDays([]);
    setRewardRevealed(false);
    setStudentTab('home');
  };

  return (
    <DemoContext.Provider
      value={{
        role,
        onboardingComplete,
        studentTab,
        adminTab,
        day,
        checkedDays,
        targetPercent,
        rewardMode,
        rewardItems,
        rewardIssued,
        rewardRevealed,
        progress,
        impact,
        login: (nextRole) => {
          setRole(nextRole);
          setOnboardingComplete(nextRole === 'university_admin');
        },
        logout: () => {
          setRole(null);
          setOnboardingComplete(false);
          setStudentTab('home');
          setAdminTab('overview');
        },
        finishOnboarding: () => setOnboardingComplete(true),
        setStudentTab,
        setAdminTab,
        checkIn: () => setCheckedDays((current) => current.includes(day) ? current : [...current, day]),
        advanceDay: () => {
          setDay((current) => Math.min(7, current + 1));
          setRewardRevealed(false);
        },
        resetDemo,
        revealReward: () => setRewardRevealed(true),
        setTargetPercent,
        setRewardMode,
        updateRewardWeight: (id, change) => setRewardItems((items) =>
          items.map((item) => item.id === id ? { ...item, weight: Math.max(0, item.weight + change) } : item)
        ),
      }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo must be used within DemoProvider.');
  return value;
}
