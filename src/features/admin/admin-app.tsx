import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Button, Card, Eyebrow, Pill, Stat, type } from '@/components/ui/app-ui';
import { MetricChart } from '@/components/ui/metric-chart';
import { Palette } from '@/constants/theme';
import { getChallengeModule } from '@/core/challenges/registry';
import { supabase } from '@/lib/supabase';
import { useApp, type AdminTab } from '@/state/app-context';

const nav: { key: AdminTab; icon: string; label: string }[] = [
  { key: 'overview', icon: '⌂', label: 'Overview' }, { key: 'challenge', icon: '◎', label: 'Challenges' },
  { key: 'rewards', icon: '✦', label: 'Rewards' }, { key: 'organizations', icon: '▦', label: 'Organizations' },
];

export function AdminApp() {
  const { adminTab, setAdminTab, logout, role, displayName } = useApp();
  const compact = useWindowDimensions().width < 850;
  const [scannerOpen, setScannerOpen] = useState(role === 'reward_redeemer');
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.app}>{!compact && <View style={styles.sidebar}><Brand /><View style={styles.nav}>{nav.map((item) => <NavButton key={item.key} item={item} active={adminTab === item.key} onPress={() => setAdminTab(item.key)} />)}</View><View style={styles.adminCard}><View style={styles.adminAvatar}><Text style={styles.adminAvatarText}>{displayName.slice(0, 2).toUpperCase()}</Text></View><View style={styles.adminCopy}><Text style={styles.adminName}>{displayName}</Text><Text style={styles.adminOrg}>{role?.replaceAll('_', ' ')}</Text></View></View><Button variant="ghost" onPress={logout}>Sign out</Button></View>}
      <View style={styles.main}><View style={styles.topbar}>{compact ? <Brand compact /> : <View><Text style={styles.topTitle}>{nav.find((item) => item.key === adminTab)?.label}</Text><Text style={styles.topSubtitle}>CommonGrid sustainability console</Text></View>}<View style={styles.topActions}><Button variant="secondary" onPress={() => setScannerOpen(true)}>Scan reward</Button><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>CONNECTED</Text></View></View></View>
        <View style={styles.body}>{adminTab === 'overview' ? <Overview /> : adminTab === 'challenge' ? <Challenges /> : adminTab === 'rewards' ? <Rewards /> : <Organizations />}</View>
        {compact && <View style={styles.mobileNav}>{nav.map((item) => <Pressable key={item.key} onPress={() => setAdminTab(item.key)} style={styles.mobileNavItem}><Text style={[styles.mobileNavIcon, adminTab === item.key && styles.mobileNavActive]}>{item.icon}</Text><Text style={[styles.mobileNavLabel, adminTab === item.key && styles.mobileNavLabelActive]}>{item.label}</Text></Pressable>)}</View>}
      </View>
    </View><Scanner visible={scannerOpen} onClose={() => setScannerOpen(false)} />
  </SafeAreaView>;
}

