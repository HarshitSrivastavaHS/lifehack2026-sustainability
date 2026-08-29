import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Button, Card, Eyebrow, ProgressBar, type } from '@/components/ui/app-ui';
import { Palette } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/state/app-context';

interface Option { id: string; name: string; parentId?: string; }

export function OnboardingScreen() {
  const { finishOnboarding, logout, habits } = useApp();
  const [step, setStep] = useState(1);
  const [universities, setUniversities] = useState<Option[]>([]);
  const [residences, setResidences] = useState<Option[]>([]);
  const [floors, setFloors] = useState<Option[]>([]);
  const [universityId, setUniversityId] = useState('');
  const [residenceId, setResidenceId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase?.from('universities').select('id,name').eq('status', 'approved').order('name').then(({ data }) => {
      const next = (data ?? []) as Option[]; setUniversities(next); if (next[0]) setUniversityId(next[0].id);
    });
  }, []);
  useEffect(() => {
    if (!universityId) return;
    supabase?.from('residences').select('id,name,university_id').eq('university_id', universityId).eq('status', 'approved').order('name').then(({ data }) => {
      const next = (data ?? []).map((item: any) => ({ id: item.id, name: item.name, parentId: item.university_id }));
      setResidences(next); setResidenceId(next[0]?.id ?? '');
    });
  }, [universityId]);
  useEffect(() => {
    if (!residenceId) return;
    supabase?.from('floors').select('id,name,residence_id').eq('residence_id', residenceId).order('name').then(({ data }) => {
      const next = (data ?? []).map((item: any) => ({ id: item.id, name: item.name, parentId: item.residence_id }));
      setFloors(next); setFloorId(next[0]?.id ?? '');
    });
  }, [residenceId]);

  const selectedUniversity = universities.find((item) => item.id === universityId);
  const selectedResidence = residences.find((item) => item.id === residenceId);
  const selectedFloor = floors.find((item) => item.id === floorId);
  const canContinue = useMemo(() => step === 1 ? Boolean(universityId) : step === 2 ? Boolean(floorId) : step === 3 ? selectedHabits.length > 0 : code.trim().length >= 5, [step, universityId, floorId, selectedHabits, code]);

  const finish = async () => {
    setBusy(true); setMessage(null);
    const result = await finishOnboarding(floorId, code, selectedHabits);
    setBusy(false); if (result) setMessage(result);
  };
  const toggleHabit = (key: string) => setSelectedHabits((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Brand /><Pressable onPress={logout}><Text style={styles.exit}>Sign out</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.progress}><Text style={styles.step}>STEP {step} OF 4</Text><ProgressBar value={step / 4} height={7} /></View>
      <Card style={styles.card}>
        {step === 1 && <><Eyebrow>YOUR CAMPUS</Eyebrow><Text style={[type.title, styles.title]}>Where do you belong?</Text><Text style={type.body}>Choose your approved university.</Text><View style={styles.options}>{universities.map((item) => <Choice key={item.id} label={item.name} selected={item.id === universityId} onPress={() => setUniversityId(item.id)} />)}</View></>}
        {step === 2 && <><Eyebrow>YOUR TEAM</Eyebrow><Text style={[type.title, styles.title]}>Choose your residence.</Text><Text style={type.body}>You will take part with this community.</Text><View style={styles.options}>{residences.map((item) => <Choice key={item.id} label={item.name} selected={item.id === residenceId} onPress={() => setResidenceId(item.id)} />)}</View><Text style={styles.subLabel}>FLOOR</Text><View style={styles.floorRow}>{floors.map((item) => <Pressable key={item.id} onPress={() => setFloorId(item.id)} style={[styles.floor, item.id === floorId && styles.floorSelected]}><Text style={[styles.floorText, item.id === floorId && styles.floorTextSelected]}>{item.name.replace(/floor\s*/i, '')}</Text></Pressable>)}</View></>}
        {step === 3 && <><Eyebrow>YOUR HABITS</Eyebrow><Text style={[type.title, styles.title]}>What matters to you?</Text><Text style={type.body}>Your home and notifications stay focused on what you choose. You can change this later.</Text><View style={styles.options}>{habits.map((habit) => <Choice key={habit.key} label={`${habit.icon}  ${habit.label}`} detail={habit.description} selected={selectedHabits.includes(habit.key)} onPress={() => toggleHabit(habit.key)} />)}</View></>}
        {step === 4 && <><Eyebrow>VERIFY MEMBERSHIP</Eyebrow><Text style={[type.title, styles.title]}>Enter your join code.</Text><Text style={type.body}>Get the current code from your residence team.</Text><TextInput value={code} onChangeText={setCode} autoCapitalize="characters" style={styles.codeInput} /><View style={styles.summary}><Text style={styles.summaryIcon}>⌂</Text><View><Text style={styles.summaryTitle}>{selectedResidence?.name} · {selectedFloor?.name}</Text><Text style={styles.summaryBody}>{selectedUniversity?.name}</Text></View></View>{message && <Text style={styles.message}>{message}</Text>}</>}
        <View style={styles.actions}>{step > 1 && <Button variant="secondary" onPress={() => { setMessage(null); setStep((value) => value - 1); }} style={styles.action}>Back</Button>}<Button onPress={() => step === 4 ? finish() : setStep((value) => value + 1)} disabled={!canContinue || busy} style={styles.action}>{step === 4 ? busy ? 'Joining…' : 'Join my team' : 'Continue'}</Button></View>
      </Card>
    </ScrollView>
  </SafeAreaView>;
}

