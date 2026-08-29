import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { ChartPoint } from '@/core/challenges/types';
import type { EnergyProgress } from '@/features/challenges/energy/module';
import { supabase } from '@/lib/supabase';

export type UserRole = 'student' | 'university_admin' | 'residence_admin' | 'reward_redeemer';
export type StudentTab = 'home' | 'challenges' | 'league' | 'impact' | 'wallet';
export type AdminTab = 'overview' | 'challenge' | 'rewards' | 'organizations';

export interface Habit {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
}

export interface ChallengeRecord {
  id: string;
  moduleKey: string;
  title: string;
  universityId: string;
  residenceId: string | null;
  subtitle: string;
  scope: string;
  status: string;
  startsAt: string;
  endsAt: string;
  rosterLocksAt: string;
  configuration: Record<string, unknown>;
  joined: boolean;
  day: number;
  totalDays: number;
}

export interface RewardItem {
  id: string;
  title: string;
  detail: string;
  value: string;
  weight: number;
  inventory: number;
  color: string;
}

export interface WalletItem extends RewardItem {
  issuanceId: string;
  challengeTitle: string;
  revealedAt: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
}

export interface LeagueRow {
  scopeId: string;
  label: string;
  score: number;
  participants: number;
  commitments: number;
}

interface Membership {
  universityId: string;
  universityName: string;
  residenceId: string;
  residenceName: string;
  floorId: string;
  floorName: string;
}

interface AppContextValue {
  ready: boolean;
  session: Session | null;
  role: UserRole | null;
  onboardingComplete: boolean;
  displayName: string;
  membership: Membership | null;
  studentTab: StudentTab;
  adminTab: AdminTab;
  habits: Habit[];
  preferences: Record<string, boolean>;
  challenges: ChallengeRecord[];
  activeChallenge: ChallengeRecord | null;
  progress: EnergyProgress;
  chartPoints: ChartPoint[];
  rewardItems: RewardItem[];
  wallet: WalletItem[];
  league: LeagueRow[];
  checkedToday: boolean;
  day: number;
  checkedDays: number[];
  targetPercent: number;
  rewardMode: 'fixed_all' | 'weighted_guaranteed';
  rewardIssued: boolean;
  rewardRevealed: boolean;
  impact: { co2Kg: number; costSaved: number };
  participation: { checked: number; total: number };
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  logout: () => Promise<void>;
  finishOnboarding: (floorId: string, code: string, habitKeys: string[]) => Promise<string | null>;
  setStudentTab: (tab: StudentTab) => void;
  setAdminTab: (tab: AdminTab) => void;
  setHabitEnabled: (key: string, enabled: boolean) => Promise<void>;
  joinChallenge: (id: string) => Promise<string | null>;
  checkIn: () => Promise<string | null>;
  revealReward: (issuanceId?: string) => Promise<string | null>;
  createRedemptionToken: (issuanceId: string) => Promise<string | null>;
  redeemToken: (token: string) => Promise<string | null>;
  refresh: () => Promise<void>;
}

