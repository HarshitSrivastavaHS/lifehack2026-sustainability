import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { Brand, Button, Pill } from '@/components/ui/app-ui';
import { Palette } from '@/constants/theme';
import { rewardProgress } from '@/core/mvp/rules';
import { eligibilityCutoff, hallTierForRank, isShowcaseEligible, showcaseRankForEmail, showcaseStudent, type ShowcaseTab } from '@/features/student/nus-showcase-data';
import { HallsShowcase, HomeCompetitionCard, JourneyShowcase, ShowcaseNav } from '@/features/student/nus-showcase';
import { type MvpReward, type SavingsHistoryPoint, useApp } from '@/state/app-context';

export function StudentApp() {
  const { profile, studentHome, studentPointGain, loading, error, logout, refresh, redeemReward } = useApp();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('home');
  const { width } = useWindowDimensions();
  const compact = width < 560;

  useEffect(() => {
    const interval = setInterval(() => { void refresh(true); }, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!studentHome) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><View style={styles.loadingBolt}><Text style={styles.loadingBoltText}>↯</Text></View><Text style={styles.loadingTitle}>{loading ? 'Loading your progress…' : 'Progress unavailable'}</Text>{error && <Text style={styles.errorText}>{error}</Text>}{!loading && <Button onPress={() => { void refresh(); }} variant="secondary">Try again</Button>}</View></SafeAreaView>;
  }

  const progress = rewardProgress(studentHome.universityPoints, studentHome.nextReward?.pointsRequired ?? null);
  const accent = progress.percentage >= 85 ? Palette.lime : Palette.mint;
  const kwhToUnlock = progress.remaining / 10;
  const rewards = sortRewards(studentHome.rewards, studentHome.nextReward?.id);
  const unlockedReward = rewards.find((reward) => reward.state === 'unlocked');
  const showcaseRank = showcaseRankForEmail(profile?.email);
  const showcaseTier = hallTierForRank(2);
  const showcaseEligible = isShowcaseEligible(showcaseRank, showcaseStudent.contributorCount, showcaseTier.eligiblePercent);

  const redeem = async (reward: MvpReward) => {
    setRedeeming(reward.id);
    setNotice(null);
    const result = await redeemReward(reward.id);
    setRedeeming(null);
    if (result.error) {
      setNotice({ tone: 'error', text: result.error });
      return;
    }
    setCelebration(reward.name);
    setTimeout(() => setCelebration(null), 2200);
  };

  return <SafeAreaView style={styles.safe}>
    <ScrollView
      contentContainerStyle={[styles.page, compact && styles.pageCompact]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refresh(); }} tintColor={Palette.mintDark} />}>
      <View style={styles.header}>
        <Brand />
        <View style={styles.headerRight}>
          {!compact && <View><Text style={styles.greeting}>Hi, {profile?.name.split(' ')[0]}</Text><Text style={styles.campus}>{studentHome.universityName}</Text></View>}
          <Button onPress={logout} variant="ghost" style={styles.signOut}>Sign out</Button>
        </View>
      </View>

      <ShowcaseNav active={activeTab} onChange={setActiveTab} />

      {celebration && <Celebration reward={celebration} />}
      {studentPointGain && <PointGain points={studentPointGain} unlocked={Boolean(unlockedReward)} />}
      {notice && <View style={[styles.notice, notice.tone === 'error' && styles.noticeError]}><Text style={styles.noticeText}>{notice.text}</Text></View>}
      {error && <View style={[styles.notice, styles.noticeError]}><Text style={styles.noticeText}>{error}</Text></View>}

      {activeTab === 'home' ? <>
        {unlockedReward ? <UnlockedStage
        reward={unlockedReward}
        contributorRank={showcaseRank}
        eligible={showcaseEligible}
        busy={redeeming === unlockedReward.id}
        onRedeem={() => redeem(unlockedReward)}
      /> : <ProgressStage
        points={studentHome.universityPoints}
        target={studentHome.nextReward?.pointsRequired ?? null}
        nextReward={studentHome.nextReward?.name ?? null}
        remaining={progress.remaining}
        kwhToUnlock={kwhToUnlock}
        ratio={progress.ratio}
        percentage={progress.percentage}
        accent={accent}
        />}

        <View style={[styles.personalStrip, compact && styles.personalStripCompact]}>
          <View style={[styles.personalIntro, compact && styles.personalIntroCompact]}><Text style={styles.kicker}>YOUR IMPACT</Text><Text style={styles.personalTitle}>You’re moving the grid.</Text></View>
          <View style={[styles.personalStat, compact && styles.personalStatCompact]}><Text style={styles.personalValue}><AnimatedNumber value={studentHome.personalPoints} /></Text><Text style={styles.personalLabel}>points earned</Text></View>
          <View style={styles.stripDivider} />
          <View style={[styles.personalStat, compact && styles.personalStatCompact]}><Text style={styles.personalValue}>{formatNumber(studentHome.personalKwh)}</Text><Text style={styles.personalLabel}>kWh saved</Text></View>
        </View>

        <HomeCompetitionCard rewardUnlocked={Boolean(unlockedReward)} contributorRank={showcaseRank} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Rewards</Text><Text style={styles.sectionMeta}>{studentHome.rewards.filter((reward) => reward.state === 'unlocked').length} ready to redeem</Text></View><View style={styles.spark}><Text style={styles.sparkText}>✦</Text></View></View>
          <View style={styles.rewardList}>{rewards.map((reward, index) => <RewardRow
            key={reward.id}
            reward={reward}
            index={index}
            currentPoints={studentHome.universityPoints}
            isNext={reward.id === studentHome.nextReward?.id}
            eligible={showcaseEligible}
            busy={redeeming === reward.id}
            onRedeem={() => redeem(reward)}
          />)}</View>
        </View>

        <SavingsChart history={studentHome.savingsHistory} totalKwh={studentHome.personalKwh} />

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Redemption history</Text>
          {studentHome.redemptions.length === 0 ? <Text style={styles.historyEmpty}>Nothing redeemed yet.</Text> : studentHome.redemptions.map((item, index) => <View key={item.id} style={[styles.historyRow, index > 0 && styles.historyBorder]}><View style={styles.historyCheck}><Text style={styles.historyCheckText}>✓</Text></View><View style={styles.historyCopy}><Text style={styles.historyName}>{item.rewardName}</Text><Text style={styles.historyDate}>{formatDate(item.redeemedAt)}</Text></View><Text style={styles.historyStatus}>Redeemed</Text></View>)}
        </View>
      </> : activeTab === 'halls' ? <HallsShowcase compact={compact} /> : <JourneyShowcase compact={compact} contributorRank={showcaseRank} />}
    </ScrollView>
  </SafeAreaView>;
}

