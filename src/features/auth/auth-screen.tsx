import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Button, Eyebrow, type } from '@/components/ui/app-ui';
import { Palette } from '@/constants/theme';
import { useApp } from '@/state/app-context';

export function AuthScreen() {
  const { signIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (result) setMessage(result);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.story}>
            <Brand />
            <View style={styles.storyCopy}>
              <Eyebrow style={styles.lightEyebrow}>POWER DOWN. MOVE FORWARD.</Eyebrow>
              <Text style={styles.hero}>Small savings.{`\n`}Shared rewards.</Text>
              <Text style={styles.heroBody}>Save electricity and help Northbridge University unlock rewards for everyone.</Text>
            </View>
            <View style={styles.progressCard}>
              <View style={styles.bolt}><Text style={styles.boltText}>↯</Text></View>
              <View style={styles.progressCopy}>
                <Text style={styles.progressLabel}>UNIVERSITY PROGRESS</Text>
                <Text style={styles.progressValue}>920 / 1,000 points</Text>
                <View style={styles.track}><View style={styles.fill} /></View>
              </View>
              <Text style={styles.progressPercent}>92%</Text>
            </View>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={type.title}>Welcome back</Text>
              <Text style={[type.body, styles.intro]}>Sign in with your CommonGrid account.</Text>
            </View>
            <Field label="EMAIL">
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} />
            </Field>
            <Field label="PASSWORD">
              <TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" style={styles.input} onSubmitEditing={submit} />
            </Field>
            {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
            <Button onPress={submit} disabled={busy || !email.trim() || password.length < 8}>{busy ? 'Signing in…' : 'Sign in'}</Button>
            <Text style={styles.accessNote}>Student accounts are provided by the university administrator.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream },
  flex: { flex: 1 },
  page: { flexGrow: 1, flexDirection: Platform.OS === 'web' ? 'row' : 'column', minHeight: Platform.OS === 'web' ? 700 : undefined },
  story: { flex: 1.05, minHeight: 390, backgroundColor: Palette.ink, padding: 36, overflow: 'hidden' },
  storyCopy: { marginTop: 72, maxWidth: 520 },
  lightEyebrow: { color: Palette.mint },
  hero: { color: Palette.paper, fontSize: 48, lineHeight: 50, fontWeight: '900', letterSpacing: -2, marginTop: 12 },
  heroBody: { color: '#BCD0CB', fontSize: 17, lineHeight: 25, marginTop: 18, maxWidth: 420 },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Palette.navyLight, borderRadius: 22, padding: 18, marginTop: 54, maxWidth: 500 },
  bolt: { width: 48, height: 48, borderRadius: 16, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' },
  boltText: { color: Palette.ink, fontSize: 27, fontWeight: '900' },
  progressCopy: { flex: 1, gap: 6 },
  progressLabel: { color: Palette.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  progressValue: { color: Palette.paper, fontSize: 15, fontWeight: '800' },
  track: { height: 7, borderRadius: 20, backgroundColor: '#315064', overflow: 'hidden' },
  fill: { width: '92%', height: 7, backgroundColor: Palette.lime, borderRadius: 20 },
  progressPercent: { color: Palette.paper, fontSize: 18, fontWeight: '900' },
  form: { flex: .95, alignSelf: 'center', width: '100%', maxWidth: 520, padding: 38, gap: 22 },
  intro: { marginTop: 8 },
  field: { gap: 7 },
  label: { color: Palette.inkSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  input: { height: 54, borderRadius: 15, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, paddingHorizontal: 16, color: Palette.ink, fontSize: 15 },
  message: { color: Palette.danger, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  accessNote: { color: Palette.inkMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