const emptyProgress: EnergyProgress = {
  currentValue: 0, targetValue: 1, unit: 'kWh', progressRatio: 0, verified: false,
  updatedAt: new Date(0).toISOString(), displayMetrics: {}, savedKwh: 0, savedPercent: 0,
  expectedKwh: 0, actualKwh: 0,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [membership, setMembership] = useState<Membership | null>(null);
  const [studentTab, setStudentTab] = useState<StudentTab>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [progress, setProgress] = useState<EnergyProgress>(emptyProgress);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [wallet, setWallet] = useState<WalletItem[]>([]);
  const [league, setLeague] = useState<LeagueRow[]>([]);
  const [checkedToday, setCheckedToday] = useState(false);
  const [participation, setParticipation] = useState({ checked: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const clearData = useCallback(() => {
    setRole(null); setMembership(null); setOnboardingComplete(false); setChallenges([]);
    setProgress(emptyProgress); setChartPoints([]); setRewardItems([]); setWallet([]); setLeague([]);
    setPreferences({}); setDisplayName('');
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData.session;
    setSession(currentSession);
    if (!currentSession) { clearData(); setReady(true); return; }

    setError(null);
    const userId = currentSession.user.id;
    const [profileResult, orgResult, studentResult, modulesResult, preferenceResult, redeemerResult] = await Promise.all([
      supabase.from('profiles').select('display_name,onboarding_complete').eq('id', userId).maybeSingle(),
      supabase.from('organization_memberships').select('role,university_id,residence_id').eq('user_id', userId).limit(1).maybeSingle(),
      supabase.from('student_memberships').select('university_id,residence_id,floor_id, universities(name), residences(name), floors(name)').eq('user_id', userId).maybeSingle(),
      supabase.from('challenge_modules').select('key,label,description,icon,category,enabled').eq('enabled', true).order('label'),
      supabase.from('user_habit_preferences').select('module_key,enabled').eq('user_id', userId),
      supabase.from('reward_redeemer_scopes').select('university_id,residence_id').eq('user_id', userId).eq('active', true).limit(1).maybeSingle(),
    ]);

    if (profileResult.error) setError(profileResult.error.message);
    setDisplayName(profileResult.data?.display_name || currentSession.user.email?.split('@')[0] || 'Member');
    setOnboardingComplete(Boolean(profileResult.data?.onboarding_complete));

    const resolvedRole: UserRole = orgResult.data?.role ? orgResult.data.role as UserRole : redeemerResult.data ? 'reward_redeemer' : 'student';
    setRole(resolvedRole);
    if (resolvedRole !== 'student') setOnboardingComplete(true);

    const student = studentResult.data as any;
    const nextMembership = student ? {
      universityId: student.university_id, universityName: student.universities?.name ?? '',
      residenceId: student.residence_id, residenceName: student.residences?.name ?? '',
      floorId: student.floor_id, floorName: student.floors?.name ?? '',
    } : null;
    setMembership(nextMembership);

    const prefMap = Object.fromEntries((preferenceResult.data ?? []).map((item: any) => [item.module_key, item.enabled]));
    setPreferences(prefMap);
    setHabits((modulesResult.data ?? []).map((item: any) => ({
      key: item.key, label: item.label, description: item.description ?? '', icon: item.icon ?? '♣',
      category: item.category ?? 'consumption', enabled: Boolean(prefMap[item.key]),
    })));

    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges').select('id,university_id,residence_id,module_key,title,subtitle,scope,status,starts_at,ends_at,roster_locks_at,configuration')
      .in('status', resolvedRole === 'student' ? ['scheduled', 'active', 'completed'] : ['draft', 'scheduled', 'active', 'completed']).order('starts_at', { ascending: false });
    if (challengeError) setError(challengeError.message);

    const ids = (challengeData ?? []).map((item: any) => item.id);
    const { data: rosters } = ids.length
      ? await supabase.from('challenge_rosters').select('challenge_id').eq('user_id', userId).in('challenge_id', ids)
      : { data: [] as any[] };
    const joined = new Set((rosters ?? []).map((item: any) => item.challenge_id));
    const now = Date.now();
    const mapped = (challengeData ?? []).map((item: any) => {
      const starts = new Date(item.starts_at).getTime(); const ends = new Date(item.ends_at).getTime();
      const totalDays = Math.max(1, Math.ceil((ends - starts) / 86400000));
      return { id: item.id, universityId: item.university_id, residenceId: item.residence_id, moduleKey: item.module_key, title: item.title, subtitle: item.subtitle, scope: item.scope,
        status: item.status, startsAt: item.starts_at, endsAt: item.ends_at, rosterLocksAt: item.roster_locks_at,
        configuration: item.configuration ?? {}, joined: joined.has(item.id),
        day: Math.max(1, Math.min(totalDays, Math.floor((now - starts) / 86400000) + 1)), totalDays } as ChallengeRecord;
    });
    setChallenges(mapped);

    const active = resolvedRole === 'student' ? (mapped.find((item) => item.status === 'active' && item.joined) ?? mapped.find((item) => item.joined) ?? null) : (mapped.find((item) => item.status === 'active') ?? mapped[0] ?? null);
    const { data: allWallet } = await supabase.rpc('get_my_wallet');
    setWallet((allWallet ?? []).map((item: any) => ({ issuanceId: item.issuance_id, id: item.reward_item_id, title: item.title, detail: item.description, value: item.display_value, color: item.color, weight: 0, inventory: 0, challengeTitle: item.challenge_title, revealedAt: item.revealed_at, redeemedAt: item.redeemed_at, expiresAt: item.expires_at })));
    if (!active) { setProgress(emptyProgress); setChartPoints([]); setRewardItems([]); setLeague([]); setReady(true); return; }

    const snapshotScope = active.scope === 'university' ? 'university' : active.scope === 'floor' ? 'floor' : 'residence';
    const snapshotScopeId = snapshotScope === 'university' ? active.universityId : snapshotScope === 'floor' ? nextMembership?.floorId : active.residenceId;
    const [snapshotResult, metricsResult, campaignResult, commitmentResult, summaryResult, leagueResult, walletResult] = await Promise.all([
      supabase.from('progress_snapshots').select('*').eq('challenge_id', active.id).eq('scope_type', snapshotScope).eq('scope_id', snapshotScopeId).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('challenge_metric_points').select('metric_key,value,comparison_value,label,recorded_at').eq('challenge_id', active.id).eq('scope_type', snapshotScope).eq('scope_id', snapshotScopeId).eq('metric_key', 'actual_kwh').order('recorded_at'),
      supabase.from('reward_campaigns').select('id,reward_items(id,title,description,display_value,color,weight)').eq('challenge_id', active.id).maybeSingle(),
      supabase.from('daily_commitments').select('commitment_date').eq('challenge_id', active.id).eq('user_id', userId).eq('commitment_date', new Date().toISOString().slice(0, 10)).maybeSingle(),
      supabase.rpc('get_challenge_participation', { target_challenge: active.id }),
      supabase.rpc('get_challenge_league', { target_challenge: active.id }),
      supabase.rpc('get_my_wallet'),
    ]);

    const snap: any = snapshotResult.data; const metrics = snap?.display_metrics ?? {};
    const target = Number(snap?.target_value ?? 1); const current = Number(snap?.current_value ?? 0);
    setProgress({
      currentValue: current, targetValue: target, unit: snap?.unit ?? 'kWh',
      progressRatio: target ? Math.min(current / target, 1) : 0, verified: Boolean(snap?.verified),
      updatedAt: snap?.recorded_at ?? new Date(0).toISOString(), displayMetrics: metrics,
      savedKwh: Number(metrics.saved_kwh ?? current), savedPercent: Number(metrics.saved_percent ?? 0),
      expectedKwh: Number(metrics.expected_kwh ?? 0), actualKwh: Number(metrics.actual_kwh ?? 0),
    });
    setChartPoints((metricsResult.data ?? []).map((item: any) => ({ label: item.label, value: Number(item.value), comparison: item.comparison_value == null ? undefined : Number(item.comparison_value) })));
    const campaign: any = campaignResult.data;
    setRewardItems((campaign?.reward_items ?? []).map((item: any) => ({ id: item.id, title: item.title, detail: item.description, value: item.display_value, color: item.color, weight: item.weight, inventory: 0 })));
    setCheckedToday(Boolean(commitmentResult.data));
    const summary: any = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
    setParticipation({ checked: Number(summary?.checked_count ?? 0), total: Number(summary?.roster_count ?? 0) });
    setLeague((leagueResult.data ?? []).map((item: any) => ({ scopeId: item.scope_id, label: item.scope_label, score: Number(item.score), participants: item.participant_count, commitments: item.commitment_count })));
    setWallet((walletResult.data ?? []).map((item: any) => ({
      issuanceId: item.issuance_id, id: item.reward_item_id, title: item.title, detail: item.description,
      value: item.display_value, color: item.color, weight: 0, inventory: 0, challengeTitle: item.challenge_title,
      revealedAt: item.revealed_at, redeemedAt: item.redeemed_at, expiresAt: item.expires_at,
    })));
    setReady(true);
  }, [clearData]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    queueMicrotask(refresh);
    const { data } = client.auth.onAuthStateChange((_event, next) => { setSession(next); queueMicrotask(refresh); });
    const live = client.channel('common-grid-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progress_snapshots' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_issuances' }, () => void refresh())
      .subscribe();
    return () => { data.subscription.unsubscribe(); void client.removeChannel(live); };
  }, [refresh]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return 'Service is unavailable.';
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) return authError.message;
    await refresh(); return null;
  };
  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) return 'Service is unavailable.';
    const { error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
    return authError?.message ?? null;
  };
  const logout = async () => { await supabase?.auth.signOut(); setSession(null); clearData(); };
  const finishOnboarding = async (floorId: string, code: string, habitKeys: string[]) => {
    if (!supabase) return 'Service is unavailable.';
    const { error: joinError } = await supabase.rpc('redeem_join_code', { raw_code: code, target_floor: floorId });
    if (joinError) return joinError.message;
    const { error: preferenceError } = await supabase.rpc('set_my_habit_preferences', { module_keys: habitKeys });
    if (preferenceError) return preferenceError.message;
    await refresh(); return null;
  };
  const setHabitEnabled = async (key: string, enabled: boolean) => {
    if (!session || !supabase) return;
    await supabase.from('user_habit_preferences').upsert({ user_id: session.user.id, module_key: key, enabled, notifications_enabled: enabled });
    await refresh();
  };
  const joinChallenge = async (id: string) => {
    if (!supabase) return 'Service is unavailable.';
    const { error: joinError } = await supabase.rpc('join_challenge', { target_challenge: id });
    if (joinError) return joinError.message;
    await refresh(); return null;
  };
  const activeChallenge = useMemo(() => role === 'student' ? (challenges.find((item) => item.status === 'active' && item.joined) ?? challenges.find((item) => item.joined) ?? null) : (challenges.find((item) => item.status === 'active') ?? challenges[0] ?? null), [challenges, role]);
  const checkIn = async () => {
    if (!supabase || !session || !activeChallenge) return 'No active challenge.';
    const { error: checkError } = await supabase.from('daily_commitments').insert({ challenge_id: activeChallenge.id, user_id: session.user.id, commitment_date: new Date().toISOString().slice(0, 10) });
    if (checkError && checkError.code !== '23505') return checkError.message;
    await refresh(); return null;
  };
  const revealReward = async (issuanceId?: string) => {
    if (!supabase) return 'Service is unavailable.';
    const target = issuanceId ?? wallet.find((item) => !item.revealedAt)?.issuanceId;
    if (!target) return 'Reward is not available.';
    const { error: revealError } = await supabase.rpc('reveal_my_reward', { target_issuance: target });
    if (revealError) return revealError.message;
    await refresh(); return null;
  };
  const createRedemptionToken = async (issuanceId: string) => {
    if (!supabase) return null;
    const { data, error: tokenError } = await supabase.functions.invoke('reward-token', { body: { issuanceId } });
    if (tokenError) { setError(tokenError.message); return null; }
    return data.token as string;
  };
  const redeemToken = async (token: string) => {
    if (!supabase) return 'Service is unavailable.';
    const { data, error: redeemError } = await supabase.functions.invoke('redeem-reward', { body: { token } });
    if (redeemError) return redeemError.message;
    return data.message ?? null;
  };

  return <AppContext.Provider value={{
    ready, session, day: activeChallenge?.day ?? 1, checkedDays: checkedToday ? [activeChallenge?.day ?? 1] : [], targetPercent: Number(activeChallenge?.configuration.targetPercent ?? 12), rewardMode: 'weighted_guaranteed', rewardIssued: wallet.length > 0, rewardRevealed: wallet.some((item) => item.revealedAt), impact: { co2Kg: progress.savedKwh * 0.408, costSaved: progress.savedKwh * 0.3 }, role, onboardingComplete, displayName, membership, studentTab, adminTab, habits, preferences,
    challenges, activeChallenge, progress, chartPoints, rewardItems, wallet, league, checkedToday, participation, error,
    signIn, signUp, logout, finishOnboarding, setStudentTab, setAdminTab, setHabitEnabled, joinChallenge, checkIn,
    revealReward, createRedemptionToken, redeemToken, refresh,
  }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider.');
  return value;
}
