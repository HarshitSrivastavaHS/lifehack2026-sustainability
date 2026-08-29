import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { Brand, Button, Card, Eyebrow, Pill, ProgressBar, Stat, type } from '@/components/ui/app-ui';
import { energyModule } from '@/features/challenges/energy/module';
import { useDemo, type StudentTab } from '@/state/demo-context';

const tabs: { key: StudentTab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'challenges', label: 'Challenges', icon: '◎' },
  { key: 'league', label: 'League', icon: '♜' },
  { key: 'impact', label: 'Impact', icon: '♣' },
  { key: 'wallet', label: 'Wallet', icon: '▣' },
];

export function StudentApp() {
  const { studentTab, setStudentTab, logout, rewardIssued, rewardRevealed, revealReward } = useDemo();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Brand />
        <View style={styles.headerRight}>
          <Pressable accessibilityLabel="Inbox" style={styles.iconButton}><Text style={styles.iconText}>◌</Text><View style={styles.unread} /></Pressable>
          <Pressable onPress={logout} style={styles.avatar}><Text style={styles.avatarText}>V</Text></Pressable>
        </View>
      </View>
      <View style={styles.content}>
        {studentTab === 'home' && <HomeScreen />}
        {studentTab === 'challenges' && <ChallengesScreen />}
        {studentTab === 'league' && <LeagueScreen />}
        {studentTab === 'impact' && <ImpactScreen />}
        {studentTab === 'wallet' && <WalletScreen />}
      </View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((tab) => {
          const active = tab.key === studentTab;
          return <Pressable key={tab.key} onPress={() => setStudentTab(tab.key)} style={styles.tab}>
            <View style={[styles.tabIconWrap, active && styles.tabIconActive]}><Text style={[styles.tabIcon, active && styles.tabIconTextActive]}>{tab.icon}</Text></View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>;
        })}
      </View>
      <Modal visible={rewardIssued && !rewardRevealed} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.confetti}>✦  ✧  ✦</Text>
            <View style={styles.gift}><Text style={styles.giftIcon}>?</Text></View>
            <Eyebrow>COMMUNITY GOAL COMPLETE</Eyebrow>
            <Text style={[type.title, styles.modalTitle]}>A reward is waiting.</Text>
            <Text style={[type.body, styles.modalBody]}>Orchid Residence beat the idle-AC target. Every eligible resident gets one guaranteed prize.</Text>
            <Button onPress={revealReward} style={styles.full}>Reveal my reward</Button>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <ScrollView style={styles.scroll} contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <View style={styles.pageIntro}><Eyebrow>{eyebrow}</Eyebrow><Text style={type.title}>{title}</Text>{body && <Text style={type.body}>{body}</Text>}</View>;
}

