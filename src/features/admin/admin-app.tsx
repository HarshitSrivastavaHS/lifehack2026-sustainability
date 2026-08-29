import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Button, Card, EmptyState, Eyebrow, Pill, SectionHeader } from '@/components/ui/app-ui';
import { Palette } from '@/constants/theme';
import { pointsForKwh, validateKwhInput } from '@/core/mvp/rules';
import { type AdminSection, type AdminStudent, type MvpReward, type RewardInput, useApp } from '@/state/app-context';

const sections: { id: AdminSection; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'students', label: 'Students', icon: '◎' },
  { id: 'electricity', label: 'Electricity', icon: '↯' },
  { id: 'rewards', label: 'Rewards', icon: '✦' },
];

export function AdminApp() {
  const { profile, adminSection, setAdminSection, loading, error, refresh, logout } = useApp();
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        <View style={styles.topbar}>
          <Brand />
          <View style={styles.adminIdentity}>
            {width >= 650 && <View><Text style={styles.adminName}>{profile?.name}</Text><Text style={styles.adminRole}>ADMIN · {profile?.universityName}</Text></View>}
            <Button onPress={logout} variant="ghost" style={styles.signOut}>Sign out</Button>
          </View>
        </View>
        <View style={styles.nav}>
          {sections.map((section) => <Pressable key={section.id} onPress={() => setAdminSection(section.id)} style={[styles.navItem, adminSection === section.id && styles.navActive]}>
            <Text style={[styles.navIcon, adminSection === section.id && styles.navTextActive]}>{section.icon}</Text>
            {width >= 500 && <Text style={[styles.navText, adminSection === section.id && styles.navTextActive]}>{section.label}</Text>}
          </Pressable>)}
        </View>
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={[styles.content, width < 500 && styles.contentCompact]}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Palette.mintDark} />}>
          {error && <Notice tone="error">{error}</Notice>}
          {adminSection === 'dashboard' && <Dashboard />}
          {adminSection === 'students' && <Students />}
          {adminSection === 'electricity' && <Electricity />}
          {adminSection === 'rewards' && <Rewards />}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Dashboard() {
  const { adminSummary, adminStudents, adminRewards, setAdminSection } = useApp();
  const summary = adminSummary ?? { students: 0, totalKwh: 0, totalPoints: 0, rewardsUnlocked: 0, rewardsRedeemed: 0 };
  const nextReward = adminRewards.find((reward) => reward.active && reward.state === 'locked');
  return <View style={styles.screen}>
    <View><Eyebrow>ADMIN DASHBOARD</Eyebrow><Text style={styles.pageTitle}>University overview</Text><Text style={styles.pageIntro}>Electricity savings and shared rewards at a glance.</Text></View>
    <View style={styles.statGrid}>
      <SummaryCard icon="◎" value={summary.students.toLocaleString()} label="Students" />
      <SummaryCard icon="↯" value={`${formatNumber(summary.totalKwh)} kWh`} label="Electricity saved" accent />
      <SummaryCard icon="+" value={summary.totalPoints.toLocaleString()} label="Total points" />
      <SummaryCard icon="✦" value={summary.rewardsUnlocked.toLocaleString()} label="Rewards unlocked" />
      <SummaryCard icon="✓" value={summary.rewardsRedeemed.toLocaleString()} label="Rewards redeemed" />
    </View>
    <View style={styles.dashboardGrid}>
      <Card style={styles.actionCard}>
        <View style={styles.actionIcon}><Text style={styles.actionIconText}>↯</Text></View>
        <View style={styles.actionCopy}><Text style={styles.actionTitle}>Record electricity savings</Text><Text style={styles.actionBody}>Add a student contribution and update university progress.</Text></View>
        <Button onPress={() => setAdminSection('electricity')}>Open simulation</Button>
      </Card>
      <Card style={styles.nextCard}>
        <Eyebrow>NEXT MILESTONE</Eyebrow>
        {nextReward ? <><Text style={styles.nextTitle}>{nextReward.name}</Text><Text style={styles.nextPoints}>{nextReward.pointsRequired.toLocaleString()} points required</Text><Text style={styles.nextRemaining}>{Math.max(nextReward.pointsRequired - summary.totalPoints, 0).toLocaleString()} points remaining</Text></> : <><Text style={styles.nextTitle}>All rewards unlocked</Text><Text style={styles.nextPoints}>Create another milestone when ready.</Text></>}
      </Card>
    </View>
    <Card style={styles.recentCard}>
      <SectionHeader title="Student contributions" subtitle={`${adminStudents.filter((student) => student.active).length} active students`} action={<Button variant="ghost" onPress={() => setAdminSection('students')}>View all</Button>} />
      <View style={styles.miniList}>{adminStudents.filter((student) => student.active).slice(0, 5).map((student) => <View key={student.id} style={styles.miniRow}><Avatar name={student.name} /><View style={styles.flex}><Text style={styles.rowName}>{student.name}</Text><Text style={styles.rowMeta}>{student.email}</Text></View><Text style={styles.rowImpact}>{formatNumber(student.kwhSaved)} kWh</Text></View>)}</View>
    </Card>
  </View>;
}

