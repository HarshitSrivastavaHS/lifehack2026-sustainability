import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type MvpRole = 'student' | 'admin';
export type RewardState = 'locked' | 'unlocked' | 'redeemed';
export type AdminSection = 'dashboard' | 'students' | 'electricity' | 'rewards';

export interface MvpProfile {
  id: string;
  name: string;
  email: string;
  role: MvpRole;
  active: boolean;
  universityName: string;
}

export interface MvpReward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  active: boolean;
  state: RewardState;
  unlockedAt: string | null;
  redeemedAt?: string | null;
  redemptionCount?: number;
}

export interface Redemption {
  id: string;
  rewardId: string;
  rewardName: string;
  redeemedAt: string;
  status: 'redeemed';
}

export interface SavingsHistoryPoint {
  createdAt: string;
  kwhSaved: number;
}

export interface StudentHomeData {
  personalKwh: number;
  personalPoints: number;
  universityName: string;
  universityKwh: number;
  universityPoints: number;
  nextReward: Pick<MvpReward, 'id' | 'name' | 'description' | 'pointsRequired'> | null;
  rewards: MvpReward[];
  redemptions: Redemption[];
  savingsHistory: SavingsHistoryPoint[];
}

export interface AdminSummary {
  students: number;
  totalKwh: number;
  totalPoints: number;
  rewardsUnlocked: number;
  rewardsRedeemed: number;
}

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  active: boolean;
  kwhSaved: number;
  points: number;
}

export interface SimulationResult {
  kwhAdded: number;
  pointsAwarded: number;
  studentKwh: number;
  studentPoints: number;
  universityKwh: number;
  universityPoints: number;
  newlyUnlocked: Pick<MvpReward, 'id' | 'name' | 'pointsRequired'>[];
  duplicate: boolean;
}

export interface StudentInput {
  name: string;
  email: string;
  password?: string;
}

export interface RewardInput {
  id?: string;
  name: string;
  description: string;
  pointsRequired: number;
  active: boolean;
}

interface ActionResult<T = undefined> {
  data?: T;
  error?: string;
}

interface AppContextValue {
  ready: boolean;
  loading: boolean;
  session: Session | null;
  profile: MvpProfile | null;
  role: MvpRole | null;
  studentHome: StudentHomeData | null;
  studentPointGain: number | null;
  adminSummary: AdminSummary | null;
  adminStudents: AdminStudent[];
  adminRewards: MvpReward[];
  adminSection: AdminSection;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: (silent?: boolean) => Promise<void>;
  setAdminSection: (section: AdminSection) => void;
  redeemReward: (rewardId: string) => Promise<ActionResult>;
  simulateElectricity: (studentId: string, kwh: number) => Promise<ActionResult<SimulationResult>>;
  createStudent: (input: Required<StudentInput>) => Promise<ActionResult>;
  updateStudent: (id: string, input: StudentInput) => Promise<ActionResult>;
  setStudentActive: (id: string, active: boolean) => Promise<ActionResult>;
  saveReward: (input: RewardInput) => Promise<ActionResult>;
}

const AppContext = createContext<AppContextValue | null>(null);

const emptySummary: AdminSummary = { students: 0, totalKwh: 0, totalPoints: 0, rewardsUnlocked: 0, rewardsRedeemed: 0 };

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapReward(value: Record<string, unknown>): MvpReward {
  return {
    id: String(value.id),
    name: String(value.name ?? ''),
    description: String(value.description ?? ''),
    pointsRequired: numberValue(value.pointsRequired),
    active: Boolean(value.active),
    state: (value.state as RewardState) ?? 'locked',
    unlockedAt: value.unlockedAt ? String(value.unlockedAt) : null,
    redeemedAt: value.redeemedAt ? String(value.redeemedAt) : null,
    redemptionCount: numberValue(value.redemptionCount),
  };
}

function randomUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return 'Something went wrong. Please try again.';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabase);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MvpProfile | null>(null);
  const [studentHome, setStudentHome] = useState<StudentHomeData | null>(null);
  const [studentPointGain, setStudentPointGain] = useState<number | null>(null);
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
  const [adminStudents, setAdminStudents] = useState<AdminStudent[]>([]);
  const [adminRewards, setAdminRewards] = useState<MvpReward[]>([]);
  const [adminSection, setAdminSection] = useState<AdminSection>('dashboard');
  const [error, setError] = useState<string | null>(null);
  const previousStudentPoints = useRef<number | null>(null);
  const pointGainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAppData = useCallback(() => {
    setProfile(null);
    setStudentHome(null);
    setStudentPointGain(null);
    previousStudentPoints.current = null;
    setAdminSummary(null);
    setAdminStudents([]);
    setAdminRewards([]);
    setAdminSection('dashboard');
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setReady(true);
      return;
    }
    if (!silent) setLoading(true);
    const { data: sessionResult } = await supabase.auth.getSession();
    const currentSession = sessionResult.session;
    setSession(currentSession);
    if (!currentSession) {
      clearAppData();
      setError(null);
      setLoading(false);
      setReady(true);
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.rpc('get_mvp_session');
    if (sessionError || !sessionData) {
      clearAppData();
      setError(sessionError?.message ?? 'This account is not set up for CommonGrid.');
      setLoading(false);
      setReady(true);
      return;
    }

    const nextProfile = sessionData as MvpProfile;
    setProfile(nextProfile);
    setError(null);
    if (!nextProfile.active) {
      setStudentHome(null);
      setAdminSummary(null);
      setAdminStudents([]);
      setAdminRewards([]);
      setLoading(false);
      setReady(true);
      return;
    }

    if (nextProfile.role === 'student') {
      const historyStart = new Date();
      historyStart.setDate(historyStart.getDate() - 14);
      const [homeResult, historyResult] = await Promise.all([
        supabase.rpc('get_mvp_student_home'),
        supabase.from('mvp_electricity_savings').select('kwh_saved,created_at').gte('created_at', historyStart.toISOString()).order('created_at'),
      ]);
      if (homeResult.error) setError(homeResult.error.message);
      if (historyResult.error) setError(historyResult.error.message);
      if (homeResult.data) {
        const value = homeResult.data as Record<string, unknown>;
        const next = value.nextReward as Record<string, unknown> | null;
        const nextStudentHome: StudentHomeData = {
          personalKwh: numberValue(value.personalKwh),
          personalPoints: numberValue(value.personalPoints),
          universityName: String(value.universityName ?? nextProfile.universityName),
          universityKwh: numberValue(value.universityKwh),
          universityPoints: numberValue(value.universityPoints),
          nextReward: next ? {
            id: String(next.id),
            name: String(next.name),
            description: String(next.description ?? ''),
            pointsRequired: numberValue(next.pointsRequired),
          } : null,
          rewards: ((value.rewards as Record<string, unknown>[]) ?? []).map(mapReward),
          redemptions: (value.redemptions as Redemption[]) ?? [],
          savingsHistory: (historyResult.data ?? []).map((item) => ({
            createdAt: item.created_at,
            kwhSaved: numberValue(item.kwh_saved),
          })),
        };
        const previousPoints = previousStudentPoints.current;
        previousStudentPoints.current = nextStudentHome.universityPoints;
        if (previousPoints !== null && nextStudentHome.universityPoints > previousPoints) {
          setStudentPointGain(nextStudentHome.universityPoints - previousPoints);
          if (pointGainTimer.current) clearTimeout(pointGainTimer.current);
          pointGainTimer.current = setTimeout(() => setStudentPointGain(null), 2600);
        }
        setStudentHome(nextStudentHome);
      }
      setAdminSummary(null);
      setAdminStudents([]);
      setAdminRewards([]);
    } else {
      const [summaryResult, studentsResult, rewardsResult] = await Promise.all([
        supabase.rpc('get_mvp_admin_dashboard'),
        supabase.rpc('get_mvp_admin_students', { search_text: '' }),
        supabase.rpc('get_mvp_admin_rewards'),
      ]);
      const firstError = summaryResult.error ?? studentsResult.error ?? rewardsResult.error;
      if (firstError) setError(firstError.message);
      const summary = (summaryResult.data ?? emptySummary) as Record<string, unknown>;
      setAdminSummary({
        students: numberValue(summary.students),
        totalKwh: numberValue(summary.totalKwh),
        totalPoints: numberValue(summary.totalPoints),
        rewardsUnlocked: numberValue(summary.rewardsUnlocked),
        rewardsRedeemed: numberValue(summary.rewardsRedeemed),
      });
      setAdminStudents(((studentsResult.data as Record<string, unknown>[]) ?? []).map((item) => ({
        id: String(item.id),
        name: String(item.name ?? ''),
        email: String(item.email ?? ''),
        active: Boolean(item.active),
        kwhSaved: numberValue(item.kwhSaved),
        points: numberValue(item.points),
      })));
      setAdminRewards(((rewardsResult.data as Record<string, unknown>[]) ?? []).map(mapReward));
      setStudentHome(null);
      setStudentPointGain(null);
      previousStudentPoints.current = null;
    }
    setLoading(false);
    setReady(true);
  }, [clearAppData]);

  useEffect(() => {
    if (!supabase) return;
    const initialRefresh = setTimeout(() => { void refresh(); }, 0);
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => {
      clearTimeout(initialRefresh);
      if (pointGainTimer.current) clearTimeout(pointGainTimer.current);
      listener.subscription.unsubscribe();
      appState.remove();
    };
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Supabase is not configured.';
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (signInError) return signInError.message;
    await refresh();
    return null;
  }, [refresh]);

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    clearAppData();
  }, [clearAppData]);

  const redeemReward = useCallback(async (rewardId: string): Promise<ActionResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const { error: actionError } = await supabase.rpc('redeem_mvp_reward', { target_reward: rewardId });
    if (actionError) return { error: actionError.message };
    await refresh();
    return {};
  }, [refresh]);

  const simulateElectricity = useCallback(async (studentId: string, kwh: number): Promise<ActionResult<SimulationResult>> => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const { data, error: actionError } = await supabase.rpc('simulate_mvp_electricity_saving', {
      target_student: studentId,
      kwh_amount: kwh,
      simulation_request: randomUuid(),
    });
    if (actionError) return { error: actionError.message };
    await refresh();
    return { data: data as SimulationResult };
  }, [refresh]);

  const createStudent = useCallback(async (input: Required<StudentInput>): Promise<ActionResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    try {
      const { data, error: actionError } = await supabase.functions.invoke('manage-student', { body: { action: 'create', ...input } });
      if (actionError) return { error: actionError.message };
      if (data?.error) return { error: String(data.error) };
      await refresh();
      return {};
    } catch (actionError) {
      return { error: messageFrom(actionError) };
    }
  }, [refresh]);

  const updateStudent = useCallback(async (id: string, input: StudentInput): Promise<ActionResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    try {
      const { data, error: actionError } = await supabase.functions.invoke('manage-student', {
        body: { action: 'update', id, name: input.name, email: input.email },
      });
      if (actionError) return { error: actionError.message };
      if (data?.error) return { error: String(data.error) };
      await refresh();
      return {};
    } catch (actionError) {
      return { error: messageFrom(actionError) };
    }
  }, [refresh]);

  const setStudentActive = useCallback(async (id: string, active: boolean): Promise<ActionResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const { error: actionError } = await supabase.rpc('set_mvp_student_active', { target_student: id, enabled: active });
    if (actionError) return { error: actionError.message };
    await refresh();
    return {};
  }, [refresh]);

  const saveReward = useCallback(async (input: RewardInput): Promise<ActionResult> => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const { error: actionError } = await supabase.rpc('save_mvp_reward', {
      target_reward: input.id ?? null,
      reward_name: input.name,
      reward_description: input.description,
      required_points: input.pointsRequired,
      reward_active: input.active,
    });
    if (actionError) return { error: actionError.message };
    await refresh();
    return {};
  }, [refresh]);

  const value = useMemo<AppContextValue>(() => ({
    ready, loading, session, profile, role: profile?.role ?? null, studentHome, studentPointGain, adminSummary, adminStudents,
    adminRewards, adminSection, error, signIn, logout, refresh, setAdminSection, redeemReward,
    simulateElectricity, createStudent, updateStudent, setStudentActive, saveReward,
  }), [ready, loading, session, profile, studentHome, studentPointGain, adminSummary, adminStudents, adminRewards, adminSection, error,
    signIn, logout, refresh, redeemReward, simulateElectricity, createStudent, updateStudent, setStudentActive, saveReward]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
