import { AdminApp } from '@/features/admin/admin-app';
import { AuthScreen } from '@/features/auth/auth-screen';
import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';
import { StudentApp } from '@/features/student/student-app';
import { useDemo } from '@/state/demo-context';

export default function HomeScreen() {
  const { role, onboardingComplete } = useDemo();
  if (!role) return <AuthScreen />;
  if (role === 'student' && !onboardingComplete) return <OnboardingScreen />;
  if (role === 'university_admin') return <AdminApp />;
  return <StudentApp />;
}