function HomeScreen() {
  const { day, checkedDays, checkIn, progress, rewardItems, setStudentTab } = useDemo();
  const checkedToday = checkedDays.includes(day);
  const EnergyCard = energyModule.StudentCard;
  const remaining = Math.max(progress.targetValue - progress.currentValue, 0);
  return (
    <Screen>
      <View style={styles.welcomeRow}>
        <View><Text style={styles.greeting}>Good afternoon, Vihaan</Text><Text style={styles.location}>Orchid Residence · Floor 4</Text></View>
        <Pill tone="cream">Day {day} of 7</Pill>
      </View>
      <Card style={styles.challengeHero}>
        <View style={styles.challengeHeader}>
          <View style={styles.challengeIcon}><Text style={styles.challengeIconText}>❄</Text></View>
          <View style={styles.challengeCopy}><Eyebrow>LIVE COMMUNITY CHALLENGE</Eyebrow><Text style={styles.challengeTitle}>Cool Smart Week</Text><Text style={styles.challengeSubtitle}>Switch off the AC when nobody’s there.</Text></View>
        </View>
        <View style={styles.dayPath}>
          {Array.from({ length: 7 }, (_, index) => {
            const currentDay = index + 1;
            const complete = currentDay < day || checkedDays.includes(currentDay);
            const current = currentDay === day;
            return <View key={currentDay} style={styles.dayColumn}>
              <View style={[styles.dayNode, complete && styles.dayComplete, current && !complete && styles.dayCurrent]}>
                <Text style={[styles.dayNodeText, complete && styles.dayNodeTextComplete]}>{complete ? '✓' : currentDay}</Text>
              </View>
              <Text style={[styles.dayLabel, current && styles.dayLabelCurrent]}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
              {index < 6 && <View style={[styles.dayConnector, currentDay < day && styles.dayConnectorComplete]} />}
            </View>;
          })}
        </View>
        <View style={styles.todayCard}>
          <View style={styles.todayIcon}><Text style={styles.todayIconText}>{checkedToday ? '✓' : '↗'}</Text></View>
          <View style={styles.todayCopy}><Text style={styles.todayTitle}>{checkedToday ? 'Commitment logged!' : 'Before you leave today'}</Text><Text style={styles.todayBody}>{checkedToday ? 'Your floor can see one more person showed up.' : 'Switch off your AC, then make the one-tap commitment.'}</Text></View>
          <Button onPress={checkIn} disabled={checkedToday} variant={checkedToday ? 'secondary' : 'dark'}>{checkedToday ? 'Done' : 'I checked'}</Button>
        </View>
        <View style={styles.participation}><View style={styles.participationCopy}><Text style={styles.participationValue}>{checkedToday ? 28 : 27} / 36</Text><Text style={styles.participationLabel}>Floor 4 checked in today</Text></View><ProgressBar value={(checkedToday ? 28 : 27) / 36} color={Palette.coral} height={8} /></View>
      </Card>

      <View style={styles.sectionHeader}><View><Text style={type.section}>Verified progress</Text><Text style={type.small}>Calculated from low-occupancy meter readings</Text></View><Pill>SIMULATED</Pill></View>
      <EnergyCard progress={progress} />

      <Card style={styles.rewardCard}>
        <View style={styles.rewardTop}>
          <View style={styles.rewardIcon}><Text style={styles.rewardIconText}>✦</Text></View>
          <View style={styles.rewardCopy}><Eyebrow>GUARANTEED REWARD POOL</Eyebrow><Text style={styles.rewardTitle}>{remaining.toFixed(1)} kWh left to unlock</Text></View>
          <Pressable onPress={() => setStudentTab('wallet')}><Text style={styles.link}>See prizes</Text></Pressable>
        </View>
        <ProgressBar value={progress.progressRatio} color={Palette.amber} height={13} />
        <View style={styles.rewardPool}>{rewardItems.map((item) => <View key={item.id} style={[styles.miniPrize, { backgroundColor: item.color }]}><Text style={styles.miniPrizeValue}>{item.value}</Text></View>)}</View>
        <Text style={styles.rewardFine}>Everyone on the locked roster gets one prize. Possible rewards and odds are visible in Wallet.</Text>
      </Card>
      <View style={styles.dataNote}><Text style={styles.dataNoteIcon}>i</Text><Text style={styles.dataNoteText}>Daily commitments build momentum, but only building data moves the verified savings meter.</Text></View>
    </Screen>
  );
}

function ChallengesScreen() {
  const { day, progress, checkedDays } = useDemo();
  return <Screen>
    <PageIntro eyebrow="YOUR JOURNEY" title="Challenges" body="Each module measures one real behavior. No vague green points." />
    <Card style={styles.activeChallenge}>
      <View style={styles.listIcon}><Text style={styles.listIconText}>❄</Text></View>
      <View style={styles.listCopy}><View style={styles.listTitleRow}><Text style={styles.listTitle}>Cool Smart Week</Text><Pill tone="lime">ACTIVE</Pill></View><Text style={type.small}>Idle AC · Residence challenge · Day {day}/7</Text><View style={styles.listProgress}><ProgressBar value={progress.progressRatio} /><Text style={styles.listPercent}>{Math.round(progress.progressRatio * 100)}%</Text></View><Text style={styles.checkText}>{checkedDays.length} daily commitments · Building data verified</Text></View>
    </Card>
    <Text style={[type.section, styles.upNext]}>Up next</Text>
    <Card style={styles.upcoming}><View style={[styles.listIcon, { backgroundColor: '#E6F3F9' }]}><Text style={styles.listIconText}>↟</Text></View><View style={styles.listCopy}><Text style={styles.listTitle}>Walk the Last Mile</Text><Text style={type.small}>Walking module · Not installed in this demo</Text></View><Pill tone="cream">COMING SOON</Pill></Card>
    <Card style={styles.moduleNote}><Eyebrow>MODULAR BY DESIGN</Eyebrow><Text style={[type.section, styles.noteTitle]}>New behavior, same community.</Text><Text style={type.body}>Walking can add its own sensor adapter and scoring logic while reusing teams, challenges, progress, rewards, and your wallet.</Text></Card>
  </Screen>;
}

