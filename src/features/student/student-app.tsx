import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Button, Card, EmptyState, Eyebrow, Pill, ProgressBar, SectionHeader } from '@/components/ui/app-ui';
import { Palette } from '@/constants/theme';
import { rewardProgress } from '@/core/mvp/rules';
import { type MvpReward, useApp } from '@/state/app-context';

export function StudentApp() {
  const { profile, studentHome, loading, error, logout, refresh, redeemReward } = useApp();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { width } = useWindowDimensions();

  if (!studentHome) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingTitle}>{loading ? 'Loading your impact…' : 'Your impact is unavailable'}</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {!loading && <Button onPress={refresh} variant="secondary">Try again</Button>}
        </View>
      </SafeAreaView>
    );
  }

  const progress = rewardProgress(studentHome.universityPoints, studentHome.nextReward?.pointsRequired ?? null);
  const unlocked = studentHome.rewards.filter((reward) => reward.state === 'unlocked');
  const locked = studentHome.rewards.filter((reward) => reward.state === 'locked');
  const redeemed = studentHome.rewards.filter((reward) => reward.state === 'redeemed');

  const redeem = async (reward: MvpReward) => {
    setRedeeming(reward.id);
    setNotice(null);
    const result = await redeemReward(reward.id);
    setRedeeming(null);
    setNotice(result.error ? { tone: 'error', text: result.error } : { tone: 'success', text: `${reward.name} redeemed.` });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Palette.mintDark} />}>
        <View style={styles.header}>
          <Brand />
          <View style={styles.headerRight}>
            {width >= 540 && <View style={styles.nameBlock}><Text style={styles.hello}>Hi, {profile?.name.split(' ')[0]}</Text><Text style={styles.university}>{studentHome.universityName}</Text></View>}
            <Button onPress={logout} variant="ghost" style={styles.signOut}>Sign out</Button>
          </View>
        </View>

        {notice && <View style={[styles.notice, notice.tone === 'error' && styles.noticeError]}><Text style={styles.noticeText}>{notice.text}</Text></View>}
        {error && <View style={[styles.notice, styles.noticeError]}><Text style={styles.noticeText}>{error}</Text></View>}

        <View style={styles.heroGrid}>
          <Card style={styles.personalCard}>
            <Eyebrow>YOUR IMPACT</Eyebrow>
            <View style={styles.personalMain}>
              <View><Text style={styles.bigNumber}>{formatNumber(studentHome.personalKwh)}</Text><Text style={styles.bigUnit}>kWh saved</Text></View>
              <View style={styles.divider} />
              <View><Text style={styles.bigNumber}>{studentHome.personalPoints.toLocaleString()}</Text><Text style={styles.bigUnit}>points earned</Text></View>
            </View>
            <Text style={styles.contribution}>Every kilowatt-hour moves the whole university forward.</Text>
          </Card>

          <Card style={styles.universityCard}>
            <View style={styles.universityTop}>
              <View><Eyebrow style={styles.mintEyebrow}>UNIVERSITY IMPACT</Eyebrow><Text style={styles.universityKwh}>{formatNumber(studentHome.universityKwh)} kWh saved together</Text></View>
              <View style={styles.percentBadge}><Text style={styles.percent}>{progress.percentage}%</Text></View>
            </View>
            {studentHome.nextReward ? <>
              <View style={styles.pointsRow}><Text style={styles.pointsCurrent}>{studentHome.universityPoints.toLocaleString()}</Text><Text style={styles.pointsTarget}> / {studentHome.nextReward.pointsRequired.toLocaleString()} points</Text></View>
              <ProgressBar value={progress.ratio} color={Palette.lime} height={14} />
              <View style={styles.milestoneRow}>
                <View><Text style={styles.nextLabel}>NEXT REWARD</Text><Text style={styles.nextReward}>{studentHome.nextReward.name}</Text></View>
                <Text style={styles.remaining}>{progress.remaining.toLocaleString()} points to go</Text>
              </View>
            </> : <View style={styles.allUnlocked}><Text style={styles.allUnlockedTitle}>All rewards unlocked</Text><Text style={styles.darkMuted}>The university reached every active milestone.</Text></View>}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Rewards" subtitle="Unlocked for every active student when the university reaches each milestone." />
          {unlocked.length > 0 && <RewardGroup title="READY TO REDEEM" rewards={unlocked} onRedeem={redeem} redeeming={redeeming} />}
          {locked.length > 0 && <RewardGroup title="UPCOMING" rewards={locked} />}
          {redeemed.length > 0 && <RewardGroup title="REDEEMED" rewards={redeemed} />}
          {studentHome.rewards.length === 0 && <EmptyState icon="↯" title="No rewards yet" body="University rewards will appear here." />}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Redemption history" />
          <Card style={styles.historyCard}>
            {studentHome.redemptions.length === 0 ? <Text style={styles.historyEmpty}>Redeemed rewards will appear here.</Text> : studentHome.redemptions.map((item, index) => (
              <View key={item.id} style={[styles.historyRow, index < studentHome.redemptions.length - 1 && styles.historyBorder]}>
                <View style={styles.historyIcon}><Text style={styles.check}>✓</Text></View>
                <View style={styles.historyCopy}><Text style={styles.historyName}>{item.rewardName}</Text><Text style={styles.historyDate}>{formatDate(item.redeemedAt)}</Text></View>
                <Pill tone="mint">Redeemed</Pill>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardGroup({ title, rewards, onRedeem, redeeming }: {
  title: string;
  rewards: MvpReward[];
  onRedeem?: (reward: MvpReward) => void;
  redeeming?: string | null;
}) {
  return <View style={styles.rewardGroup}><Text style={styles.groupLabel}>{title}</Text><View style={styles.rewardGrid}>{rewards.map((reward) => (
    <Card key={reward.id} style={[styles.rewardCard, reward.state === 'locked' && styles.lockedCard]}>
      <View style={[styles.rewardIcon, reward.state === 'locked' && styles.lockedIcon]}><Text style={styles.rewardIconText}>{reward.state === 'locked' ? '◇' : '✦'}</Text></View>
      <View style={styles.rewardCopy}>
        <Text style={styles.rewardName}>{reward.name}</Text>
        <Text style={styles.rewardDescription}>{reward.description}</Text>
        <Text style={styles.rewardThreshold}>{reward.pointsRequired.toLocaleString()} university points</Text>
      </View>
      {reward.state === 'unlocked' && onRedeem ? <Button onPress={() => onRedeem(reward)} disabled={redeeming === reward.id} style={styles.redeemButton}>{redeeming === reward.id ? 'Redeeming…' : 'Redeem'}</Button> : <Pill tone={reward.state === 'redeemed' ? 'mint' : 'cream'}>{reward.state === 'redeemed' ? 'Redeemed ✓' : 'Locked'}</Pill>}
    </Card>
  ))}</View></View>;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 2 });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.cream },
  page: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 64, gap: 26 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  loadingTitle: { color: Palette.ink, fontSize: 20, fontWeight: '900' },
  errorText: { color: Palette.danger, textAlign: 'center' },
  header: { minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameBlock: { alignItems: 'flex-end' },
  hello: { color: Palette.ink, fontSize: 13, fontWeight: '900' },
  university: { color: Palette.inkMuted, fontSize: 10, marginTop: 2 },
  signOut: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8 },
  notice: { backgroundColor: '#D9F8EC', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#A8E5CF' },
  noticeError: { backgroundColor: '#FFE9E6', borderColor: '#F2B8B1' },
  noticeText: { color: Palette.ink, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  heroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  personalCard: { flex: 1, minWidth: 260, minHeight: 300, justifyContent: 'space-between', backgroundColor: '#F9FFED', borderColor: '#D7EBAF' },
  personalMain: { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 30 },
  divider: { width: 1, height: 74, backgroundColor: '#D7E4D1' },
  bigNumber: { color: Palette.ink, fontSize: 42, lineHeight: 46, fontWeight: '900', letterSpacing: -1.5 },
  bigUnit: { color: Palette.inkSoft, fontSize: 13, fontWeight: '700', marginTop: 2 },
  contribution: { color: Palette.mintDark, fontSize: 12, lineHeight: 18, fontWeight: '800' },
  universityCard: { flex: 1.4, minWidth: 260, minHeight: 300, backgroundColor: Palette.ink, borderColor: Palette.ink, justifyContent: 'space-between' },
  universityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  mintEyebrow: { color: Palette.mint },
  universityKwh: { color: '#D8E4E1', fontSize: 13, fontWeight: '700', marginTop: 7 },
  percentBadge: { width: 58, height: 58, borderRadius: 20, backgroundColor: Palette.navyLight, alignItems: 'center', justifyContent: 'center' },
  percent: { color: Palette.lime, fontSize: 18, fontWeight: '900' },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 24, marginBottom: 10 },
  pointsCurrent: { color: Palette.paper, fontSize: 32, fontWeight: '900' },
  pointsTarget: { color: '#AFC2BE', fontSize: 13, fontWeight: '700' },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 22 },
  nextLabel: { color: Palette.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  nextReward: { color: Palette.paper, fontSize: 18, fontWeight: '900', marginTop: 4 },
  remaining: { color: Palette.lime, fontSize: 11, fontWeight: '900' },
  allUnlocked: { marginTop: 28, gap: 7 },
  allUnlockedTitle: { color: Palette.paper, fontSize: 23, fontWeight: '900' },
  darkMuted: { color: '#AFC2BE', fontSize: 13 },
  section: { gap: 16 },
  rewardGroup: { gap: 9 },
  groupLabel: { color: Palette.inkMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rewardCard: { flex: 1, minWidth: 245, maxWidth: 355, gap: 13, padding: 17, borderRadius: 20 },
  lockedCard: { backgroundColor: '#F4F6F5', shadowOpacity: 0.02 },
  rewardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' },
  lockedIcon: { backgroundColor: Palette.paperMuted },
  rewardIconText: { color: Palette.ink, fontSize: 21, fontWeight: '900' },
  rewardCopy: { flex: 1 },
  rewardName: { color: Palette.ink, fontSize: 16, fontWeight: '900' },
  rewardDescription: { color: Palette.inkSoft, fontSize: 12, lineHeight: 17, marginTop: 4 },
  rewardThreshold: { color: Palette.mintDark, fontSize: 10, fontWeight: '900', marginTop: 8 },
  redeemButton: { alignSelf: 'stretch' },
  historyCard: { padding: 6, borderRadius: 20 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: Palette.line },
  historyIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#D9F8EC', alignItems: 'center', justifyContent: 'center' },
  check: { color: Palette.success, fontSize: 16, fontWeight: '900' },
  historyCopy: { flex: 1 },
  historyName: { color: Palette.ink, fontSize: 13, fontWeight: '900' },
  historyDate: { color: Palette.inkMuted, fontSize: 10, marginTop: 3 },
  historyEmpty: { color: Palette.inkMuted, textAlign: 'center', padding: 24, fontSize: 12 },
});
