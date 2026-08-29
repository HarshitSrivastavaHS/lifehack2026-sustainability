import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Button } from '@/components/ui/app-ui';
import { AdminApp } from '@/features/admin/admin-app';
import { AuthScreen } from '@/features/auth/auth-screen';
import { StudentApp } from '@/features/student/student-app';
import { Palette } from '@/constants/theme';
import { useApp } from '@/state/app-context';

export default function HomeScreen() {
  const { ready, session, role, profile, error, logout } = useApp();
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={Palette.mintDark} /></View>;
  if (!session) return <AuthScreen />;
  if (!profile || !profile.active) return <SafeAreaView style={styles.disabled}><Brand /><View style={styles.disabledCard}><Text style={styles.disabledIcon}>◇</Text><Text style={styles.disabledTitle}>Account inactive</Text><Text style={styles.disabledBody}>{error ?? 'Contact the university administrator to restore access.'}</Text><Button onPress={logout} variant="secondary">Sign out</Button></View></SafeAreaView>;
  if (role === 'admin') return <AdminApp />;
  if (role === 'student') return <StudentApp />;
  return <View style={styles.loading}><ActivityIndicator color={Palette.mintDark} /></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.cream },
  disabled: { flex: 1, backgroundColor: Palette.cream, padding: 26 },
  disabledCard: { flex: 1, maxWidth: 420, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: 13, padding: 28 },
  disabledIcon: { color: Palette.inkMuted, fontSize: 45, fontWeight: '900' },
  disabledTitle: { color: Palette.ink, fontSize: 25, fontWeight: '900' },
  disabledBody: { color: Palette.inkSoft, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 8 },
});