function LeagueScreen() {
  const rows = [
    { floor: 'Floor 2', score: 13.8, change: '↑ 1', color: Palette.amber },
    { floor: 'Floor 4', score: 12.4, change: 'You', color: Palette.lime },
    { floor: 'Floor 5', score: 10.1, change: '—', color: Palette.blue },
    { floor: 'Floor 3', score: 8.6, change: '↓ 1', color: '#E8DDF7' },
  ];
  return <Screen>
    <PageIntro eyebrow="FRIENDLY RIVALRY" title="Orchid League" body="Ranked by improvement against each floor’s own expected use—not raw electricity." />
    <Card style={styles.leagueCard}>
      {rows.map((row, index) => <View key={row.floor} style={[styles.leagueRow, row.floor === 'Floor 4' && styles.myLeagueRow]}>
        <Text style={styles.rank}>{index + 1}</Text><View style={[styles.floorAvatar, { backgroundColor: row.color }]}><Text style={styles.floorAvatarText}>{row.floor.replace('Floor ', 'F')}</Text></View>
        <View style={styles.leagueCopy}><Text style={styles.leagueTitle}>{row.floor}</Text><Text style={styles.leagueMeta}>{[31, 28, 26, 24][index]} of 36 checked in today</Text></View>
        <View style={styles.leagueScore}><Text style={styles.score}>{row.score}%</Text><Text style={styles.change}>{row.change}</Text></View>
      </View>)}
    </Card>
    <View style={styles.dataNote}><Text style={styles.dataNoteIcon}>✓</Text><Text style={styles.dataNoteText}>Floors need at least five verified members to rank. No individual energy leaderboard is created.</Text></View>
  </Screen>;
}

function ImpactScreen() {
  const { impact, progress } = useDemo();
  return <Screen>
    <PageIntro eyebrow="WHAT CHANGED" title="Your community’s impact" body="Measured against a frozen weather- and occupancy-adjusted baseline." />
    <Card>
      <View style={styles.statsRow}><Stat value={progress.savedKwh.toFixed(1)} label="kWh idle cooling avoided" accent={Palette.mintDark} /><Stat value={`$${impact.costSaved.toFixed(2)}`} label="estimated utility savings" /><Stat value={impact.co2Kg.toFixed(1)} label="kg CO₂e avoided" /></View>
      <View style={styles.chart}>
        {[62, 48, 68, 53, 76, 72, 84].map((height, index) => <View key={index} style={styles.chartColumn}><View style={[styles.chartExpected, { height: 88 }]} /><View style={[styles.chartActual, { height }]} /><Text style={styles.chartLabel}>D{index + 1}</Text></View>)}
      </View>
      <View style={styles.chartLegend}><View style={styles.legendLine}><View style={[styles.legendDot, { backgroundColor: '#D9E1DC' }]} /><Text style={type.small}>Expected</Text></View><View style={styles.legendLine}><View style={[styles.legendDot, { backgroundColor: Palette.mintDark }]} /><Text style={type.small}>Actual</Text></View></View>
    </Card>
    <Card style={styles.insight}><View style={styles.insightIcon}><Text>✦</Text></View><View style={styles.insightCopy}><Eyebrow>EXPLAINABLE INSIGHT</Eyebrow><Text style={styles.insightTitle}>The biggest gains happen after 10pm.</Text><Text style={type.small}>Low-occupancy cooling is 17% lower than expected overnight. Keep switching off before leaving shared rooms.</Text></View></Card>
  </Screen>;
}

