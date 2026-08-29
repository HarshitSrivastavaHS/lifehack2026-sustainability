import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdminApp } from '@/features/admin/admin-app';
import { AuthScreen } from '@/features/auth/auth-screen';
import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';
import { StudentApp } from '@/features/student/student-app';
import { Palette } from '@/constants/theme';
import { useApp } from '@/state/app-context';

export default function HomeScreen() {
  const { ready, session, role, onboardingComplete } = useApp();
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={Palette.mintDark} /></View>;
  if (!session) return <AuthScreen />;
  if (role === 'student' && !onboardingComplete) return <OnboardingScreen />;
  if (role === 'university_admin' || role === 'residence_admin' || role === 'reward_redeemer') return <AdminApp />;
  return <StudentApp />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.cream } });