function UnlockedStage({ reward, contributorRank, eligible, busy, onRedeem }: { reward: MvpReward; contributorRank: number; eligible: boolean; busy: boolean; onRedeem: () => void }) {
  const entrance = useEntrance(0);
  const tier = hallTierForRank(2);
  const cutoff = eligibilityCutoff(showcaseStudent.contributorCount, tier.eligiblePercent);
  return <Animated.View style={[styles.unlockedStage, entrance]}>
    <View style={styles.unlockHaloOne} /><View style={styles.unlockHaloTwo} />
    <View style={styles.unlockTop}><Text style={styles.unlockKicker}>MILESTONE REACHED</Text><View style={styles.unlockBadge}><Text style={styles.unlockBadgeText}>100%</Text></View></View>
    <View style={styles.unlockGlyph}><Text style={styles.unlockGlyphText}>✦</Text></View>
    <Text style={styles.unlockTitle}>Reward unlocked</Text>
    <Text style={styles.unlockReward}>{reward.name}</Text>
    <Text style={styles.unlockPoints}>{reward.pointsRequired.toLocaleString()} / {reward.pointsRequired.toLocaleString()} pts</Text>
    <View style={styles.unlockEligibility}>
      <View style={[styles.unlockEligibilityBadge, !eligible && styles.unlockEligibilityBadgeMissed]}><Text style={styles.unlockEligibilityBadgeText}>{eligible ? '✓' : '↑'}</Text></View>
      <View style={styles.unlockEligibilityCopy}><Text style={styles.unlockEligibilityTitle}>{tier.tier} reward · {eligible ? 'You qualify' : 'Cutoff not reached'}</Text><Text style={styles.unlockEligibilityMeta}>Kent Ridge finished 2nd · rank #{contributorRank} · top {cutoff} qualify</Text></View>
    </View>
    <View style={styles.unlockProgress}><AnimatedProgress value={1} color={Palette.lime} /></View>
    {eligible ? <Button onPress={onRedeem} disabled={busy} style={styles.unlockButton}>{busy ? 'Redeeming…' : 'Redeem reward'}</Button> : <View style={styles.unlockUnavailable}><Text style={styles.unlockUnavailableText}>Reward reserved for qualifying contributors</Text></View>}
  </Animated.View>;
}