function WalletScreen() {
  const { rewardIssued, rewardRevealed, revealReward, rewardItems } = useDemo();
  const prize = rewardItems[1];
  return <Screen>
    <PageIntro eyebrow="YOUR REWARDS" title="Wallet" body="University-funded rewards are issued directly here—no reward email required." />
    {rewardIssued && rewardRevealed ? <Card style={[styles.voucher, { backgroundColor: prize.color }]}>
      <View style={styles.voucherTop}><View><Eyebrow>YOU UNLOCKED</Eyebrow><Text style={styles.voucherTitle}>{prize.title}</Text><Text style={styles.voucherDetail}>{prize.detail}</Text></View><Text style={styles.voucherValue}>{prize.value}</Text></View>
      <View style={styles.codeBox}><Text style={styles.codeLabel}>VOUCHER CODE</Text><Text style={styles.code}>GRID-7K2F-4M8P</Text></View>
      <Text style={styles.expiry}>Valid until 30 Sep 2026 · One use · Provided by LifeHack University</Text>
    </Card> : <Card style={styles.lockedReward}>
      <View style={styles.lockCircle}><Text style={styles.lockIcon}>{rewardIssued ? '✦' : '⌁'}</Text></View>
      <Text style={type.section}>{rewardIssued ? 'Your prize is ready' : 'Reward pool locked'}</Text>
      <Text style={[type.body, styles.lockedBody]}>{rewardIssued ? 'Your reward was assigned fairly on the server.' : 'Complete Cool Smart Week to reveal one guaranteed prize.'}</Text>
      {rewardIssued ? <Button onPress={revealReward}>Reveal reward</Button> : <ProgressBar value={0.82} color={Palette.amber} />}
    </Card>}
    <Text style={[type.section, styles.possibleTitle]}>Possible prizes</Text>
    <Card>{rewardItems.map((item, index) => <View key={item.id} style={[styles.prizeRow, index < rewardItems.length - 1 && styles.rowDivider]}><View style={[styles.prizeIcon, { backgroundColor: item.color }]}><Text style={styles.prizeValue}>{item.value}</Text></View><View style={styles.prizeCopy}><Text style={styles.prizeTitle}>{item.title}</Text><Text style={type.small}>{item.detail}</Text></View><Text style={styles.odds}>{item.weight}%</Text></View>)}</Card>
    <Text style={styles.oddsNote}>Every eligible resident receives exactly one reward. Displayed odds are transparent and the pool cannot be published without enough inventory.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream }, content: { flex: 1 }, scroll: { flex: 1 },
  header: { height: 66, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Palette.line, backgroundColor: Palette.cream, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' }, iconButton: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' }, iconText: { color: Palette.ink, fontSize: 18 }, unread: { position: 'absolute', right: 7, top: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.coral },
  avatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: Palette.lime, fontWeight: '900' },
  screen: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 18, paddingBottom: 38, gap: 16 }, pageIntro: { gap: 8, marginVertical: 12 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 }, greeting: { color: Palette.ink, fontSize: 20, fontWeight: '900' }, location: { color: Palette.inkSoft, fontSize: 12, marginTop: 4 },
  challengeHero: { padding: 18 }, challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 }, challengeIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: Palette.blue, alignItems: 'center', justifyContent: 'center' }, challengeIconText: { fontSize: 25 },
  challengeCopy: { flex: 1 }, challengeTitle: { color: Palette.ink, fontSize: 20, fontWeight: '900', marginTop: 3 }, challengeSubtitle: { color: Palette.inkSoft, fontSize: 12, marginTop: 3 },
  dayPath: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 24, paddingHorizontal: 4 }, dayColumn: { flex: 1, alignItems: 'center', position: 'relative' }, dayNode: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#EEF1ED', borderWidth: 2, borderColor: '#E1E7E2', alignItems: 'center', justifyContent: 'center', zIndex: 2 }, dayComplete: { backgroundColor: Palette.mintDark, borderColor: Palette.mintDark }, dayCurrent: { backgroundColor: Palette.lime, borderColor: '#BBD63D' },
  dayNodeText: { color: Palette.inkSoft, fontWeight: '900', fontSize: 12 }, dayNodeTextComplete: { color: Palette.paper }, dayLabel: { color: '#94A29D', fontSize: 9, fontWeight: '800', marginTop: 5 }, dayLabelCurrent: { color: Palette.ink },
  dayConnector: { position: 'absolute', height: 3, backgroundColor: '#E1E7E2', left: '66%', right: '-34%', top: 16, zIndex: 1 }, dayConnectorComplete: { backgroundColor: Palette.mintDark },
  todayCard: { backgroundColor: Palette.ink, borderRadius: 19, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, todayIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, todayIconText: { color: Palette.ink, fontWeight: '900', fontSize: 18 }, todayCopy: { flex: 1 }, todayTitle: { color: Palette.paper, fontSize: 13, fontWeight: '900' }, todayBody: { color: '#BED0CA', fontSize: 10, lineHeight: 14, marginTop: 3 },
  participation: { marginTop: 15, gap: 8 }, participationCopy: { flexDirection: 'row', justifyContent: 'space-between' }, participationValue: { color: Palette.ink, fontWeight: '900', fontSize: 12 }, participationLabel: { color: Palette.inkSoft, fontSize: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }, rewardCard: { overflow: 'hidden' }, rewardTop: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 15 }, rewardIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: Palette.amber, alignItems: 'center', justifyContent: 'center' }, rewardIconText: { fontSize: 21, color: Palette.ink }, rewardCopy: { flex: 1 }, rewardTitle: { color: Palette.ink, fontWeight: '900', fontSize: 15, marginTop: 4 }, link: { color: Palette.mintDark, fontSize: 11, fontWeight: '900' },
  rewardPool: { flexDirection: 'row', marginTop: 14 }, miniPrize: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: -5, borderWidth: 2, borderColor: Palette.paper }, miniPrizeValue: { color: Palette.ink, fontWeight: '900', fontSize: 11 }, rewardFine: { color: Palette.inkSoft, fontSize: 10, lineHeight: 14, marginTop: 11 },
  dataNote: { flexDirection: 'row', gap: 9, padding: 12, alignItems: 'center' }, dataNoteIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2E9E4', color: Palette.inkSoft, textAlign: 'center', lineHeight: 24, fontWeight: '900' }, dataNoteText: { flex: 1, color: Palette.inkSoft, fontSize: 10, lineHeight: 15 },
  tabBar: { minHeight: 65, flexDirection: 'row', backgroundColor: Palette.paper, borderTopWidth: 1, borderTopColor: Palette.line, paddingTop: 7 }, tab: { flex: 1, alignItems: 'center', gap: 2 }, tabIconWrap: { width: 34, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, tabIconActive: { backgroundColor: Palette.lime }, tabIcon: { color: Palette.inkSoft, fontSize: 17, fontWeight: '900' }, tabIconTextActive: { color: Palette.ink }, tabLabel: { color: Palette.inkSoft, fontSize: 9, fontWeight: '700' }, tabLabelActive: { color: Palette.ink, fontWeight: '900' },
  activeChallenge: { flexDirection: 'row', gap: 14 }, listIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: Palette.blue, alignItems: 'center', justifyContent: 'center' }, listIconText: { fontSize: 23, fontWeight: '900' }, listCopy: { flex: 1 }, listTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, listTitle: { color: Palette.ink, fontSize: 16, fontWeight: '900' }, listProgress: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 16 }, listPercent: { color: Palette.ink, fontSize: 12, fontWeight: '900' }, checkText: { color: Palette.mintDark, fontSize: 10, fontWeight: '800', marginTop: 9 },
  upNext: { marginTop: 12 }, upcoming: { flexDirection: 'row', gap: 14, alignItems: 'center', opacity: 0.78 }, moduleNote: { backgroundColor: Palette.ink, marginTop: 8 }, noteTitle: { color: Palette.paper, marginVertical: 8 },
  leagueCard: { padding: 9 }, leagueRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 17 }, myLeagueRow: { backgroundColor: '#F1F8D7' }, rank: { width: 20, color: Palette.inkSoft, textAlign: 'center', fontWeight: '900' }, floorAvatar: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, floorAvatarText: { color: Palette.ink, fontWeight: '900' }, leagueCopy: { flex: 1 }, leagueTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900' }, leagueMeta: { color: Palette.inkSoft, fontSize: 10, marginTop: 3 }, leagueScore: { alignItems: 'flex-end' }, score: { color: Palette.ink, fontSize: 15, fontWeight: '900' }, change: { color: Palette.mintDark, fontSize: 9, fontWeight: '800', marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, chart: { height: 130, marginTop: 30, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: Palette.line }, chartColumn: { width: 25, height: 120, justifyContent: 'flex-end', alignItems: 'center' }, chartExpected: { position: 'absolute', bottom: 18, width: 20, borderRadius: 5, backgroundColor: '#D9E1DC' }, chartActual: { width: 12, borderRadius: 4, backgroundColor: Palette.mintDark, zIndex: 2, marginBottom: 18 }, chartLabel: { position: 'absolute', bottom: 1, color: Palette.inkSoft, fontSize: 8 }, chartLegend: { flexDirection: 'row', gap: 18, justifyContent: 'center', marginTop: 13 }, legendLine: { flexDirection: 'row', gap: 6, alignItems: 'center' }, legendDot: { width: 8, height: 8, borderRadius: 4 },
  insight: { backgroundColor: '#F1FCF6', flexDirection: 'row', gap: 12 }, insightIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' }, insightCopy: { flex: 1 }, insightTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900', marginVertical: 5 },
  lockedReward: { alignItems: 'center', paddingVertical: 35, gap: 12 }, lockCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEE9DA', alignItems: 'center', justifyContent: 'center' }, lockIcon: { fontSize: 28 }, lockedBody: { textAlign: 'center', maxWidth: 330, marginBottom: 4 }, possibleTitle: { marginTop: 12 },
  voucher: { borderColor: '#50B983' }, voucherTop: { flexDirection: 'row', justifyContent: 'space-between' }, voucherTitle: { color: Palette.ink, fontSize: 25, fontWeight: '900', marginTop: 7 }, voucherDetail: { color: Palette.inkSoft, marginTop: 4 }, voucherValue: { color: Palette.ink, fontSize: 32, fontWeight: '900' }, codeBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, marginTop: 25, padding: 15 }, codeLabel: { color: Palette.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, code: { color: Palette.ink, fontSize: 21, fontWeight: '900', letterSpacing: 2, marginTop: 5 }, expiry: { color: Palette.inkSoft, fontSize: 9, marginTop: 13 },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }, rowDivider: { borderBottomWidth: 1, borderBottomColor: Palette.line }, prizeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, prizeValue: { color: Palette.ink, fontWeight: '900' }, prizeCopy: { flex: 1 }, prizeTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900' }, odds: { color: Palette.mintDark, fontSize: 13, fontWeight: '900' }, oddsNote: { color: Palette.inkSoft, fontSize: 10, lineHeight: 15, paddingHorizontal: 7 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(9,37,34,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 }, modalCard: { width: '100%', maxWidth: 430, alignItems: 'center', padding: 30 }, confetti: { color: Palette.coral, fontSize: 25, letterSpacing: 10 }, gift: { width: 90, height: 90, borderRadius: 30, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center', marginVertical: 18, transform: [{ rotate: '4deg' }] }, giftIcon: { color: Palette.ink, fontSize: 38, fontWeight: '900' }, modalTitle: { textAlign: 'center', marginTop: 8 }, modalBody: { textAlign: 'center', marginVertical: 12 }, full: { width: '100%', marginTop: 8 },
});
