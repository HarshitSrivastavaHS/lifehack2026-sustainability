import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { Brand, Button, Card, Eyebrow, Pill, ProgressBar, Stat, type } from '@/components/ui/app-ui';
import { useDemo, type AdminTab } from '@/state/demo-context';

const nav: { key: AdminTab; icon: string; label: string }[] = [
  { key: 'overview', icon: '⌂', label: 'Overview' },
  { key: 'challenge', icon: '◎', label: 'Challenges' },
  { key: 'rewards', icon: '◇', label: 'Rewards' },
  { key: 'organizations', icon: '⌘', label: 'Organizations' },
];

export function AdminApp() {
  const { adminTab, setAdminTab, logout } = useDemo();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.app}>
        {!compact && <View style={styles.sidebar}>
          <Brand />
          <View style={styles.nav}>{nav.map((item) => <NavButton key={item.key} item={item} active={adminTab === item.key} onPress={() => setAdminTab(item.key)} />)}</View>
          <View style={styles.adminCard}><View style={styles.adminAvatar}><Text style={styles.adminAvatarText}>UA</Text></View><View style={styles.adminCopy}><Text style={styles.adminName}>University Admin</Text><Text style={styles.adminOrg}>LifeHack University</Text></View></View>
          <Button variant="ghost" onPress={logout}>Sign out</Button>
        </View>}
        <View style={styles.main}>
          <View style={styles.topbar}>
            {compact ? <Brand compact /> : <View><Text style={styles.topTitle}>{nav.find((item) => item.key === adminTab)?.label}</Text><Text style={styles.topSubtitle}>LifeHack University · Sustainability console</Text></View>}
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>DEMO LIVE</Text></View>
          </View>
          <View style={styles.body}>
            {adminTab === 'overview' && <Overview />}
            {adminTab === 'challenge' && <ChallengeManager />}
            {adminTab === 'rewards' && <RewardManager />}
            {adminTab === 'organizations' && <Organizations />}
          </View>
          {compact && <View style={styles.mobileNav}>{nav.map((item) => <Pressable key={item.key} onPress={() => setAdminTab(item.key)} style={styles.mobileNavItem}><Text style={[styles.mobileNavIcon, adminTab === item.key && styles.mobileNavActive]}>{item.icon}</Text><Text style={[styles.mobileNavLabel, adminTab === item.key && styles.mobileNavLabelActive]}>{item.label}</Text></Pressable>)}</View>}
        </View>
      </View>
    </SafeAreaView>
  );
}

function NavButton({ item, active, onPress }: { item: typeof nav[number]; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.navButton, active && styles.navButtonActive]}><Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text><Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text></Pressable>;
}

