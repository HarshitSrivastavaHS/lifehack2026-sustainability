import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { Brand, Button, Card, Eyebrow, ProgressBar, type } from '@/components/ui/app-ui';
import { useDemo } from '@/state/demo-context';

const universities = ['LifeHack University', 'National University of Singapore', 'Singapore Management University'];
const residences = ['Orchid Residence', 'Harbour Residence'];
const floors = ['Floor 2', 'Floor 3', 'Floor 4', 'Floor 5'];

export function OnboardingScreen() {
  const { finishOnboarding, logout } = useDemo();
  const [step, setStep] = useState(1);
  const [university, setUniversity] = useState(universities[0]);
  const [residence, setResidence] = useState(residences[0]);
  const [floor, setFloor] = useState(floors[2]);
  const [code, setCode] = useState('ORCHID26');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}><Brand /><Pressable onPress={logout}><Text style={styles.exit}>Sign out</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.progress}><Text style={styles.step}>STEP {step} OF 3</Text><ProgressBar value={step / 3} height={7} /></View>
        <Card style={styles.card}>
          {step === 1 && <>
            <Eyebrow>YOUR CAMPUS</Eyebrow><Text style={[type.title, styles.title]}>Where do you belong?</Text>
            <Text style={type.body}>Only approved universities can run verified challenges.</Text>
            <View style={styles.options}>{universities.map((item) => <Choice key={item} label={item} selected={item === university} onPress={() => setUniversity(item)} />)}</View>
          </>}
          {step === 2 && <>
            <Eyebrow>YOUR TEAM</Eyebrow><Text style={[type.title, styles.title]}>Choose your residence.</Text>
            <Text style={type.body}>Your verified energy progress is shared with this community.</Text>
            <View style={styles.options}>{residences.map((item) => <Choice key={item} label={item} detail={item === 'Orchid Residence' ? '4 active floors' : '3 active floors'} selected={item === residence} onPress={() => setResidence(item)} />)}</View>
            <Text style={styles.subLabel}>FLOOR</Text><View style={styles.floorRow}>{floors.map((item) => <Pressable key={item} onPress={() => setFloor(item)} style={[styles.floor, item === floor && styles.floorSelected]}><Text style={[styles.floorText, item === floor && styles.floorTextSelected]}>{item.replace('Floor ', '')}</Text></Pressable>)}</View>
          </>}
          {step === 3 && <>
            <Eyebrow>VERIFY MEMBERSHIP</Eyebrow><Text style={[type.title, styles.title]}>Enter your join code.</Text>
            <Text style={type.body}>Get this rotating code from your residence team. It keeps competitions fair without relying on verification emails.</Text>
            <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" style={styles.codeInput} />
            <View style={styles.summary}><Text style={styles.summaryIcon}>⌂</Text><View><Text style={styles.summaryTitle}>{residence} · {floor}</Text><Text style={styles.summaryBody}>{university}</Text></View></View>
          </>}
          <View style={styles.actions}>{step > 1 && <Button variant="secondary" onPress={() => setStep((value) => value - 1)} style={styles.action}>Back</Button>}<Button onPress={() => step === 3 ? finishOnboarding() : setStep((value) => value + 1)} disabled={step === 3 && code.length < 5} style={styles.action}>{step === 3 ? 'Join my team' : 'Continue'}</Button></View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice({ label, detail, selected, onPress }: { label: string; detail?: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>{label}</Text>{detail && <Text style={styles.choiceDetail}>{detail}</Text>}</View></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream }, header: { height: 72, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, exit: { color: Palette.inkSoft, fontSize: 12, fontWeight: '800' },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 60 }, progress: { width: '100%', maxWidth: 570, gap: 8, marginBottom: 16 }, step: { color: Palette.inkSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  card: { width: '100%', maxWidth: 570, padding: 28 }, title: { marginTop: 9, marginBottom: 8 }, options: { gap: 10, marginVertical: 24 },
  choice: { minHeight: 68, borderRadius: 17, borderWidth: 1, borderColor: Palette.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }, choiceSelected: { borderColor: Palette.mintDark, backgroundColor: '#F1FCF6' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#A9B8B2', alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: Palette.mintDark }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.mintDark },
  choiceCopy: { flex: 1 }, choiceTitle: { color: Palette.ink, fontSize: 14, fontWeight: '800' }, choiceDetail: { color: Palette.inkSoft, fontSize: 11, marginTop: 3 },
  subLabel: { color: Palette.inkSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, floorRow: { flexDirection: 'row', gap: 9, marginTop: 9, marginBottom: 22 },
  floor: { flex: 1, borderRadius: 13, borderWidth: 1, borderColor: Palette.line, paddingVertical: 11, alignItems: 'center' }, floorSelected: { backgroundColor: Palette.ink, borderColor: Palette.ink }, floorText: { color: Palette.inkSoft, fontWeight: '800' }, floorTextSelected: { color: Palette.paper },
  codeInput: { marginVertical: 24, height: 62, borderRadius: 17, borderWidth: 1, borderColor: Palette.mintDark, backgroundColor: '#F1FCF6', color: Palette.ink, fontSize: 23, fontWeight: '900', textAlign: 'center', letterSpacing: 3 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Palette.cream, padding: 14, borderRadius: 16 }, summaryIcon: { fontSize: 24 }, summaryTitle: { color: Palette.ink, fontWeight: '800', fontSize: 13 }, summaryBody: { color: Palette.inkSoft, fontSize: 11, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 }, action: { flex: 1 },
});
