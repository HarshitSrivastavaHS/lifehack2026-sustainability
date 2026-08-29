export type ShowcaseTab = 'home' | 'halls' | 'journey';
export type HallTier = 'Gold' | 'Silver' | 'Bronze' | 'Starter';
export type HallTrend = 'up' | 'down' | 'steady';

export interface HallStanding {
  rank: number;
  name: string;
  shortName: string;
  kwhSaved: number;
  points: number;
  trend: HallTrend;
}

export interface AchievementFixture {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  progress: number;
  progressLabel: string;
  unlockedAt?: string;
}

export interface CalendarDayFixture {
  day: number | null;
  kwh: number;
  today?: boolean;
}

export const showcaseStudent = {
  hall: 'Kent Ridge Hall',
  hallShort: 'KR',
  currentStreak: 11,
  longestStreak: 18,
  totalKwh: 124,
  totalPoints: 1240,
  contributorRank: 12,
  contributorCount: 80,
  hallTargetPoints: 15000,
  hallPoints: 11960,
};

export const weeklyHallStandings: HallStanding[] = [
  { rank: 1, name: 'Sheares Hall', shortName: 'SH', kwhSaved: 1284, points: 12840, trend: 'up' },
  { rank: 2, name: 'Kent Ridge Hall', shortName: 'KR', kwhSaved: 1196, points: 11960, trend: 'up' },
  { rank: 3, name: 'Eusoff Hall', shortName: 'EH', kwhSaved: 1154, points: 11540, trend: 'steady' },
  { rank: 4, name: 'Temasek Hall', shortName: 'TH', kwhSaved: 1087, points: 10870, trend: 'down' },
  { rank: 5, name: 'King Edward VII Hall', shortName: 'KE', kwhSaved: 992, points: 9920, trend: 'up' },
  { rank: 6, name: 'Raffles Hall', shortName: 'RH', kwhSaved: 941, points: 9410, trend: 'down' },
  { rank: 7, name: 'PGP House', shortName: 'PGP', kwhSaved: 876, points: 8760, trend: 'steady' },
];

export const monthlyHallStandings: HallStanding[] = [
  { rank: 1, name: 'Kent Ridge Hall', shortName: 'KR', kwhSaved: 4682, points: 46820, trend: 'up' },
  { rank: 2, name: 'Eusoff Hall', shortName: 'EH', kwhSaved: 4516, points: 45160, trend: 'up' },
  { rank: 3, name: 'Sheares Hall', shortName: 'SH', kwhSaved: 4394, points: 43940, trend: 'down' },
  { rank: 4, name: 'Temasek Hall', shortName: 'TH', kwhSaved: 4108, points: 41080, trend: 'steady' },
  { rank: 5, name: 'Raffles Hall', shortName: 'RH', kwhSaved: 3922, points: 39220, trend: 'up' },
  { rank: 6, name: 'King Edward VII Hall', shortName: 'KE', kwhSaved: 3746, points: 37460, trend: 'down' },
  { rank: 7, name: 'PGP House', shortName: 'PGP', kwhSaved: 3498, points: 34980, trend: 'steady' },
];

export const prizeTiers = [
  { rank: '1st', tier: 'Gold' as const, reward: '5 laundry cycles', eligiblePercent: 40, color: '#FFC857' },
  { rank: '2nd', tier: 'Silver' as const, reward: '3 laundry cycles', eligiblePercent: 30, color: '#A8BBC4' },
  { rank: '3rd', tier: 'Bronze' as const, reward: '2 laundry cycles', eligiblePercent: 20, color: '#D9955B' },
  { rank: '4th–7th', tier: 'Starter' as const, reward: '1 laundry cycle', eligiblePercent: 10, color: '#56E0B1' },
];

export const achievements: AchievementFixture[] = [
  { id: 'first-spark', name: 'First Spark', icon: '↯', description: 'Record your first electricity saving.', unlocked: true, progress: 1, progressLabel: 'Complete', unlockedAt: '3 Aug' },
  { id: 'seven-day', name: '7-Day Streak', icon: '◉', description: 'Save electricity for seven days running.', unlocked: true, progress: 1, progressLabel: 'Complete', unlockedAt: '18 Aug' },
  { id: 'hundred-kwh', name: '100 kWh Club', icon: '100', description: 'Pass 100 kWh in total savings.', unlocked: true, progress: 1, progressLabel: '124 / 100 kWh', unlockedAt: '25 Aug' },
  { id: 'hall-hero', name: 'Hall Hero', icon: '★', description: 'Reach your hall’s top 20 contributors.', unlocked: true, progress: 1, progressLabel: '#12 in hall', unlockedAt: '28 Aug' },
  { id: 'weekend', name: 'Weekend Saver', icon: '☀', description: 'Save on four consecutive weekends.', unlocked: false, progress: 0.75, progressLabel: '3 / 4 weekends' },
  { id: 'top-contributor', name: 'Top Contributor', icon: '◆', description: 'Finish an Energy Sprint in the top 10.', unlocked: false, progress: 0.83, progressLabel: '#12 · 2 places away' },
];

const augustSavings = [
  0, 1.2, 0.8, 0, 1.7, 1.1, 0, 2.1, 1.4, 0.7,
  0, 1.9, 1.2, 1.5, 0, 2.3, 1.8, 0, 1.1, 1.6,
  2.2, 1.4, 2.6, 1.3, 1.9, 2.4, 1.7, 2.1, 2.6,
];

export const calendarDays: CalendarDayFixture[] = [
  ...Array.from({ length: 6 }, () => ({ day: null, kwh: 0 })),
  ...augustSavings.map((kwh, index) => ({ day: index + 1, kwh, today: index === augustSavings.length - 1 })),
];

export const recentWeekSavings = [1.4, 2.6, 1.3, 1.9, 2.4, 1.7, 2.6];

export function hallTierForRank(rank: number) {
  if (rank === 1) return prizeTiers[0];
  if (rank === 2) return prizeTiers[1];
  if (rank === 3) return prizeTiers[2];
  return prizeTiers[3];
}

export function eligibilityCutoff(totalContributors: number, eligiblePercent: number) {
  if (totalContributors <= 0) return 0;
  return Math.max(1, Math.ceil(totalContributors * eligiblePercent / 100));
}

const contributorRanks: Record<string, number> = {
  'alice.morgan@commongrid.demo': 12,
  'aarav.patel@commongrid.demo': 7,
  'hana.kim@commongrid.demo': 18,
  'maya.chen@commongrid.demo': 29,
  'sofia.martinez@commongrid.demo': 38,
};

export function showcaseRankForEmail(email?: string) {
  return contributorRanks[email?.toLowerCase() ?? ''] ?? 37;
}

export function isShowcaseEligible(rank: number, totalContributors: number, eligiblePercent: number) {
  return rank > 0 && rank <= eligibilityCutoff(totalContributors, eligiblePercent);
}