function SummaryCard({ icon, value, label, accent }: { icon: string; value: string; label: string; accent?: boolean }) {
  return <Card style={[styles.summaryCard, accent && styles.summaryAccent]}><View style={[styles.summaryIcon, accent && styles.summaryIconAccent]}><Text style={styles.summaryIconText}>{icon}</Text></View><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></Card>;
}

function Students() {
  const { adminStudents, createStudent, updateStudent, setStudentActive } = useApp();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminStudent | 'new' | null>(null);
  const [confirming, setConfirming] = useState<AdminStudent | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return adminStudents.filter((student) => !query || student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query));
  }, [adminStudents, search]);

  const save = async (input: { name: string; email: string; password: string }) => {
    setBusy(true);
    const result = editing === 'new'
      ? await createStudent(input)
      : editing ? await updateStudent(editing.id, { name: input.name, email: input.email }) : { error: 'Student not found' };
    setBusy(false);
    if (result.error) setNotice({ tone: 'error', text: result.error });
    else {
      setNotice({ tone: 'success', text: editing === 'new' ? 'Student added.' : 'Student updated.' });
      setEditing(null);
    }
  };

  const toggle = async () => {
    if (!confirming) return;
    setBusy(true);
    const result = await setStudentActive(confirming.id, !confirming.active);
    setBusy(false);
    setNotice(result.error ? { tone: 'error', text: result.error } : { tone: 'success', text: `${confirming.name} ${confirming.active ? 'deactivated' : 'reactivated'}.` });
    setConfirming(null);
  };

  return <View style={styles.screen}>
    <View style={styles.titleRow}><View><Eyebrow>STUDENTS</Eyebrow><Text style={styles.pageTitle}>Student accounts</Text><Text style={styles.pageIntro}>Manage access and view electricity contributions.</Text></View><Button onPress={() => setEditing('new')}>Add student</Button></View>
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or email" placeholderTextColor={Palette.inkMuted} style={styles.search} />
    {width >= 760 ? <Card style={styles.tableCard}>
      <View style={styles.tableHeader}><Text style={[styles.columnLabel, styles.personColumn]}>STUDENT</Text><Text style={styles.columnLabel}>SAVED</Text><Text style={styles.columnLabel}>POINTS</Text><Text style={styles.columnLabel}>STATUS</Text><View style={styles.actionColumn} /></View>
      {filtered.map((student, index) => <View key={student.id} style={[styles.studentRow, index < filtered.length - 1 && styles.rowBorder]}>
        <View style={styles.personColumn}><Avatar name={student.name} /><View style={styles.flex}><Text style={styles.rowName}>{student.name}</Text><Text numberOfLines={1} style={styles.rowMeta}>{student.email}</Text></View></View>
        <Text style={styles.cellValue}>{formatNumber(student.kwhSaved)} kWh</Text>
        <Text style={styles.cellValue}>{student.points.toLocaleString()}</Text>
        <View><Pill tone={student.active ? 'mint' : 'cream'}>{student.active ? 'Active' : 'Inactive'}</Pill></View>
        <View style={styles.rowActions}><Button variant="ghost" style={styles.compactButton} onPress={() => setEditing(student)}>Edit</Button><Button variant="ghost" style={styles.compactButton} onPress={() => setConfirming(student)}>{student.active ? 'Deactivate' : 'Reactivate'}</Button></View>
      </View>)}
      {filtered.length === 0 && <View style={styles.emptyTable}><Text style={styles.rowMeta}>No students found.</Text></View>}
    </Card> : <View style={styles.mobileStudentList}>{filtered.map((student) => <Card key={student.id} style={styles.mobileStudentCard}>
      <View style={styles.mobileStudentTop}><Avatar name={student.name} /><View style={styles.flex}><Text style={styles.rowName}>{student.name}</Text><Text style={styles.rowMeta}>{student.email}</Text></View><Pill tone={student.active ? 'mint' : 'cream'}>{student.active ? 'Active' : 'Inactive'}</Pill></View>
      <View style={styles.mobileStats}><View><Text style={styles.mobileStatValue}>{formatNumber(student.kwhSaved)} kWh</Text><Text style={styles.mobileStatLabel}>SAVED</Text></View><View><Text style={styles.mobileStatValue}>{student.points.toLocaleString()}</Text><Text style={styles.mobileStatLabel}>POINTS</Text></View></View>
      <View style={styles.rewardActions}><Button variant="secondary" style={styles.flexButton} onPress={() => setEditing(student)}>Edit</Button><Button variant="ghost" style={styles.flexButton} onPress={() => setConfirming(student)}>{student.active ? 'Deactivate' : 'Reactivate'}</Button></View>
    </Card>)}{filtered.length === 0 && <EmptyState title="No students found" body="Try another name or email." />}</View>}
    <StudentModal visible={editing !== null} student={editing === 'new' ? null : editing} busy={busy} onClose={() => setEditing(null)} onSave={save} />
    <ConfirmModal visible={Boolean(confirming)} title={confirming?.active ? 'Deactivate student?' : 'Reactivate student?'} body={confirming?.active ? `${confirming?.name} will no longer be able to use the app. Their history will be kept.` : `${confirming?.name} will regain access to the app.`} confirmLabel={confirming?.active ? 'Deactivate' : 'Reactivate'} danger={Boolean(confirming?.active)} busy={busy} onClose={() => setConfirming(null)} onConfirm={toggle} />
  </View>;
}