function NavButton({ item, active, onPress }: { item: typeof nav[number]; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.navButton, active && styles.navButtonActive]}><Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text><Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text></Pressable>; }
function AdminScreen({ children }: { children: React.ReactNode }) { return <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>{children}</ScrollView>; }
function ScreenIntro({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) { return <View style={styles.introRow}><View style={styles.introCopy}><Eyebrow>{eyebrow}</Eyebrow><Text style={type.title}>{title}</Text><Text style={type.body}>{body}</Text></View>{action}</View>; }

function Overview() {
  const { activeChallenge, progress, chartPoints, participation, challenges } = useApp();
  const module = activeChallenge ? getChallengeModule(activeChallenge.moduleKey) : null;
  const chart = module && activeChallenge ? (module as any).buildCharts(progress, chartPoints)[0] : null;
  return <AdminScreen><ScreenIntro eyebrow="OPERATIONS AT A GLANCE" title="Community overview" body="Live challenge health, verified outcomes, and participation." />
    <View style={styles.metricGrid}><Card style={styles.metricCard}><Stat value={String(participation.total)} label="verified participants" /></Card><Card style={styles.metricCard}><Stat value={progress.currentValue.toFixed(1) + ' ' + progress.unit} label="verified progress" /></Card><Card style={styles.metricCard}><Stat value={Math.round(progress.progressRatio * 100) + '%'} label="reward progress" /></Card><Card style={styles.metricCard}><Stat value={String(challenges.filter((item) => item.status === 'active').length)} label="active challenges" /></Card></View>
    {activeChallenge ? <Card><View style={styles.cardHeader}><View><Eyebrow>LIVE PERFORMANCE</Eyebrow><Text style={styles.cardTitle}>{activeChallenge.title}</Text></View><Pill tone="lime">DAY {activeChallenge.day}</Pill></View>{chart && <MetricChart spec={chart} />}</Card> : <Card><Text style={type.section}>No active challenge</Text><Text style={type.body}>Published challenges will appear here when their schedule begins.</Text></Card>}
  </AdminScreen>;
}

function Challenges() {
  const { challenges, habits, refresh } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [residences, setResidences] = useState<any[]>([]);
  const [residenceId, setResidenceId] = useState('');
  const [title, setTitle] = useState('Cool Smart Week');
  const [subtitle, setSubtitle] = useState('Switch off the AC when nobody is there.');
  const [startsAt, setStartsAt] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [target, setTarget] = useState('12');
  const [capacity, setCapacity] = useState('100');
  useEffect(() => { supabase?.from('residences').select('id,name').eq('status', 'approved').order('name').then(({ data }) => { setResidences(data ?? []); setResidenceId((current) => current || data?.[0]?.id || ''); }); }, []);
  const create = async () => {
    const { error } = await supabase!.rpc('create_energy_challenge', { target_residence: residenceId, challenge_title: title, challenge_subtitle: subtitle, challenge_starts_at: new Date(startsAt + 'T00:00:00').toISOString(), target_percent: Number(target), participant_capacity: Number(capacity) });
    setMessage(error?.message ?? 'Challenge draft created.'); if (!error) await refresh();
  };
  const publish = async (id: string, moduleKey: string) => {
    const { error } = await supabase!.rpc(moduleKey === 'idle-ac' ? 'publish_energy_challenge' : 'publish_challenge', { target_challenge: id });
    setMessage(error?.message ?? 'Challenge published.'); if (!error) await refresh();
  };
  return <AdminScreen><ScreenIntro eyebrow="CHALLENGE BUILDER" title="Habit challenges" body="Each habit owns its verification rules while the platform handles teams and rewards." />
    <Text style={type.section}>Installed habits</Text><View style={styles.moduleGrid}>{habits.map((habit) => <Card key={habit.key} style={styles.smallModule}><Text style={styles.smallModuleIcon}>{habit.icon}</Text><Text style={styles.smallModuleTitle}>{habit.label}</Text><Text style={type.small}>{habit.description}</Text><Pill>INSTALLED</Pill></Card>)}</View>
    <Card><Eyebrow>NEW ENERGY CHALLENGE</Eyebrow><View style={styles.formGrid}><Field label="TITLE" value={title} onChange={setTitle} /><Field label="ACTION" value={subtitle} onChange={setSubtitle} /><Field label="START (YYYY-MM-DD)" value={startsAt} onChange={setStartsAt} /><Field label="TARGET %" value={target} onChange={setTarget} keyboard="numeric" /><Field label="MAXIMUM PARTICIPANTS" value={capacity} onChange={setCapacity} keyboard="numeric" /></View><Text style={styles.fieldLabel}>RESIDENCE</Text><View style={styles.choiceRow}>{residences.map((row) => <Pressable key={row.id} onPress={() => setResidenceId(row.id)} style={[styles.choice, residenceId === row.id && styles.choiceActive]}><Text style={styles.choiceText}>{row.name}</Text></Pressable>)}</View><Button onPress={create} disabled={!residenceId || !title || !subtitle}>Create draft</Button></Card>
    <Text style={type.section}>Challenge schedule</Text>{challenges.map((challenge) => { const module = getChallengeModule(challenge.moduleKey); return <Card key={challenge.id} style={styles.challengeRow}><View style={styles.moduleIcon}><Text style={styles.moduleIconText}>{module.icon}</Text></View><View style={styles.applicationCopy}><Text style={styles.applicationTitle}>{challenge.title}</Text><Text style={type.small}>{module.label} · {new Date(challenge.startsAt).toLocaleDateString()}–{new Date(challenge.endsAt).toLocaleDateString()}</Text></View><Pill tone={challenge.status === 'active' ? 'lime' : 'cream'}>{challenge.status.toUpperCase()}</Pill>{challenge.status === 'draft' && <Button onPress={() => publish(challenge.id, challenge.moduleKey)}>Publish</Button>}</Card>; })}{message && <Text style={styles.message}>{message}</Text>}
  </AdminScreen>;
}

function Field({ label, value, onChange, keyboard }: { label: string; value: string; onChange: (value: string) => void; keyboard?: 'numeric' }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboard} style={styles.input} /></View>;
}

