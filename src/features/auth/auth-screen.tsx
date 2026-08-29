import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { Brand, Button, Eyebrow, type } from '@/components/ui/app-ui';
import { useDemo, type UserRole } from '@/state/demo-context';

export function AuthScreen() {
  const { login } = useDemo();
  const [email, setEmail] = useState('student@lifehack.demo');
  const [password, setPassword] = useState('common-grid');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.art}>
            <Brand />
            <View style={styles.artCopy}>
              <Eyebrow>SMALL HABITS. REAL IMPACT.</Eyebrow>
              <Text style={styles.hero}>Make your building a team sport.</Text>
              <Text style={styles.heroBody}>Seven days. One habit. A reward everyone can help unlock.</Text>
            </View>
            <View style={styles.orbit}>
              <View style={[styles.bubble, styles.bubbleOne]}><Text style={styles.bubbleIcon}>❄</Text></View>
              <View style={[styles.bubble, styles.bubbleTwo]}><Text style={styles.bubbleIcon}>↯</Text></View>
              <View style={[styles.bubble, styles.bubbleThree]}><Text style={styles.bubbleIcon}>♣</Text></View>
              <View style={styles.orbitCenter}><Text style={styles.orbitNumber}>12%</Text><Text style={styles.orbitLabel}>less idle AC</Text></View>
            </View>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={type.title}>Welcome in</Text>
              <Text style={[type.body, styles.formIntro]}>Use a demo account—no verification email required.</Text>
            </View>
            <View style={styles.rolePicker}>
              {(['student', 'university_admin'] as UserRole[]).map((item) => (
                <Pressable key={item} onPress={() => {
                  setRole(item);
                  setEmail(item === 'student' ? 'student@lifehack.demo' : 'admin@lifehack.demo');
                }} style={[styles.roleOption, role === item && styles.roleSelected]}>
                  <Text style={[styles.roleText, role === item && styles.roleTextSelected]}>{item === 'student' ? 'Student demo' : 'University admin'}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#829392" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordRow}>
                <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput]} placeholderTextColor="#829392" />
                <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showButton}><Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text></Pressable>
              </View>
            </View>
            <Button onPress={() => login(role)} disabled={!email || !password}>Continue</Button>
            <Text style={styles.note}>Demo authentication mirrors the Supabase password flow. University membership is verified separately with a residence join code.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream }, flex: { flex: 1 },
  page: { flexGrow: 1, flexDirection: Platform.OS === 'web' ? 'row' : 'column', minHeight: Platform.OS === 'web' ? 700 : undefined },
  art: { flex: 1.05, minHeight: 380, backgroundColor: Palette.ink, padding: 36, overflow: 'hidden' },
  artCopy: { maxWidth: 500, marginTop: 70, zIndex: 2 },
  hero: { color: Palette.paper, fontSize: 47, lineHeight: 49, fontWeight: '900', letterSpacing: -2, marginTop: 12 },
  heroBody: { color: '#BFD0CC', fontSize: 17, lineHeight: 25, marginTop: 18, maxWidth: 390 },
  orbit: { width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: '#42605D', alignSelf: 'center', marginTop: 55, alignItems: 'center', justifyContent: 'center' },
  orbitCenter: { width: 170, height: 170, borderRadius: 85, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' },
  orbitNumber: { color: Palette.ink, fontSize: 44, fontWeight: '900' }, orbitLabel: { color: Palette.inkSoft, fontSize: 13, fontWeight: '700' },
  bubble: { position: 'absolute', width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bubbleOne: { backgroundColor: Palette.blue, left: -18, top: 105 }, bubbleTwo: { backgroundColor: Palette.coral, right: 4, top: 4 }, bubbleThree: { backgroundColor: Palette.mint, right: -12, bottom: 35 }, bubbleIcon: { fontSize: 24, fontWeight: '900' },
  form: { flex: 0.95, alignSelf: 'center', width: '100%', maxWidth: 520, padding: 38, gap: 22 },
  formIntro: { marginTop: 8 }, rolePicker: { flexDirection: 'row', padding: 4, backgroundColor: '#E8ECE5', borderRadius: 14 },
  roleOption: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 11, alignItems: 'center' }, roleSelected: { backgroundColor: Palette.paper },
  roleText: { color: Palette.inkSoft, fontSize: 12, fontWeight: '700' }, roleTextSelected: { color: Palette.ink, fontWeight: '900' },
  fieldGroup: { gap: 7 }, label: { color: Palette.inkSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  input: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, paddingHorizontal: 16, color: Palette.ink, fontSize: 15 },
  passwordRow: { position: 'relative' }, passwordInput: { paddingRight: 70 }, showButton: { position: 'absolute', right: 8, top: 8, padding: 10 }, showText: { color: Palette.mintDark, fontSize: 12, fontWeight: '900' },
  note: { color: Palette.inkSoft, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