function Electricity() {
  const { adminStudents, adminSummary, simulateElectricity } = useApp();
  const activeStudents = adminStudents.filter((student) => student.active);
  const [studentId, setStudentId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [kwh, setKwh] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ points: number; universityPoints: number; rewards: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = activeStudents.find((student) => student.id === studentId);
  const validation = kwh ? validateKwhInput(kwh) : null;
  const preview = !validation && kwh ? pointsForKwh(Number(kwh)) : 0;

  const submit = async () => {
    if (!selected) { setError('Select a student.'); return; }
    const inputError = validateKwhInput(kwh);
    if (inputError) { setError(inputError); return; }
    setBusy(true);
    setError(null);
    setResult(null);
    const response = await simulateElectricity(selected.id, Number(kwh));
    setBusy(false);
    if (response.error || !response.data) setError(response.error ?? 'Could not save electricity data.');
    else {
      setResult({ points: response.data.pointsAwarded, universityPoints: response.data.universityPoints, rewards: response.data.newlyUnlocked.map((reward) => reward.name) });
      setKwh('');
    }
  };

  return <View style={styles.screen}>
    <View><Eyebrow>ELECTRICITY SIMULATION</Eyebrow><Text style={styles.pageTitle}>Record electricity saved</Text><Text style={styles.pageIntro}>Each 1 kWh saved awards 10 points and advances university rewards.</Text></View>
    <View style={styles.formGrid}>
      <Card style={styles.simulationCard}>
        <FormLabel>STUDENT</FormLabel>
        <Pressable onPress={() => setPickerOpen(true)} style={styles.select}><Text style={selected ? styles.selectValue : styles.selectPlaceholder}>{selected?.name ?? 'Select a student'}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
        <FormLabel>KWH SAVED</FormLabel>
        <TextInput value={kwh} onChangeText={setKwh} keyboardType="decimal-pad" placeholder="8" placeholderTextColor={Palette.inkMuted} style={styles.input} />
        <View style={styles.preview}><Text style={styles.previewLabel}>POINTS AWARDED</Text><Text style={styles.previewPoints}>+{preview}</Text></View>
        {error && <Notice tone="error">{error}</Notice>}
        <Button onPress={submit} disabled={busy || !selected || !kwh || Boolean(validation)}>{busy ? 'Saving…' : 'Submit saving'}</Button>
      </Card>
      <Card style={styles.simulationInfo}>
        <View style={styles.infoBolt}><Text style={styles.infoBoltText}>↯</Text></View>
        <Text style={styles.infoTitle}>University progress</Text>
        <Text style={styles.infoNumber}>{(adminSummary?.totalPoints ?? 0).toLocaleString()} points</Text>
        <Text style={styles.infoBody}>{formatNumber(adminSummary?.totalKwh ?? 0)} kWh saved by all students.</Text>
        {result && <View style={styles.resultCard}><Text style={styles.resultTitle}>Saving recorded</Text><Text style={styles.resultPoints}>+{result.points} points</Text><Text style={styles.resultBody}>University total: {result.universityPoints.toLocaleString()} points</Text>{result.rewards.map((reward) => <Text key={reward} style={styles.unlocked}>✦ {reward} unlocked</Text>)}</View>}
      </Card>
    </View>
    <StudentPicker visible={pickerOpen} students={activeStudents} selected={studentId} onSelect={(id) => { setStudentId(id); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
  </View>;
}

function Rewards() {
  const { adminRewards, saveReward } = useApp();
  const [editing, setEditing] = useState<MvpReward | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const save = async (input: RewardInput) => {
    setBusyId(input.id ?? 'new');
    const result = await saveReward(input);
    setBusyId(null);
    if (result.error) setNotice({ tone: 'error', text: result.error });
    else { setNotice({ tone: 'success', text: input.id ? 'Reward updated.' : 'Reward created.' }); setEditing(null); }
  };

  const toggle = async (reward: MvpReward) => {
    setBusyId(reward.id);
    const result = await saveReward({ id: reward.id, name: reward.name, description: reward.description, pointsRequired: reward.pointsRequired, active: !reward.active });
    setBusyId(null);
    setNotice(result.error ? { tone: 'error', text: result.error } : { tone: 'success', text: `${reward.name} ${reward.active ? 'deactivated' : 'activated'}.` });
  };

  return <View style={styles.screen}>
    <View style={styles.titleRow}><View><Eyebrow>REWARDS</Eyebrow><Text style={styles.pageTitle}>University milestones</Text><Text style={styles.pageIntro}>Rewards unlock for every student when total points reach each threshold.</Text></View><Button onPress={() => setEditing('new')}>Create reward</Button></View>
    {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
    <View style={styles.rewardAdminGrid}>{adminRewards.map((reward) => <Card key={reward.id} style={[styles.adminRewardCard, !reward.active && styles.inactiveCard]}>
      <View style={styles.rewardCardTop}><View style={styles.rewardAdminIcon}><Text style={styles.rewardAdminIconText}>✦</Text></View><Pill tone={reward.state === 'unlocked' ? 'mint' : 'cream'}>{reward.state === 'unlocked' ? 'Unlocked' : 'Locked'}</Pill></View>
      <View style={styles.flex}><Text style={styles.rewardAdminName}>{reward.name}</Text><Text style={styles.rewardAdminDescription}>{reward.description}</Text></View>
      <View><Text style={styles.rewardPoints}>{reward.pointsRequired.toLocaleString()} points</Text><Text style={styles.redemptionCount}>{reward.redemptionCount ?? 0} redemptions · {reward.active ? 'Active' : 'Inactive'}</Text></View>
      <View style={styles.rewardActions}><Button variant="secondary" onPress={() => setEditing(reward)} style={styles.flexButton}>Edit</Button><Button variant="ghost" disabled={busyId === reward.id} onPress={() => toggle(reward)} style={styles.flexButton}>{reward.active ? 'Deactivate' : 'Activate'}</Button></View>
    </Card>)}</View>
    {adminRewards.length === 0 && <EmptyState icon="✦" title="No rewards yet" body="Create the first shared university reward." action={<Button onPress={() => setEditing('new')}>Create reward</Button>} />}
    <RewardModal visible={editing !== null} reward={editing === 'new' ? null : editing} busy={busyId !== null} onClose={() => setEditing(null)} onSave={save} />
  </View>;
}

function StudentModal({ visible, student, busy, onClose, onSave }: { visible: boolean; student: AdminStudent | null; busy: boolean; onClose: () => void; onSave: (value: { name: string; email: string; password: string }) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const key = student?.id ?? 'new';
  const submit = () => {
    if (name.trim().length < 2) { setValidation('Enter the student’s name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setValidation('Enter a valid email address.'); return; }
    if (!student && password.length < 8) { setValidation('Temporary password must be at least 8 characters.'); return; }
    setValidation(null);
    onSave({ name: name.trim(), email: email.trim().toLowerCase(), password });
  };
  return <Modal key={key} visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => { setName(student?.name ?? ''); setEmail(student?.email ?? ''); setPassword(''); setValidation(null); }}>
    <ModalFrame onClose={onClose} title={student ? 'Edit student' : 'Add student'}>
      <FormLabel>NAME</FormLabel><TextInput value={name} onChangeText={setName} autoComplete="name" style={styles.input} />
      <FormLabel>EMAIL</FormLabel><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={styles.input} />
      {!student && <><FormLabel>TEMPORARY PASSWORD</FormLabel><TextInput value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" style={styles.input} /><Text style={styles.help}>At least 8 characters. The student can sign in immediately.</Text></>}
      {validation && <Notice tone="error">{validation}</Notice>}
      <View style={styles.modalActions}><Button variant="secondary" onPress={onClose} style={styles.flexButton}>Cancel</Button><Button onPress={submit} disabled={busy} style={styles.flexButton}>{busy ? 'Saving…' : 'Save student'}</Button></View>
    </ModalFrame>
  </Modal>;
}

function RewardModal({ visible, reward, busy, onClose, onSave }: { visible: boolean; reward: MvpReward | null; busy: boolean; onClose: () => void; onSave: (input: RewardInput) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [active, setActive] = useState(true);
  const [validation, setValidation] = useState<string | null>(null);
  const key = reward?.id ?? 'new';
  const submit = () => {
    const required = Number(points);
    if (!name.trim()) { setValidation('Enter a reward name.'); return; }
    if (!Number.isInteger(required) || required <= 0) { setValidation('Points required must be a positive whole number.'); return; }
    setValidation(null);
    onSave({ id: reward?.id, name: name.trim(), description: description.trim(), pointsRequired: required, active });
  };
  return <Modal key={key} visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => { setName(reward?.name ?? ''); setDescription(reward?.description ?? ''); setPoints(reward ? String(reward.pointsRequired) : ''); setActive(reward?.active ?? true); setValidation(null); }}>
    <ModalFrame onClose={onClose} title={reward ? 'Edit reward' : 'Create reward'}>
      <FormLabel>NAME</FormLabel><TextInput value={name} onChangeText={setName} maxLength={80} style={styles.input} />
      <FormLabel>DESCRIPTION</FormLabel><TextInput value={description} onChangeText={setDescription} maxLength={240} multiline style={[styles.input, styles.textarea]} />
      <FormLabel>POINTS REQUIRED</FormLabel><TextInput value={points} onChangeText={setPoints} keyboardType="number-pad" style={styles.input} editable={!reward || reward.state === 'locked'} />
      {reward?.state === 'unlocked' && <Text style={styles.help}>The milestone cannot change after unlocking.</Text>}
      <Pressable onPress={() => setActive((value) => !value)} style={styles.toggleRow}><View style={[styles.toggle, active && styles.toggleActive]}><View style={[styles.toggleThumb, active && styles.toggleThumbActive]} /></View><View><Text style={styles.toggleTitle}>Active</Text><Text style={styles.help}>Visible and available to students</Text></View></Pressable>
      {validation && <Notice tone="error">{validation}</Notice>}
      <View style={styles.modalActions}><Button variant="secondary" onPress={onClose} style={styles.flexButton}>Cancel</Button><Button onPress={submit} disabled={busy} style={styles.flexButton}>{busy ? 'Saving…' : 'Save reward'}</Button></View>
    </ModalFrame>
  </Modal>;
}

function StudentPicker({ visible, students, selected, onSelect, onClose }: { visible: boolean; students: AdminStudent[]; selected: string; onSelect: (id: string) => void; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><ModalFrame onClose={onClose} title="Select student"><ScrollView style={styles.pickerList}>{students.map((student) => <Pressable key={student.id} onPress={() => onSelect(student.id)} style={[styles.pickerRow, selected === student.id && styles.pickerSelected]}><Avatar name={student.name} /><View style={styles.flex}><Text style={styles.rowName}>{student.name}</Text><Text style={styles.rowMeta}>{formatNumber(student.kwhSaved)} kWh saved</Text></View>{selected === student.id && <Text style={styles.selectedCheck}>✓</Text>}</Pressable>)}</ScrollView></ModalFrame></Modal>;
}

function ConfirmModal({ visible, title, body, confirmLabel, danger, busy, onClose, onConfirm }: { visible: boolean; title: string; body: string; confirmLabel: string; danger?: boolean; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><ModalFrame onClose={onClose} title={title}><Text style={styles.confirmBody}>{body}</Text><View style={styles.modalActions}><Button variant="secondary" onPress={onClose} style={styles.flexButton}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} disabled={busy} onPress={onConfirm} style={styles.flexButton}>{busy ? 'Saving…' : confirmLabel}</Button></View></ModalFrame></Modal>;
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><Pressable accessibilityLabel="Close" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>{children}</View></KeyboardAvoidingView>;
}

function Notice({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  return <View style={[styles.notice, tone === 'error' && styles.noticeError]}><Text style={styles.noticeText}>{children}</Text></View>;
}

function FormLabel({ children }: { children: React.ReactNode }) { return <Text style={styles.formLabel}>{children}</Text>; }
function Avatar({ name }: { name: string }) { return <View style={styles.avatar}><Text style={styles.avatarText}>{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</Text></View>; }
function formatNumber(value: number) { return value.toLocaleString(undefined, { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 2 }); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream }, shell: { flex: 1 },
  topbar: { minHeight: 76, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Palette.paper, borderBottomWidth: 1, borderBottomColor: Palette.line, gap: 16 },
  adminIdentity: { flexDirection: 'row', alignItems: 'center', gap: 9 }, adminName: { color: Palette.ink, fontSize: 12, fontWeight: '900', textAlign: 'right' }, adminRole: { color: Palette.inkMuted, fontSize: 8, fontWeight: '800', marginTop: 2, textAlign: 'right' }, signOut: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 10 },
  nav: { flexDirection: 'row', justifyContent: 'center', gap: 4, paddingHorizontal: 18, paddingVertical: 9, backgroundColor: Palette.paper, borderBottomWidth: 1, borderBottomColor: Palette.line },
  navItem: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, borderRadius: 13 }, navActive: { backgroundColor: Palette.ink }, navIcon: { color: Palette.inkMuted, fontSize: 15, fontWeight: '900' }, navText: { color: Palette.inkSoft, fontSize: 11, fontWeight: '800' }, navTextActive: { color: Palette.paper },
  contentScroll: { flex: 1 }, content: { width: '100%', maxWidth: 1160, alignSelf: 'center', padding: 24, paddingBottom: 70 }, contentCompact: { paddingHorizontal: 10 }, screen: { gap: 22 },
  pageTitle: { color: Palette.ink, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1.1, marginTop: 7 }, pageIntro: { color: Palette.inkSoft, fontSize: 13, lineHeight: 19, marginTop: 4 }, titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' },
  notice: { backgroundColor: '#D9F8EC', borderColor: '#A8E5CF', borderWidth: 1, padding: 12, borderRadius: 13 }, noticeError: { backgroundColor: '#FFE9E6', borderColor: '#F2B8B1' }, noticeText: { color: Palette.ink, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, summaryCard: { flex: 1, minWidth: 172, padding: 17, borderRadius: 20 }, summaryAccent: { backgroundColor: '#F5FFE3', borderColor: '#D7EBAF' }, summaryIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: Palette.paperMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, summaryIconAccent: { backgroundColor: Palette.lime }, summaryIconText: { color: Palette.ink, fontSize: 17, fontWeight: '900' }, summaryValue: { color: Palette.ink, fontSize: 24, fontWeight: '900', letterSpacing: -.5 }, summaryLabel: { color: Palette.inkSoft, fontSize: 11, marginTop: 3 },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, actionCard: { flex: 1.25, minWidth: 300, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 15, backgroundColor: Palette.ink, borderColor: Palette.ink }, actionIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, actionIconText: { color: Palette.ink, fontSize: 29, fontWeight: '900' }, actionCopy: { flex: 1, minWidth: 180 }, actionTitle: { color: Palette.paper, fontSize: 17, fontWeight: '900' }, actionBody: { color: '#AEC2BD', fontSize: 11, lineHeight: 16, marginTop: 4 }, nextCard: { flex: .75, minWidth: 260, backgroundColor: '#EEF4FF', borderColor: '#D8E3F7' }, nextTitle: { color: Palette.ink, fontSize: 19, fontWeight: '900', marginTop: 16 }, nextPoints: { color: Palette.inkSoft, fontSize: 11, marginTop: 4 }, nextRemaining: { color: Palette.violetDark, fontSize: 11, fontWeight: '900', marginTop: 16 }, recentCard: { gap: 12 }, miniList: { gap: 2 }, miniRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 }, flex: { flex: 1 }, rowName: { color: Palette.ink, fontSize: 12, fontWeight: '900' }, rowMeta: { color: Palette.inkMuted, fontSize: 10, marginTop: 2 }, rowImpact: { color: Palette.mintDark, fontSize: 12, fontWeight: '900' },
  avatar: { width: 37, height: 37, borderRadius: 13, backgroundColor: '#E8F2EF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: Palette.mintDark, fontSize: 11, fontWeight: '900' }, search: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, color: Palette.ink, paddingHorizontal: 16, fontSize: 13 }, tableCard: { padding: 0, overflow: 'hidden', borderRadius: 20 }, tableHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 17, backgroundColor: '#F3F7F5' }, columnLabel: { width: 100, color: Palette.inkMuted, fontSize: 8, fontWeight: '900', letterSpacing: .8 }, personColumn: { flex: 1.7, minWidth: 190, flexDirection: 'row', alignItems: 'center', gap: 11 }, actionColumn: { width: 155 }, studentRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 17, paddingVertical: 10 }, rowBorder: { borderBottomWidth: 1, borderBottomColor: Palette.line }, cellValue: { width: 100, color: Palette.ink, fontSize: 11, fontWeight: '800' }, rowActions: { width: 155, flexDirection: 'row', justifyContent: 'flex-end' }, compactButton: { minHeight: 36, paddingHorizontal: 7, paddingVertical: 7 }, emptyTable: { padding: 30, alignItems: 'center' },
  mobileStudentList: { gap: 10 }, mobileStudentCard: { padding: 16, borderRadius: 19, gap: 14 }, mobileStudentTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, mobileStats: { flexDirection: 'row', gap: 35, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Palette.line }, mobileStatValue: { color: Palette.ink, fontSize: 14, fontWeight: '900' }, mobileStatLabel: { color: Palette.inkMuted, fontSize: 8, fontWeight: '900', letterSpacing: .8, marginTop: 3 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }, simulationCard: { flex: 1, minWidth: 300, maxWidth: 570, gap: 10 }, simulationInfo: { flex: 1, minWidth: 280, backgroundColor: Palette.ink, borderColor: Palette.ink }, formLabel: { color: Palette.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 5 }, input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, paddingHorizontal: 15, color: Palette.ink, fontSize: 14 }, textarea: { height: 88, paddingTop: 13, textAlignVertical: 'top' }, select: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selectValue: { color: Palette.ink, fontSize: 14, fontWeight: '700' }, selectPlaceholder: { color: Palette.inkMuted, fontSize: 14 }, chevron: { color: Palette.inkSoft, fontSize: 18 }, preview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3F7F5', borderRadius: 13, padding: 13, marginVertical: 4 }, previewLabel: { color: Palette.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: .8 }, previewPoints: { color: Palette.mintDark, fontSize: 20, fontWeight: '900' }, infoBolt: { width: 58, height: 58, borderRadius: 19, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, infoBoltText: { color: Palette.ink, fontSize: 30, fontWeight: '900' }, infoTitle: { color: '#B5C8C3', fontSize: 11, fontWeight: '800', marginTop: 21 }, infoNumber: { color: Palette.paper, fontSize: 34, fontWeight: '900', marginTop: 4 }, infoBody: { color: '#B5C8C3', fontSize: 12, marginTop: 4 }, resultCard: { backgroundColor: Palette.navyLight, borderRadius: 17, padding: 16, marginTop: 24 }, resultTitle: { color: Palette.mint, fontSize: 10, fontWeight: '900', letterSpacing: .8 }, resultPoints: { color: Palette.lime, fontSize: 25, fontWeight: '900', marginTop: 6 }, resultBody: { color: Palette.paper, fontSize: 11, marginTop: 3 }, unlocked: { color: Palette.lime, fontSize: 12, fontWeight: '900', marginTop: 12 },
  rewardAdminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, adminRewardCard: { flex: 1, minWidth: 245, maxWidth: 360, minHeight: 250, gap: 15, borderRadius: 20 }, inactiveCard: { opacity: .62, backgroundColor: '#F5F6F5' }, rewardCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, rewardAdminIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, rewardAdminIconText: { color: Palette.ink, fontSize: 21, fontWeight: '900' }, rewardAdminName: { color: Palette.ink, fontSize: 17, fontWeight: '900' }, rewardAdminDescription: { color: Palette.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 5 }, rewardPoints: { color: Palette.mintDark, fontSize: 13, fontWeight: '900' }, redemptionCount: { color: Palette.inkMuted, fontSize: 9, marginTop: 4 }, rewardActions: { flexDirection: 'row', gap: 8 }, flexButton: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,24,32,.58)', alignItems: 'center', justifyContent: 'center', padding: 20 }, modalCard: { width: '100%', maxWidth: 480, maxHeight: '88%', borderRadius: 24, backgroundColor: Palette.cream, padding: 22, gap: 10, shadowColor: Palette.shadow, shadowOpacity: .25, shadowRadius: 30 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }, modalTitle: { color: Palette.ink, fontSize: 21, fontWeight: '900' }, close: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.paperMuted, alignItems: 'center', justifyContent: 'center' }, closeText: { color: Palette.ink, fontSize: 23, lineHeight: 25 }, modalActions: { flexDirection: 'row', gap: 9, marginTop: 10 }, help: { color: Palette.inkMuted, fontSize: 10, lineHeight: 15 }, confirmBody: { color: Palette.inkSoft, fontSize: 13, lineHeight: 20, marginVertical: 8 }, pickerList: { maxHeight: 430 }, pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 14 }, pickerSelected: { backgroundColor: '#E5F9F1' }, selectedCheck: { color: Palette.success, fontSize: 16, fontWeight: '900' }, toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 }, toggle: { width: 42, height: 24, borderRadius: 15, backgroundColor: '#CAD5D1', padding: 3 }, toggleActive: { backgroundColor: Palette.mintDark }, toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: Palette.paper }, toggleThumbActive: { alignSelf: 'flex-end' }, toggleTitle: { color: Palette.ink, fontSize: 12, fontWeight: '900' },
});