function AdminScreen({ children }: { children: React.ReactNode }) {
  return <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

function ScreenIntro({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) {
  return <View style={styles.introRow}><View style={styles.introCopy}><Eyebrow>{eyebrow}</Eyebrow><Text style={type.title}>{title}</Text><Text style={type.body}>{body}</Text></View>{action}</View>;
}

function Overview() {
  const { day, progress, impact, advanceDay, resetDemo, setAdminTab } = useDemo();
  return <AdminScreen>
    <ScreenIntro eyebrow="OPERATIONS AT A GLANCE" title="Good afternoon, Harshit" body="One live habit challenge across two residences." action={<Button onPress={() => setAdminTab('challenge')}>Manage challenge</Button>} />
    <View style={styles.metricGrid}>
      <Card style={styles.metricCard}><Stat value="148" label="verified participants" /><Text style={styles.metricTrend}>↑ 18 this week</Text></Card>
      <Card style={styles.metricCard}><Stat value={`${progress.savedKwh.toFixed(1)} kWh`} label="idle cooling avoided" /><Text style={styles.metricTrend}>AI-adjusted baseline</Text></Card>
      <Card style={styles.metricCard}><Stat value={`${Math.round(progress.progressRatio * 100)}%`} label="reward progress" /><Text style={styles.metricTrend}>Day {day} of 7</Text></Card>
      <Card style={styles.metricCard}><Stat value={impact.co2Kg.toFixed(1)} label="kg CO₂e avoided" /><Text style={styles.metricTrend}>simulated feed</Text></Card>
    </View>
    <View style={styles.columns}>
      <Card style={styles.wideCard}>
        <View style={styles.cardHeader}><View><Eyebrow>LIVE PERFORMANCE</Eyebrow><Text style={styles.cardTitle}>Cool Smart Week</Text></View><Pill tone="lime">ACTIVE · DAY {day}</Pill></View>
        <View style={styles.chart}>
          {[78, 66, 73, 62, 58, 55, 52].map((height, index) => <View key={index} style={styles.chartCol}><View style={[styles.expectedBar, { height: 90 }]} /><View style={[styles.actualBar, { height: index < day ? height : 0 }]} /><Text style={styles.chartDay}>D{index + 1}</Text></View>)}
        </View>
        <View style={styles.chartFooter}><View><Text style={styles.chartValue}>{progress.savedKwh.toFixed(1)} kWh saved</Text><Text style={type.small}>Low-occupancy periods only</Text></View><View style={styles.chartLegend}><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#DCE3DE' }]} /><Text style={type.small}>Expected</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Palette.mintDark }]} /><Text style={type.small}>Actual</Text></View></View></View>
      </Card>
      <Card style={styles.sideCard}>
        <Eyebrow>DEMO CONTROLS</Eyebrow><Text style={styles.cardTitle}>Replay the story</Text><Text style={[type.small, styles.demoBody]}>Advance the simulated BMS feed one day at a time. Reward allocation runs on day 7.</Text>
        <View style={styles.demoDay}><Text style={styles.demoDayNumber}>{day}</Text><Text style={styles.demoDayLabel}>of 7 days</Text></View>
        <Button onPress={advanceDay} disabled={day >= 7}>Advance one day</Button><Button variant="secondary" onPress={resetDemo}>Reset scenario</Button>
      </Card>
    </View>
    <Card style={styles.alertCard}><View style={styles.alertIcon}><Text style={styles.alertIconText}>✦</Text></View><View style={styles.alertCopy}><Eyebrow>MODEL INSIGHT</Eyebrow><Text style={styles.alertTitle}>Floor 3 has elevated cooling after 11pm.</Text><Text style={type.small}>Recommended nudge: “Last one out? Give the AC a night off.”</Text></View><Button variant="secondary">Add to inbox</Button></Card>
  </AdminScreen>;
}

function ChallengeManager() {
  const { targetPercent, setTargetPercent, day, progress, rewardMode } = useDemo();
  return <AdminScreen>
    <ScreenIntro eyebrow="CHALLENGE BUILDER" title="Cool Smart Week" body="One habit, one verified measure, one clear community goal." action={<Pill tone="lime">PUBLISHED</Pill>} />
    <View style={styles.columns}>
      <Card style={styles.wideCard}>
        <Eyebrow>BEHAVIOR MODULE</Eyebrow>
        <View style={styles.moduleSelected}><View style={styles.moduleIcon}><Text style={styles.moduleIconText}>❄</Text></View><View style={styles.moduleCopy}><Text style={styles.moduleTitle}>Idle air-conditioning</Text><Text style={type.small}>Measures AC energy while aggregate occupancy is below 20%.</Text></View><Text style={styles.check}>✓</Text></View>
        <Text style={styles.fieldLabel}>REDUCTION TARGET</Text>
        <View style={styles.stepper}><Pressable onPress={() => setTargetPercent(Math.max(1, targetPercent - 1))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><View style={styles.stepValue}><Text style={styles.stepNumber}>{targetPercent}%</Text><Text style={type.small}>against frozen baseline</Text></View><Pressable onPress={() => setTargetPercent(Math.min(30, targetPercent + 1))} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable></View>
        <Text style={styles.fieldLabel}>SCOPE & SCHEDULE</Text>
        <View style={styles.configRow}><ConfigCell label="Audience" value="Orchid Residence" /><ConfigCell label="Teams" value="Floors 2–5" /><ConfigCell label="Duration" value="7 days" /></View>
        <View style={styles.validation}><Text style={styles.validationIcon}>✓</Text><View><Text style={styles.validationTitle}>Ready and measurable</Text><Text style={type.small}>Baseline frozen · 8 weeks history · 148 residents · privacy threshold met</Text></View></View>
      </Card>
      <Card style={styles.sideCard}>
        <Eyebrow>LIVE PREVIEW</Eyebrow><Text style={styles.previewTitle}>What students see</Text>
        <View style={styles.previewPhone}><Pill tone="lime">DAY {day} OF 7</Pill><Text style={styles.previewChallenge}>Cool Smart Week</Text><Text style={type.small}>Switch off the AC when nobody’s there.</Text><View style={styles.previewProgress}><Text style={styles.previewPercent}>{Math.round(progress.progressRatio * 100)}%</Text><ProgressBar value={progress.progressRatio} /></View><View style={styles.previewReward}><Text style={styles.previewRewardIcon}>✦</Text><Text style={styles.previewRewardText}>{rewardMode === 'fixed_all' ? 'Fixed reward' : 'Guaranteed prize pool'}</Text></View></View>
      </Card>
    </View>
    <Text style={type.section}>Installed modules</Text>
    <View style={styles.moduleGrid}><Card style={styles.smallModule}><Text style={styles.smallModuleIcon}>❄</Text><Text style={styles.smallModuleTitle}>Idle AC</Text><Pill>INSTALLED</Pill></Card><Card style={[styles.smallModule, styles.disabledModule]}><Text style={styles.smallModuleIcon}>↟</Text><Text style={styles.smallModuleTitle}>Walking</Text><Pill tone="cream">ADD LATER</Pill></Card><Card style={[styles.smallModule, styles.disabledModule]}><Text style={styles.smallModuleIcon}>≈</Text><Text style={styles.smallModuleTitle}>Short showers</Text><Pill tone="cream">ADD LATER</Pill></Card></View>
  </AdminScreen>;
}

function ConfigCell({ label, value }: { label: string; value: string }) {
  return <View style={styles.configCell}><Text style={styles.configLabel}>{label}</Text><Text style={styles.configValue}>{value}</Text></View>;
}

function RewardManager() {
  const { rewardMode, setRewardMode, rewardItems, updateRewardWeight } = useDemo();
  const totalInventory = rewardItems.reduce((sum, item) => sum + item.inventory, 0);
  return <AdminScreen>
    <ScreenIntro eyebrow="UNIVERSITY-FUNDED INCENTIVES" title="Reward campaign" body="Publish guaranteed rewards directly into every eligible student’s in-app wallet." action={<Button>Save campaign</Button>} />
    <Card>
      <Text style={styles.fieldLabel}>DISTRIBUTION MODE</Text>
      <View style={styles.modeRow}>
        <Pressable onPress={() => setRewardMode('fixed_all')} style={[styles.modeCard, rewardMode === 'fixed_all' && styles.modeSelected]}><View style={styles.modeRadio}>{rewardMode === 'fixed_all' && <View style={styles.modeDot} />}</View><View><Text style={styles.modeTitle}>Fixed for everyone</Text><Text style={type.small}>Every eligible student gets the same item.</Text></View></Pressable>
        <Pressable onPress={() => setRewardMode('weighted_guaranteed')} style={[styles.modeCard, rewardMode === 'weighted_guaranteed' && styles.modeSelected]}><View style={styles.modeRadio}>{rewardMode === 'weighted_guaranteed' && <View style={styles.modeDot} />}</View><View><Text style={styles.modeTitle}>Guaranteed random pool</Text><Text style={type.small}>Everyone wins one item; odds are visible.</Text></View></Pressable>
      </View>
    </Card>
    <Card>
      <View style={styles.cardHeader}><View><Eyebrow>PRIZE INVENTORY</Eyebrow><Text style={styles.cardTitle}>{totalInventory} digital rewards ready</Text></View><Button variant="secondary">Upload codes</Button></View>
      <View style={styles.rewardTable}>
        {rewardItems.map((item) => <View key={item.id} style={styles.rewardRow}>
          <View style={[styles.rewardSwatch, { backgroundColor: item.color }]}><Text style={styles.rewardSwatchText}>{item.value}</Text></View>
          <View style={styles.rewardName}><Text style={styles.rewardTitle}>{item.title}</Text><Text style={type.small}>{item.detail}</Text></View>
          <View style={styles.inventory}><Text style={styles.tableLabel}>INVENTORY</Text><Text style={styles.tableValue}>{item.inventory}</Text></View>
          <View style={styles.weight}><Text style={styles.tableLabel}>VISIBLE ODDS</Text><View style={styles.weightControls}><Pressable onPress={() => updateRewardWeight(item.id, -5)} style={styles.miniButton}><Text>−</Text></Pressable><Text style={styles.weightValue}>{item.weight}%</Text><Pressable onPress={() => updateRewardWeight(item.id, 5)} style={styles.miniButton}><Text>+</Text></Pressable></View></View>
        </View>)}
      </View>
      <View style={styles.validation}><Text style={styles.validationIcon}>✓</Text><View><Text style={styles.validationTitle}>Inventory covers the 148-person locked roster</Text><Text style={type.small}>Assignment is server-side, transactional, and idempotent. No student can see unassigned voucher codes.</Text></View></View>
    </Card>
  </AdminScreen>;
}

function Organizations() {
  return <AdminScreen>
    <ScreenIntro eyebrow="APPROVALS & MEMBERSHIP" title="Organizations" body="Universities approve their residences; platform staff approve universities." action={<Button>Add residence</Button>} />
    <View style={styles.metricGrid}><Card style={styles.metricCard}><Stat value="2" label="approved residences" /></Card><Card style={styles.metricCard}><Stat value="7" label="verified floors" /></Card><Card style={styles.metricCard}><Stat value="148" label="active students" /></Card><Card style={styles.metricCard}><Stat value="1" label="pending application" /></Card></View>
    <Card>
      <View style={styles.cardHeader}><View><Eyebrow>PENDING REVIEW</Eyebrow><Text style={styles.cardTitle}>Residence applications</Text></View></View>
      <View style={styles.applicationRow}><View style={styles.orgIcon}><Text style={styles.orgIconText}>⌂</Text></View><View style={styles.applicationCopy}><Text style={styles.applicationTitle}>Garden Residence</Text><Text style={type.small}>Submitted by A. Tan · 8 floors · 312 residents</Text></View><Button variant="secondary">Review</Button><Button>Approve</Button></View>
    </Card>
    <Card>
      <Eyebrow>APPROVED</Eyebrow>
      {['Orchid Residence', 'Harbour Residence'].map((name, index) => <View key={name} style={styles.approvedRow}><View style={styles.orgIcon}><Text style={styles.orgIconText}>⌂</Text></View><View style={styles.applicationCopy}><Text style={styles.applicationTitle}>{name}</Text><Text style={type.small}>{index === 0 ? '4 floors · 82 members · challenge active' : '3 floors · 66 members · no active challenge'}</Text></View><Pill>APPROVED</Pill><Text style={styles.more}>•••</Text></View>)}
    </Card>
    <Card style={styles.joinCode}><View><Eyebrow>ROTATING JOIN CODE</Eyebrow><Text style={styles.joinCodeValue}>ORCHID26</Text><Text style={type.small}>Orchid Residence · Expires 31 Aug · 82 uses</Text></View><Button variant="secondary">Rotate code</Button></Card>
  </AdminScreen>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream }, app: { flex: 1, flexDirection: 'row' }, sidebar: { width: 230, padding: 22, borderRightWidth: 1, borderRightColor: Palette.line, backgroundColor: Palette.paper },
  nav: { marginTop: 38, gap: 7, flex: 1 }, navButton: { height: 46, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, navButtonActive: { backgroundColor: Palette.ink }, navIcon: { color: Palette.inkSoft, fontSize: 17, width: 22, textAlign: 'center' }, navIconActive: { color: Palette.lime }, navLabel: { color: Palette.inkSoft, fontSize: 12, fontWeight: '800' }, navLabelActive: { color: Palette.paper },
  adminCard: { flexDirection: 'row', gap: 9, alignItems: 'center', marginVertical: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: Palette.line }, adminAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, adminAvatarText: { color: Palette.ink, fontSize: 10, fontWeight: '900' }, adminCopy: { flex: 1 }, adminName: { color: Palette.ink, fontSize: 11, fontWeight: '900' }, adminOrg: { color: Palette.inkSoft, fontSize: 8, marginTop: 2 },
  main: { flex: 1 }, topbar: { height: 70, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: Palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, topTitle: { color: Palette.ink, fontSize: 16, fontWeight: '900' }, topSubtitle: { color: Palette.inkSoft, fontSize: 9, marginTop: 3 }, livePill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#E7F8EE', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 100 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.mintDark }, liveText: { color: Palette.mintDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  body: { flex: 1 }, screen: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: 25, paddingBottom: 50, gap: 18 }, introRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 4 }, introCopy: { gap: 7, flex: 1, maxWidth: 650 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metricCard: { minWidth: 150, flex: 1 }, metricTrend: { color: Palette.mintDark, fontSize: 9, fontWeight: '800', marginTop: 12 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, wideCard: { flex: 2.1, minWidth: 360 }, sideCard: { flex: 1, minWidth: 260 }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 15 }, cardTitle: { color: Palette.ink, fontSize: 18, fontWeight: '900', marginTop: 5 },
  chart: { height: 145, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 25, borderBottomWidth: 1, borderBottomColor: Palette.line }, chartCol: { width: 28, height: 120, justifyContent: 'flex-end', alignItems: 'center' }, expectedBar: { position: 'absolute', bottom: 20, width: 21, backgroundColor: '#DCE3DE', borderRadius: 5 }, actualBar: { width: 12, backgroundColor: Palette.mintDark, borderRadius: 4, zIndex: 2, marginBottom: 20 }, chartDay: { position: 'absolute', bottom: 3, color: Palette.inkSoft, fontSize: 8 }, chartFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }, chartValue: { color: Palette.ink, fontSize: 14, fontWeight: '900' }, chartLegend: { flexDirection: 'row', gap: 14 }, legendItem: { flexDirection: 'row', gap: 5, alignItems: 'center' }, legendDot: { width: 8, height: 8, borderRadius: 4 },
  demoBody: { marginVertical: 10 }, demoDay: { backgroundColor: Palette.cream, borderRadius: 18, padding: 16, marginVertical: 12, alignItems: 'center' }, demoDayNumber: { color: Palette.ink, fontSize: 35, fontWeight: '900' }, demoDayLabel: { color: Palette.inkSoft, fontSize: 10 }, alertCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#F0FBF5' }, alertIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, alertIconText: { color: Palette.ink }, alertCopy: { flex: 1 }, alertTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900', marginVertical: 4 },
  moduleSelected: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Palette.mintDark, borderRadius: 18, padding: 14, backgroundColor: '#F1FCF6', marginTop: 9 }, moduleIcon: { width: 47, height: 47, borderRadius: 15, backgroundColor: Palette.blue, alignItems: 'center', justifyContent: 'center' }, moduleIconText: { fontSize: 23 }, moduleCopy: { flex: 1 }, moduleTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900' }, check: { color: Palette.mintDark, fontSize: 18, fontWeight: '900' },
  fieldLabel: { color: Palette.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 23, marginBottom: 8 }, stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Palette.line, borderRadius: 16, overflow: 'hidden' }, stepButton: { width: 55, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.cream }, stepText: { color: Palette.ink, fontSize: 23, fontWeight: '900' }, stepValue: { flex: 1, alignItems: 'center' }, stepNumber: { color: Palette.ink, fontSize: 20, fontWeight: '900' },
  configRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, configCell: { flex: 1, minWidth: 120, backgroundColor: Palette.cream, padding: 12, borderRadius: 13 }, configLabel: { color: Palette.inkSoft, fontSize: 9 }, configValue: { color: Palette.ink, fontSize: 12, fontWeight: '900', marginTop: 4 },
  validation: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#EAF8EF', borderRadius: 15, padding: 13, marginTop: 18 }, validationIcon: { width: 28, height: 28, lineHeight: 28, textAlign: 'center', borderRadius: 14, backgroundColor: Palette.mintDark, color: Palette.paper, fontWeight: '900' }, validationTitle: { color: Palette.ink, fontSize: 11, fontWeight: '900' },
  previewTitle: { color: Palette.ink, fontSize: 16, fontWeight: '900', marginTop: 5 }, previewPhone: { borderWidth: 1, borderColor: Palette.line, borderRadius: 24, padding: 17, marginTop: 14, backgroundColor: Palette.cream }, previewChallenge: { color: Palette.ink, fontSize: 19, fontWeight: '900', marginTop: 16, marginBottom: 4 }, previewProgress: { marginTop: 20, gap: 8 }, previewPercent: { color: Palette.ink, fontSize: 25, fontWeight: '900' }, previewReward: { flexDirection: 'row', gap: 8, marginTop: 18, alignItems: 'center' }, previewRewardIcon: { width: 30, height: 30, lineHeight: 30, textAlign: 'center', borderRadius: 10, backgroundColor: Palette.amber }, previewRewardText: { color: Palette.ink, fontSize: 10, fontWeight: '900' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, smallModule: { minWidth: 150, flex: 1, gap: 12 }, disabledModule: { opacity: 0.55 }, smallModuleIcon: { fontSize: 28 }, smallModuleTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, modeCard: { minWidth: 260, flex: 1, borderWidth: 1, borderColor: Palette.line, borderRadius: 17, padding: 15, flexDirection: 'row', gap: 11, alignItems: 'center' }, modeSelected: { borderColor: Palette.mintDark, backgroundColor: '#F1FCF6' }, modeRadio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, borderColor: Palette.mintDark, alignItems: 'center', justifyContent: 'center' }, modeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Palette.mintDark }, modeTitle: { color: Palette.ink, fontSize: 12, fontWeight: '900' },
  rewardTable: { marginTop: 15 }, rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Palette.line }, rewardSwatch: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, rewardSwatchText: { color: Palette.ink, fontWeight: '900' }, rewardName: { flex: 1, minWidth: 120 }, rewardTitle: { color: Palette.ink, fontSize: 12, fontWeight: '900' }, inventory: { width: 70 }, weight: { width: 150 }, tableLabel: { color: Palette.inkSoft, fontSize: 8, fontWeight: '800' }, tableValue: { color: Palette.ink, fontSize: 14, fontWeight: '900', marginTop: 4 }, weightControls: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 }, miniButton: { width: 26, height: 26, borderRadius: 8, backgroundColor: Palette.cream, alignItems: 'center', justifyContent: 'center' }, weightValue: { color: Palette.ink, fontSize: 12, fontWeight: '900', minWidth: 36, textAlign: 'center' },
  applicationRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14 }, orgIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, orgIconText: { fontSize: 20 }, applicationCopy: { flex: 1 }, applicationTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900' }, approvedRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Palette.line }, more: { color: Palette.inkSoft, marginLeft: 8 }, joinCode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, joinCodeValue: { color: Palette.ink, fontSize: 25, fontWeight: '900', letterSpacing: 2, marginVertical: 6 },
  mobileNav: { minHeight: 67, flexDirection: 'row', backgroundColor: Palette.paper, borderTopWidth: 1, borderTopColor: Palette.line, paddingVertical: 7 }, mobileNavItem: { flex: 1, alignItems: 'center', gap: 2 }, mobileNavIcon: { color: Palette.inkSoft, fontSize: 18 }, mobileNavActive: { color: Palette.mintDark }, mobileNavLabel: { color: Palette.inkSoft, fontSize: 8, fontWeight: '700' }, mobileNavLabelActive: { color: Palette.ink, fontWeight: '900' },
});