function Choice({ label, detail, selected, onPress }: { label: string; detail?: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>{label}</Text>{detail && <Text style={styles.choiceDetail}>{detail}</Text>}</View></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream }, header: { height: 72, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, exit: { color: Palette.inkSoft, fontSize: 12, fontWeight: '800' },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 60 }, progress: { width: '100%', maxWidth: 570, gap: 8, marginBottom: 16 }, step: { color: Palette.inkSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  card: { width: '100%', maxWidth: 570, padding: 28 }, title: { marginTop: 9, marginBottom: 8 }, options: { gap: 10, marginVertical: 24 }, choice: { minHeight: 68, borderRadius: 17, borderWidth: 1, borderColor: Palette.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }, choiceSelected: { borderColor: Palette.mintDark, backgroundColor: '#F1FCF6' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#A9B8B2', alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: Palette.mintDark }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.mintDark },
  choiceCopy: { flex: 1 }, choiceTitle: { color: Palette.ink, fontSize: 14, fontWeight: '800' }, choiceDetail: { color: Palette.inkSoft, fontSize: 11, marginTop: 3 }, subLabel: { color: Palette.inkSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  floorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 9, marginBottom: 22 }, floor: { minWidth: 55, flex: 1, borderRadius: 13, borderWidth: 1, borderColor: Palette.line, paddingVertical: 11, alignItems: 'center' }, floorSelected: { backgroundColor: Palette.ink, borderColor: Palette.ink }, floorText: { color: Palette.inkSoft, fontWeight: '800' }, floorTextSelected: { color: Palette.paper },
  codeInput: { marginVertical: 24, height: 62, borderRadius: 17, borderWidth: 1, borderColor: Palette.mintDark, backgroundColor: '#F1FCF6', color: Palette.ink, fontSize: 23, fontWeight: '900', textAlign: 'center', letterSpacing: 3 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.cream, padding: 14, borderRadius: 16 }, summaryIcon: { fontSize: 24 }, summaryTitle: { color: Palette.ink, fontWeight: '800', fontSize: 13 }, summaryBody: { color: Palette.inkSoft, fontSize: 11, marginTop: 3 },
  message: { color: Palette.danger, fontSize: 12, marginTop: 12 }, actions: { flexDirection: 'row', gap: 10, marginTop: 18 }, action: { flex: 1 },
});