function PointGain({ points, unlocked }: { points: number; unlocked: boolean }) {
  const entrance = useEntrance(0);
  return <Animated.View style={[styles.pointGain, unlocked && styles.pointGainUnlocked, entrance]}>
    <View style={styles.pointGainIcon}><Text style={styles.pointGainSpark}>↯</Text></View>
    <View style={styles.pointGainCopy}><Text style={styles.pointGainValue}>+{points.toLocaleString()} pts</Text><Text style={styles.pointGainLabel}>{unlocked ? 'University goal reached' : 'University progress updated'}</Text></View>
  </Animated.View>;
}

function ProgressStage({ points, target, nextReward, remaining, kwhToUnlock, ratio, percentage, accent }: {
  points: number;
  target: number | null;
  nextReward: string | null;
  remaining: number;
  kwhToUnlock: number;
  ratio: number;
  percentage: number;
  accent: string;
}) {
  const entrance = useEntrance(0);
  return <Animated.View style={[styles.stage, entrance]}>
    <View style={styles.stageOrbOne} /><View style={styles.stageOrbTwo} />
    <View style={styles.stageTop}><View><Text style={styles.stageKicker}>UNIVERSITY PROGRESS</Text><Text style={styles.stageSub}>Every saving counts.</Text></View><View style={styles.percentChip}><Text style={[styles.percentText, { color: accent }]}>{percentage}%</Text></View></View>
    {target ? <>
      <View style={styles.pointLine}><Text style={styles.heroPoints}><AnimatedNumber value={points} /></Text><Text style={styles.heroUnit}> pts</Text><Text style={styles.heroTarget}> / {target.toLocaleString()}</Text></View>
      <AnimatedProgress value={ratio} color={accent} />
      <View style={styles.finishLine}><View style={[styles.finishDot, { backgroundColor: accent }]}><Text style={styles.finishIcon}>✦</Text></View></View>
      <View style={styles.stageBottom}>
        <View style={styles.nextCopy}><Text style={styles.nextLabel}>NEXT REWARD</Text><Text style={styles.nextName}>{nextReward}</Text></View>
        <View style={[styles.remainingChip, { borderColor: `${accent}66` }]}><Text style={[styles.remainingStrong, { color: accent }]}>{remaining.toLocaleString()} pts</Text><Text style={styles.remainingSmall}>to unlock</Text></View>
      </View>
      <View style={styles.actionHint}><Text style={styles.actionHintBolt}>↯</Text><Text style={styles.actionHintText}><Text style={styles.actionHintStrong}>{formatNumber(kwhToUnlock)} kWh</Text> from the finish</Text></View>
    </> : <View style={styles.completeStage}><Text style={styles.completeIcon}>✦</Text><Text style={styles.completeTitle}>Every reward unlocked</Text><Text style={styles.completeBody}>{points.toLocaleString()} university points</Text></View>}
  </Animated.View>;
}