function Rewards() {
  const { challenges } = useApp();
  const drafts = challenges.filter((item) => item.status === 'draft');
  const [challengeId, setChallengeId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [value, setValue] = useState('');
  const [weight, setWeight] = useState('100');
  const [message, setMessage] = useState<string | null>(null);
  const selectedId = challengeId || drafts[0]?.id || '';
  const loadItems = async (id: string) => {
    if (!id) { setItems([]); return; }
    const { data } = await supabase!.from('reward_campaigns').select('reward_items(id,title,description,display_value,color,weight)').eq('challenge_id', id).maybeSingle();
    setItems((data as any)?.reward_items ?? []);
  };
  useEffect(() => { queueMicrotask(() => void loadItems(selectedId)); }, [selectedId]);
  const addItem = async () => {
    const { error } = await supabase!.rpc('add_reward_item', { target_challenge: selectedId, reward_title: title, reward_description: detail, reward_value: value, reward_color: '#73E6AF', reward_weight: Number(weight), reward_expires_at: new Date(Date.now() + 60 * 86400000).toISOString() });
    setMessage(error?.message ?? 'Reward added.'); if (!error) { setTitle(''); setDetail(''); setValue(''); await loadItems(selectedId); }
  };
  const upload = async (itemId: string) => {
    const selected = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/plain'], copyToCacheDirectory: true });
    if (selected.canceled) return;
    const text = await new File(selected.assets[0].uri).text();
    const codes = text.split(/\r?\n/).map((line) => line.split(',')[0].trim()).filter(Boolean);
    const { data, error } = await supabase!.rpc('add_reward_inventory', { target_item: itemId, codes });
    setMessage(error?.message ?? String(data) + ' rewards imported.');
  };
  return <AdminScreen><ScreenIntro eyebrow="UNIVERSITY-FUNDED INCENTIVES" title="Reward campaigns" body="Plan inventory and redemption before a challenge opens; allocation then runs automatically." />
    {drafts.length === 0 ? <Card><Text style={type.body}>Create a challenge draft before configuring rewards.</Text></Card> : <><View style={styles.choiceRow}>{drafts.map((challenge) => <Pressable key={challenge.id} onPress={() => setChallengeId(challenge.id)} style={[styles.choice, selectedId === challenge.id && styles.choiceActive]}><Text style={styles.choiceText}>{challenge.title}</Text></Pressable>)}</View>
      <Card><Eyebrow>ADD REWARD</Eyebrow><View style={styles.formGrid}><Field label="TITLE" value={title} onChange={setTitle} /><Field label="DESCRIPTION" value={detail} onChange={setDetail} /><Field label="DISPLAY VALUE" value={value} onChange={setValue} /><Field label="ODDS %" value={weight} onChange={setWeight} keyboard="numeric" /></View><Button onPress={addItem} disabled={!title || !value}>Add to campaign</Button></Card>
      <Card><View style={styles.cardHeader}><View><Eyebrow>PRIZE INVENTORY</Eyebrow><Text style={styles.cardTitle}>{items.length} reward types</Text></View></View><View style={styles.rewardTable}>{items.map((item) => <View key={item.id} style={styles.rewardRow}><View style={[styles.rewardSwatch, { backgroundColor: item.color }]}><Text style={styles.rewardSwatchText}>{item.display_value}</Text></View><View style={styles.rewardName}><Text style={styles.rewardTitle}>{item.title}</Text><Text style={type.small}>{item.description}</Text></View><Text style={styles.tableValue}>{item.weight}%</Text><Button variant="secondary" onPress={() => upload(item.id)}>Upload codes</Button></View>)}</View>{message && <Text style={styles.message}>{message}</Text>}</Card></>}
  </AdminScreen>;
}

function Organizations() {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const approve = async (id: string) => { const { error } = await supabase!.rpc('approve_residence', { target_residence: id }); setMessage(error?.message ?? 'Residence approved.'); if (!error) setRows((current) => current.map((row) => row.id === id ? { ...row, status: 'approved' } : row)); };
  const rotate = async (id: string) => { const { data, error } = await supabase!.rpc('rotate_join_code', { target_residence: id, validity_days: 30, allowed_uses: 500 }); setMessage(error?.message ?? 'New join code: ' + data); };
  useEffect(() => { supabase?.from('residences').select('id,name,status,floors(count),student_memberships(count)').order('name').then(({ data }) => setRows(data ?? [])); }, []);
  return <AdminScreen><ScreenIntro eyebrow="APPROVALS & MEMBERSHIP" title="Organizations" body="Manage participating residences and their verified communities." />
    <View style={styles.metricGrid}><Card style={styles.metricCard}><Stat value={String(rows.filter((item) => item.status === 'approved').length)} label="approved residences" /></Card><Card style={styles.metricCard}><Stat value={String(rows.reduce((sum, item) => sum + Number(item.floors?.[0]?.count ?? 0), 0))} label="verified floors" /></Card></View>
    <Card><Eyebrow>RESIDENCES</Eyebrow>{rows.map((row) => <View key={row.id} style={styles.approvedRow}><View style={styles.orgIcon}><Text style={styles.orgIconText}>⌂</Text></View><View style={styles.applicationCopy}><Text style={styles.applicationTitle}>{row.name}</Text><Text style={type.small}>{row.floors?.[0]?.count ?? 0} floors · {row.student_memberships?.[0]?.count ?? 0} members</Text></View><Pill tone={row.status === 'approved' ? 'mint' : 'cream'}>{String(row.status).toUpperCase()}</Pill>{row.status === 'pending' ? <Button onPress={() => approve(row.id)}>Approve</Button> : <Button variant="secondary" onPress={() => rotate(row.id)}>Rotate code</Button>}</View>)}</Card>
    {message && <Text style={styles.message}>{message}</Text>}
  </AdminScreen>;
}

function Scanner({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { redeemToken } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const scan = async ({ data }: { data: string }) => { if (scanned) return; setScanned(true); const result = await redeemToken(data); setMessage(result ?? 'Reward redeemed.'); };
  return <Modal visible={visible} animationType="slide" onRequestClose={() => { setScanned(false); setMessage(null); onClose(); }}><SafeAreaView style={styles.scanner}>{!permission?.granted ? <Card><Text style={type.section}>Scan a reward</Text><Text style={type.body}>Camera access is needed to verify a student’s one-time code.</Text><Button onPress={requestPermission}>Allow camera</Button><Button variant="ghost" onPress={() => { setScanned(false); setMessage(null); onClose(); }}>Close</Button></Card> : <><CameraView style={styles.camera} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : scan} /><View style={styles.scannerPanel}><Text style={styles.scannerTitle}>{message ?? 'Center the reward code in the frame'}</Text>{scanned && <Button onPress={() => { setScanned(false); setMessage(null); }}>Scan another</Button>}<Button variant="secondary" onPress={() => { setScanned(false); setMessage(null); onClose(); }}>Close</Button></View></>}</SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream }, app: { flex: 1, flexDirection: 'row' }, sidebar: { width: 230, padding: 22, borderRightWidth: 1, borderRightColor: Palette.line, backgroundColor: Palette.paper },
  nav: { marginTop: 38, gap: 7, flex: 1 }, navButton: { height: 46, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, navButtonActive: { backgroundColor: Palette.ink }, navIcon: { color: Palette.inkSoft, fontSize: 17, width: 22, textAlign: 'center' }, navIconActive: { color: Palette.lime }, navLabel: { color: Palette.inkSoft, fontSize: 12, fontWeight: '800' }, navLabelActive: { color: Palette.paper },
  adminCard: { flexDirection: 'row', gap: 9, alignItems: 'center', marginVertical: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: Palette.line }, adminAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, adminAvatarText: { color: Palette.ink, fontSize: 10, fontWeight: '900' }, adminCopy: { flex: 1 }, adminName: { color: Palette.ink, fontSize: 11, fontWeight: '900' }, adminOrg: { color: Palette.inkSoft, fontSize: 8, marginTop: 2 },
  main: { flex: 1 }, topbar: { minHeight: 70, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: Palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, topTitle: { color: Palette.ink, fontSize: 16, fontWeight: '900' }, topSubtitle: { color: Palette.inkSoft, fontSize: 9, marginTop: 3 }, topActions: { flexDirection: 'row', alignItems: 'center', gap: 9 }, livePill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#E7F8EE', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 100 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.mintDark }, liveText: { color: Palette.mintDark, fontSize: 9, fontWeight: '900' },
  body: { flex: 1 }, screen: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: 25, paddingBottom: 50, gap: 18 }, introRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, introCopy: { gap: 7, flex: 1 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metricCard: { minWidth: 150, flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '900', marginTop: 5 }, moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, smallModule: { minWidth: 180, flex: 1, gap: 10 }, smallModuleIcon: { fontSize: 28 }, smallModuleTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900' }, challengeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, moduleIcon: { width: 47, height: 47, borderRadius: 15, backgroundColor: Palette.blue, alignItems: 'center', justifyContent: 'center' }, moduleIconText: { fontSize: 23 },
  applicationCopy: { flex: 1 }, applicationTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900' }, rewardTable: { marginTop: 15 }, rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Palette.line }, rewardSwatch: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, rewardSwatchText: { color: Palette.ink, fontWeight: '900' }, rewardName: { flex: 1 }, rewardTitle: { color: Palette.ink, fontSize: 12, fontWeight: '900' }, tableLabel: { color: Palette.inkSoft, fontSize: 8, fontWeight: '800' }, tableValue: { color: Palette.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
  approvedRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Palette.line }, orgIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, orgIconText: { fontSize: 20 }, message: { color: Palette.inkSoft, fontSize: 12 },
  mobileNav: { minHeight: 67, flexDirection: 'row', backgroundColor: Palette.paper, borderTopWidth: 1, borderTopColor: Palette.line, paddingVertical: 7 }, mobileNavItem: { flex: 1, alignItems: 'center', gap: 2 }, mobileNavIcon: { color: Palette.inkSoft, fontSize: 18 }, mobileNavActive: { color: Palette.mintDark }, mobileNavLabel: { color: Palette.inkSoft, fontSize: 8 }, mobileNavLabelActive: { color: Palette.ink, fontWeight: '900' },
  scanner: { flex: 1, backgroundColor: Palette.ink, justifyContent: 'center', padding: 20 }, camera: { flex: 1, borderRadius: 24, overflow: 'hidden' }, scannerPanel: { padding: 20, gap: 12 }, scannerTitle: { color: Palette.paper, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 14 }, field: { flex: 1, minWidth: 180 }, fieldLabel: { color: Palette.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 6 }, input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, paddingHorizontal: 14, color: Palette.ink }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }, choice: { borderWidth: 1, borderColor: Palette.line, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 }, choiceActive: { borderColor: Palette.mintDark, backgroundColor: '#F1FCF6' }, choiceText: { color: Palette.ink, fontSize: 11, fontWeight: '800' },
});