function AnimatedProgress({ value, color }: { value: number; color: string }) {
  const [animation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(animation, { toValue: Math.max(0, Math.min(value, 1)), duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [animation, value]);
  const width = animation.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={styles.progressTrack}><Animated.View style={[styles.progressFill, { backgroundColor: color, width }]}><View style={styles.progressShine} /></Animated.View></View>;
}

function AnimatedNumber({ value }: { value: number }) {
  const [animation] = useState(() => new Animated.Value(0));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const listener = animation.addListener(({ value: next }) => setDisplay(Math.round(next)));
    Animated.timing(animation, { toValue: value, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => animation.removeListener(listener);
  }, [animation, value]);
  return <>{display.toLocaleString()}</>;
}

function SavingsChart({ history, totalKwh }: { history: SavingsHistoryPoint[]; totalKwh: number }) {
  const [width, setWidth] = useState(0);
  const chart = useMemo(() => cumulativeSeries(history, totalKwh), [history, totalKwh]);
  const entrance = useEntrance(120);
  const height = 142;
  const inset = 8;
  const plotWidth = Math.max(width - inset * 2, 1);
  const min = Math.min(...chart.values, 0);
  const max = Math.max(...chart.values, 1);
  const range = Math.max(max - min, 1);
  const points = chart.values.map((value, index) => ({
    x: inset + (plotWidth * index) / Math.max(chart.values.length - 1, 1),
    y: 12 + (height - 30) * (1 - (value - min) / range),
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points.at(-1)?.x ?? inset} ${height} L ${inset} ${height} Z`;
  const last = points.at(-1) ?? { x: inset, y: height };
  return <Animated.View style={[styles.chartCard, entrance]}>
    <View style={styles.chartHeader}><View><Text style={styles.chartTitle}>Savings progress</Text><Text style={styles.chartMeta}>Last 14 days</Text></View><View style={styles.chartTotal}><Text style={styles.chartTotalValue}>{formatNumber(totalKwh)}</Text><Text style={styles.chartTotalUnit}> kWh</Text></View></View>
    <View style={styles.chart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && <Svg width={width} height={height}>
        <Defs><SvgGradient id="energyArea" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={Palette.mint} stopOpacity="0.42" /><Stop offset="1" stopColor={Palette.mint} stopOpacity="0.02" /></SvgGradient></Defs>
        <Path d={`M ${inset} ${height} L ${width - inset} ${height}`} stroke={Palette.line} strokeWidth="1" />
        <Path d={area} fill="url(#energyArea)" />
        <Path d={line} fill="none" stroke={Palette.mintDark} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={last.x} cy={last.y} r="6" fill={Palette.paper} stroke={Palette.mintDark} strokeWidth="3" />
      </Svg>}
    </View>
    <View style={styles.chartLabels}><Text style={styles.chartLabel}>{chart.labels[0]}</Text><Text style={styles.chartLabel}>{chart.labels[1]}</Text><Text style={styles.chartLabel}>Today</Text></View>
  </Animated.View>;
}

function RewardRow({ reward, index, currentPoints, isNext, eligible, busy, onRedeem }: { reward: MvpReward; index: number; currentPoints: number; isNext: boolean; eligible: boolean; busy: boolean; onRedeem: () => void }) {
  const entrance = useEntrance(170 + index * 45);
  const progress = rewardProgress(currentPoints, reward.pointsRequired);
  const unlocked = reward.state === 'unlocked';
  const redeemed = reward.state === 'redeemed';
  return <Animated.View style={[styles.rewardRow, unlocked && styles.rewardUnlocked, isNext && styles.rewardNext, redeemed && styles.rewardRedeemed, entrance]}>
    {unlocked && <View style={styles.rewardGlow} />}
    <View style={[styles.rewardGlyph, unlocked && styles.rewardGlyphUnlocked, isNext && styles.rewardGlyphNext, redeemed && styles.rewardGlyphRedeemed]}><Text style={styles.rewardGlyphText}>{redeemed ? '✓' : unlocked ? '✦' : '◇'}</Text></View>
    <View style={styles.rewardBody}>
      <View style={styles.rewardTitleLine}><Text style={styles.rewardName}>{reward.name}</Text>{isNext && <Pill tone="amber">Next</Pill>}{unlocked && <Pill tone="lime">Unlocked</Pill>}</View>
      <Text numberOfLines={2} style={styles.rewardDescription}>{reward.description}</Text>
      {isNext && <View style={styles.rewardMiniProgress}><View style={[styles.rewardMiniFill, { width: `${progress.percentage}%` }]} /></View>}
      <Text style={[styles.rewardRequirement, unlocked && styles.rewardRequirementUnlocked]}>{redeemed ? `Redeemed ${formatDate(reward.redeemedAt ?? '')}` : unlocked ? 'Ready now' : isNext ? `${progress.remaining.toLocaleString()} pts away` : `${reward.pointsRequired.toLocaleString()} pts`}</Text>
    </View>
    {unlocked && eligible ? <Button onPress={onRedeem} disabled={busy} style={styles.redeemButton}>{busy ? '…' : 'Redeem'}</Button> : <View style={styles.rewardState}><Text style={styles.rewardStateText}>{redeemed ? 'Claimed' : unlocked ? 'Not eligible' : 'Locked'}</Text></View>}
  </Animated.View>;
}

function Celebration({ reward }: { reward: string }) {
  const [scale] = useState(() => new Animated.Value(.88));
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);
  return <Animated.View style={[styles.celebration, { opacity, transform: [{ scale }] }]}><View style={styles.celebrationIcon}><Text style={styles.celebrationSpark}>✦</Text></View><View style={styles.celebrationCopy}><Text style={styles.celebrationTitle}>Reward redeemed</Text><Text style={styles.celebrationName}>{reward}</Text></View></Animated.View>;
}

function useEntrance(delay: number) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(10));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 340, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);
  return { opacity, transform: [{ translateY }] };
}

function cumulativeSeries(history: SavingsHistoryPoint[], totalKwh: number) {
  const days = 14;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const daily = new Map<string, number>();
  history.forEach((item) => {
    const date = new Date(item.createdAt);
    const key = localDateKey(date);
    daily.set(key, (daily.get(key) ?? 0) + item.kwhSaved);
  });
  const windowTotal = [...daily.values()].reduce((sum, value) => sum + value, 0);
  let running = Math.max(totalKwh - windowTotal, 0);
  const values: number[] = [];
  const dates: Date[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    running += daily.get(localDateKey(date)) ?? 0;
    values.push(Number(running.toFixed(2)));
    dates.push(date);
  }
  return {
    values,
    labels: [dates[0], dates[Math.floor(days / 2)]].map((date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
  };
}

function sortRewards(rewards: MvpReward[], nextId?: string) {
  const weight = (reward: MvpReward) => reward.state === 'unlocked' ? 0 : reward.id === nextId ? 1 : reward.state === 'locked' ? 2 : 3;
  return [...rewards].sort((a, b) => weight(a) - weight(b) || a.pointsRequired - b.pointsRequired);
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 2 });
}

function formatDate(value: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F2' },
  page: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 70, gap: 20 },
  pageCompact: { paddingHorizontal: 16, paddingTop: 10, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingBolt: { width: 58, height: 58, borderRadius: 19, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  loadingBoltText: { color: Palette.ink, fontSize: 30, fontWeight: '900' },
  loadingTitle: { color: Palette.ink, fontSize: 19, fontWeight: '900' },
  errorText: { color: Palette.danger, textAlign: 'center', fontSize: 12 },
  header: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: { color: Palette.ink, fontSize: 12, fontWeight: '900', textAlign: 'right' },
  campus: { color: Palette.inkMuted, fontSize: 9, marginTop: 2, textAlign: 'right' },
  signOut: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 9 },
  notice: { backgroundColor: '#DDF8ED', borderRadius: 13, padding: 11, borderWidth: 1, borderColor: '#A9E5CF' },
  noticeError: { backgroundColor: '#FFE9E6', borderColor: '#F1B8B0' },
  noticeText: { color: Palette.ink, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  pointGain: { flexDirection: 'row', alignItems: 'center', gap: 11, alignSelf: 'center', minWidth: 218, backgroundColor: '#0E3543', borderWidth: 1, borderColor: '#2C5660', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, shadowColor: Palette.shadow, shadowOpacity: .16, shadowRadius: 14 },
  pointGainUnlocked: { backgroundColor: '#24451D', borderColor: '#6E9A45' },
  pointGainIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' },
  pointGainSpark: { color: Palette.ink, fontSize: 20, fontWeight: '900' },
  pointGainCopy: { flex: 1 },
  pointGainValue: { color: Palette.paper, fontSize: 16, fontWeight: '900', letterSpacing: -.3 },
  pointGainLabel: { color: '#B8CECA', fontSize: 9, fontWeight: '800', marginTop: 2 },
  stage: { position: 'relative', overflow: 'hidden', backgroundColor: '#0A2535', minHeight: 420, borderRadius: 30, padding: 24, shadowColor: '#041D29', shadowOffset: { width: 0, height: 16 }, shadowOpacity: .2, shadowRadius: 28 },
  stageOrbOne: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: '#153F4A', right: -86, top: -92 },
  stageOrbTwo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 30, borderColor: '#103847', left: -80, bottom: -68 },
  stageTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 15 },
  stageKicker: { color: Palette.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  stageSub: { color: '#9BB4B5', fontSize: 11, fontWeight: '700', marginTop: 5 },
  percentChip: { minWidth: 57, height: 38, paddingHorizontal: 11, borderRadius: 19, backgroundColor: '#123B4B', alignItems: 'center', justifyContent: 'center' },
  percentText: { fontSize: 15, fontWeight: '900' },
  pointLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 34, marginBottom: 19 },
  heroPoints: { color: Palette.paper, fontSize: 64, lineHeight: 67, fontWeight: '900', letterSpacing: -3 },
  heroUnit: { color: Palette.paper, fontSize: 22, fontWeight: '900' },
  heroTarget: { color: '#78969D', fontSize: 14, fontWeight: '800', marginLeft: 4 },
  progressTrack: { height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: '#193D49', borderWidth: 1, borderColor: '#294C56' },
  progressFill: { height: 16, borderRadius: 8, overflow: 'hidden' },
  progressShine: { height: 5, marginTop: 2, marginHorizontal: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.3)' },
  finishLine: { alignItems: 'flex-end', marginTop: -27, marginRight: -2 },
  finishDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#0A2535' },
  finishIcon: { color: Palette.ink, fontSize: 15, fontWeight: '900' },
  stageBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 15, marginTop: 28 },
  nextCopy: { flex: 1 },
  nextLabel: { color: '#8BA4A9', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  nextName: { color: Palette.paper, fontSize: 22, lineHeight: 27, fontWeight: '900', letterSpacing: -.6, marginTop: 5 },
  remainingChip: { borderWidth: 1, backgroundColor: '#113543', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, alignItems: 'flex-end' },
  remainingStrong: { fontSize: 13, fontWeight: '900' },
  remainingSmall: { color: '#93ADB0', fontSize: 8, fontWeight: '800', marginTop: 1 },
  actionHint: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#113543', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, marginTop: 20 },
  actionHintBolt: { color: Palette.lime, fontSize: 15, fontWeight: '900' },
  actionHintText: { color: '#A7BDBD', fontSize: 10, fontWeight: '700' },
  actionHintStrong: { color: Palette.paper, fontWeight: '900' },
  completeStage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  completeIcon: { color: Palette.lime, fontSize: 42 }, completeTitle: { color: Palette.paper, fontSize: 25, fontWeight: '900' }, completeBody: { color: '#9BB4B5', fontSize: 12 },
  unlockedStage: { position: 'relative', overflow: 'hidden', minHeight: 420, alignItems: 'center', backgroundColor: '#102F30', borderRadius: 30, padding: 24, shadowColor: '#173D25', shadowOffset: { width: 0, height: 18 }, shadowOpacity: .26, shadowRadius: 30, borderWidth: 1, borderColor: '#477344' },
  unlockHaloOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#315B31', opacity: .52, top: -130, right: -90 },
  unlockHaloTwo: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 35, borderColor: '#224C38', opacity: .7, bottom: -145, left: -105 },
  unlockTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unlockKicker: { color: Palette.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  unlockBadge: { backgroundColor: Palette.lime, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  unlockBadgeText: { color: Palette.ink, fontSize: 13, fontWeight: '900' },
  unlockGlyph: { width: 72, height: 72, borderRadius: 25, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center', marginTop: 23, borderWidth: 5, borderColor: '#B9E95C', shadowColor: Palette.lime, shadowOpacity: .42, shadowRadius: 22 },
  unlockGlyphText: { color: Palette.ink, fontSize: 34, fontWeight: '900' },
  unlockTitle: { color: '#ADD0BD', fontSize: 11, fontWeight: '900', letterSpacing: .7, textTransform: 'uppercase', marginTop: 15 },
  unlockReward: { color: Palette.paper, fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -.9, textAlign: 'center', marginTop: 5 },
  unlockPoints: { color: Palette.lime, fontSize: 12, fontWeight: '900', marginTop: 8, marginBottom: 14 },
  unlockEligibility: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1B4939', borderWidth: 1, borderColor: '#4F7756', borderRadius: 15, padding: 11, marginBottom: 17 },
  unlockEligibilityBadge: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.lime },
  unlockEligibilityBadgeMissed: { backgroundColor: '#91A89B' },
  unlockEligibilityBadgeText: { color: Palette.ink, fontSize: 16, fontWeight: '900' },
  unlockEligibilityCopy: { flex: 1 },
  unlockEligibilityTitle: { color: Palette.paper, fontSize: 10, fontWeight: '900' },
  unlockEligibilityMeta: { color: '#A9C5B8', fontSize: 8, fontWeight: '700', marginTop: 3 },
  unlockProgress: { width: '100%' },
  unlockButton: { width: '100%', marginTop: 24, minHeight: 54 },
  unlockUnavailable: { width: '100%', minHeight: 50, marginTop: 24, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#29483E', borderWidth: 1, borderColor: '#426357' },
  unlockUnavailableText: { color: '#B7CBC1', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  personalStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.paper, borderLeftWidth: 4, borderLeftColor: Palette.mintDark, paddingHorizontal: 18, paddingVertical: 17, shadowColor: Palette.shadow, shadowOpacity: .05, shadowRadius: 14 },
  personalStripCompact: { flexWrap: 'wrap' },
  personalIntro: { flex: 1.3, minWidth: 110 },
  personalIntroCompact: { flexBasis: '100%', marginBottom: 15 },
  kicker: { color: Palette.mintDark, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  personalTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
  personalStat: { alignItems: 'flex-end', minWidth: 76 },
  personalStatCompact: { flex: 1, alignItems: 'flex-start' },
  personalValue: { color: Palette.ink, fontSize: 22, fontWeight: '900', letterSpacing: -.5 },
  personalLabel: { color: Palette.inkMuted, fontSize: 8, fontWeight: '800', marginTop: 2 },
  stripDivider: { width: 1, height: 38, backgroundColor: Palette.line, marginHorizontal: 14 },
  chartCard: { backgroundColor: Palette.paper, borderWidth: 1, borderColor: '#DDE7E1', borderRadius: 23, padding: 18, shadowColor: Palette.shadow, shadowOpacity: .05, shadowRadius: 18 },
  chartHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  chartTitle: { color: Palette.ink, fontSize: 17, fontWeight: '900', letterSpacing: -.3 },
  chartMeta: { color: Palette.inkMuted, fontSize: 9, fontWeight: '800', marginTop: 3 },
  chartTotal: { flexDirection: 'row', alignItems: 'baseline' },
  chartTotalValue: { color: Palette.mintDark, fontSize: 22, fontWeight: '900' },
  chartTotalUnit: { color: Palette.inkSoft, fontSize: 10, fontWeight: '800' },
  chart: { height: 142, marginTop: 6 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  chartLabel: { color: Palette.inkMuted, fontSize: 8, fontWeight: '700' },
  section: { marginTop: 5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: Palette.ink, fontSize: 24, fontWeight: '900', letterSpacing: -.7 },
  sectionMeta: { color: Palette.inkMuted, fontSize: 9, fontWeight: '800', marginTop: 3 },
  spark: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFF0C9', alignItems: 'center', justifyContent: 'center' },
  sparkText: { color: '#8A5B00', fontSize: 18, fontWeight: '900' },
  rewardList: { backgroundColor: Palette.paper, borderRadius: 24, borderWidth: 1, borderColor: '#DDE7E1', overflow: 'hidden' },
  rewardRow: { minHeight: 122, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderBottomWidth: 1, borderBottomColor: '#E7EEE9', backgroundColor: Palette.paper, overflow: 'hidden' },
  rewardUnlocked: { backgroundColor: '#F5FFE5', borderBottomColor: '#D9ECAA' },
  rewardNext: { backgroundColor: '#FFF9E9' },
  rewardRedeemed: { backgroundColor: '#F5F7F5' },
  rewardGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#DFFB83', opacity: .35, left: -46, top: -45 },
  rewardGlyph: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EDF1EE', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDE5E0' },
  rewardGlyphUnlocked: { backgroundColor: Palette.lime, borderColor: '#9FD22E', shadowColor: Palette.limeDark, shadowOpacity: .25, shadowRadius: 10 },
  rewardGlyphNext: { backgroundColor: Palette.amber, borderColor: '#EBAE34' },
  rewardGlyphRedeemed: { backgroundColor: '#DCE8E3', borderColor: '#C9DAD3' },
  rewardGlyphText: { color: Palette.ink, fontSize: 21, fontWeight: '900' },
  rewardBody: { flex: 1 },
  rewardTitleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  rewardName: { color: Palette.ink, fontSize: 14, fontWeight: '900' },
  rewardDescription: { color: Palette.inkSoft, fontSize: 10, lineHeight: 15, marginTop: 4 },
  rewardRequirement: { color: Palette.inkMuted, fontSize: 9, fontWeight: '900', marginTop: 7 },
  rewardRequirementUnlocked: { color: Palette.mintDark },
  rewardMiniProgress: { height: 4, borderRadius: 2, backgroundColor: '#E8E2D1', overflow: 'hidden', marginTop: 9 },
  rewardMiniFill: { height: 4, borderRadius: 2, backgroundColor: Palette.amber },
  rewardState: { minWidth: 54, alignItems: 'flex-end' },
  rewardStateText: { color: Palette.inkMuted, fontSize: 9, fontWeight: '900' },
  redeemButton: { minHeight: 42, paddingHorizontal: 13, paddingVertical: 9 },
  historySection: { paddingHorizontal: 3, marginTop: 3 },
  historyTitle: { color: Palette.ink, fontSize: 15, fontWeight: '900', marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  historyBorder: { borderTopWidth: 1, borderTopColor: Palette.line },
  historyCheck: { width: 31, height: 31, borderRadius: 11, backgroundColor: '#DCEBE5', alignItems: 'center', justifyContent: 'center' },
  historyCheckText: { color: Palette.success, fontSize: 14, fontWeight: '900' },
  historyCopy: { flex: 1 },
  historyName: { color: Palette.ink, fontSize: 11, fontWeight: '900' },
  historyDate: { color: Palette.inkMuted, fontSize: 9, marginTop: 2 },
  historyStatus: { color: Palette.success, fontSize: 9, fontWeight: '900' },
  historyEmpty: { color: Palette.inkMuted, fontSize: 10, paddingVertical: 12 },
  celebration: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E9FFC0', borderWidth: 1, borderColor: '#BCE65D', borderRadius: 18, padding: 13, shadowColor: Palette.limeDark, shadowOpacity: .15, shadowRadius: 14 },
  celebrationIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' },
  celebrationSpark: { color: Palette.ink, fontSize: 19, fontWeight: '900' },
  celebrationCopy: { flex: 1 },
  celebrationTitle: { color: Palette.ink, fontSize: 12, fontWeight: '900' },
  celebrationName: { color: Palette.mintDark, fontSize: 10, fontWeight: '800', marginTop: 2 },
});
