import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/app-ui';
import { Palette } from '@/constants/theme';
import {
  achievements,
  calendarDays,
  eligibilityCutoff,
  hallTierForRank,
  isShowcaseEligible,
  monthlyHallStandings,
  prizeTiers,
  recentWeekSavings,
  showcaseStudent,
  type ShowcaseTab,
  weeklyHallStandings,
} from '@/features/student/nus-showcase-data';

const tabs: { id: ShowcaseTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'halls', label: 'Halls', icon: '♜' },
  { id: 'journey', label: 'Journey', icon: '◉' },
];

export function ShowcaseNav({ active, onChange }: { active: ShowcaseTab; onChange: (tab: ShowcaseTab) => void }) {
  return <View style={styles.nav}>
    {tabs.map((tab) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === tab.id }} key={tab.id} onPress={() => onChange(tab.id)} style={({ pressed }) => [styles.navItem, active === tab.id && styles.navActive, pressed && styles.pressed]}>
      <Text style={[styles.navIcon, active === tab.id && styles.navIconActive]}>{tab.icon}</Text>
      <Text style={[styles.navLabel, active === tab.id && styles.navLabelActive]}>{tab.label}</Text>
    </Pressable>)}
  </View>;
}

export function HomeCompetitionCard({ rewardUnlocked, contributorRank }: { rewardUnlocked: boolean; contributorRank: number }) {
  const tier = hallTierForRank(2);
  const cutoff = eligibilityCutoff(showcaseStudent.contributorCount, tier.eligiblePercent);
  const eligible = isShowcaseEligible(contributorRank, showcaseStudent.contributorCount, tier.eligiblePercent);
  return <View style={styles.homeCompetition}>
    <View style={styles.homeCompetitionTop}>
      <View><Text style={styles.eyebrow}>NUS ENERGY SPRINT</Text><Text style={styles.homeCompetitionTitle}>Kent Ridge is in the race.</Text></View>
      <View style={styles.silverBadge}><Text style={styles.silverBadgeText}>2ND · SILVER</Text></View>
    </View>
    <View style={styles.homeStats}>
      <View style={styles.homeStat}><Text style={styles.homeStatValue}>11</Text><Text style={styles.homeStatLabel}>day streak</Text></View>
      <View style={styles.homeStatDivider} />
      <View style={styles.homeStat}><Text style={styles.homeStatValue}>#{contributorRank}</Text><Text style={styles.homeStatLabel}>in your hall</Text></View>
      <View style={styles.homeStatDivider} />
      <View style={styles.homeStat}><Text style={styles.homeStatValue}>Top 30%</Text><Text style={styles.homeStatLabel}>reward access</Text></View>
    </View>
    <View style={[styles.eligibilityBanner, eligible && rewardUnlocked && styles.eligibilityUnlocked, !eligible && styles.eligibilityMissed]}>
      <View style={[styles.eligibilityIcon, !eligible && styles.eligibilityIconMissed]}><Text style={styles.eligibilityIconText}>{eligible ? rewardUnlocked ? '✓' : '↯' : '↑'}</Text></View>
      <View style={styles.flex}><Text style={styles.eligibilityTitle}>{eligible ? rewardUnlocked ? 'You qualify for the Silver reward' : 'You’re inside the reward cutoff' : `${cutoff} places qualify this sprint`}</Text><Text style={styles.eligibilityMeta}>Rank #{contributorRank} · top {cutoff} of {showcaseStudent.contributorCount} qualify</Text></View>
    </View>
  </View>;
}

export function HallsShowcase({ compact }: { compact: boolean }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const standings = period === 'week' ? weeklyHallStandings : monthlyHallStandings;
  const kentRidge = standings.find((hall) => hall.name === showcaseStudent.hall) ?? standings[0];
  const tier = hallTierForRank(kentRidge.rank);
  const leader = standings[0];
  return <View style={styles.showcaseScreen}>
    <View style={styles.hallsHero}>
      <View style={styles.hallsOrb} />
      <Text style={styles.heroEyebrow}>NUS HALL ENERGY SPRINT</Text>
      <View style={[styles.hallsHeroBody, compact && styles.stack]}>
        <View style={styles.flex}><Text style={styles.hallsHeroTitle}>{kentRidge.rank === 1 ? 'Kent Ridge leads.' : 'Kent Ridge is closing in.'}</Text><Text style={styles.hallsHeroCopy}>{kentRidge.rank === 1 ? 'Hold first place to keep the Gold reward.' : `${formatNumber(leader.kwhSaved - kentRidge.kwhSaved)} kWh behind ${leader.name}.`}</Text></View>
        <View style={styles.heroRank}><Text style={styles.heroRankValue}>{ordinal(kentRidge.rank)}</Text><Text style={styles.heroRankLabel}>{tier.tier.toUpperCase()} TIER</Text></View>
      </View>
      <View style={styles.hallGoalTop}><Text style={styles.hallGoalLabel}>HALL TARGET</Text><Text style={styles.hallGoalValue}>{showcaseStudent.hallPoints.toLocaleString()} / {showcaseStudent.hallTargetPoints.toLocaleString()} pts</Text></View>
      <View style={styles.hallGoalTrack}><View style={[styles.hallGoalFill, { width: `${Math.round(showcaseStudent.hallPoints / showcaseStudent.hallTargetPoints * 100)}%` }]} /></View>
    </View>

    <View style={styles.sectionHeading}>
      <View><Text style={styles.sectionTitle}>Hall standings</Text><Text style={styles.sectionMeta}>More savings unlock better rewards.</Text></View>
      <View style={styles.periodToggle}>{(['week', 'month'] as const).map((item) => <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.periodButton, period === item && styles.periodButtonActive]}><Text style={[styles.periodText, period === item && styles.periodTextActive]}>{item === 'week' ? 'Week' : 'Month'}</Text></Pressable>)}</View>
    </View>

    <View style={styles.leaderboard}>
      {standings.map((hall, index) => {
        const rewardTier = hallTierForRank(hall.rank);
        const current = hall.name === showcaseStudent.hall;
        return <View key={hall.name} style={[styles.hallRow, index > 0 && styles.rowBorder, current && styles.hallRowCurrent]}>
          <View style={[styles.rankMedal, hall.rank === 1 && styles.goldMedal, hall.rank === 2 && styles.silverMedal, hall.rank === 3 && styles.bronzeMedal]}><Text style={styles.rankMedalText}>{hall.rank}</Text></View>
          <View style={[styles.hallMonogram, current && styles.hallMonogramCurrent]}><Text style={[styles.hallMonogramText, current && styles.hallMonogramTextCurrent]}>{hall.shortName}</Text></View>
          <View style={styles.flex}><View style={styles.hallNameLine}><Text style={styles.hallName}>{hall.name}</Text>{current && <Pill tone="lime">Your hall</Pill>}</View><Text style={styles.hallMeta}>{formatNumber(hall.kwhSaved)} kWh · {hall.points.toLocaleString()} pts</Text></View>
          <View style={styles.hallReward}><Text style={styles.hallTier}>{rewardTier.tier}</Text><Text style={styles.hallAccess}>Top {rewardTier.eligiblePercent}%</Text></View>
          <Text style={[styles.trend, hall.trend === 'down' && styles.trendDown]}>{hall.trend === 'up' ? '↑' : hall.trend === 'down' ? '↓' : '–'}</Text>
        </View>;
      })}
    </View>

    <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Prize ladder</Text><Text style={styles.sectionMeta}>This sprint’s laundry rewards.</Text></View></View>
    <View style={[styles.prizeGrid, compact && styles.stack]}>{prizeTiers.map((prize) => <View key={prize.tier} style={[styles.prizeCard, { borderTopColor: prize.color }]}><Text style={styles.prizeRank}>{prize.rank}</Text><Text style={styles.prizeTier}>{prize.tier}</Text><Text style={styles.prizeReward}>{prize.reward}</Text><Text style={styles.prizeAccess}>Top {prize.eligiblePercent}% qualify</Text></View>)}</View>
  </View>;
}

export function JourneyShowcase({ compact, contributorRank }: { compact: boolean; contributorRank: number }) {
  const maxSaving = Math.max(...recentWeekSavings);
  return <View style={styles.showcaseScreen}>
    <View style={[styles.journeyHero, compact && styles.journeyHeroCompact]}>
      <View><Text style={styles.heroEyebrow}>YOUR JOURNEY</Text><Text style={styles.journeyHeroTitle}>11 days. Keep the current flowing.</Text><Text style={styles.journeyHeroCopy}>One more saving tomorrow keeps your streak alive.</Text></View>
      <View style={[styles.streakFlame, compact && styles.streakFlameCompact]}><Text style={styles.streakFlameIcon}>↯</Text><Text style={styles.streakValue}>11</Text><Text style={styles.streakLabel}>DAY STREAK</Text></View>
    </View>

    <View style={[styles.journeyStats, compact && styles.journeyStatsCompact]}>
      <JourneyStat value={`${showcaseStudent.totalKwh} kWh`} label="Total saved" />
      <JourneyStat value={showcaseStudent.totalPoints.toLocaleString()} label="Points earned" />
      <JourneyStat value={`${showcaseStudent.longestStreak} days`} label="Longest streak" />
      <JourneyStat value={`#${contributorRank}`} label="Hall position" />
    </View>

    <View style={[styles.journeyGrid, compact && styles.stack]}>
      <View style={styles.calendarCard}>
        <View style={styles.cardHeader}><View><Text style={styles.cardTitle}>August activity</Text><Text style={styles.cardMeta}>Electricity savings by day</Text></View><Pill tone="lime">11 day streak</Pill></View>
        <View style={styles.weekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}</View>
        <View style={styles.calendarGrid}>{calendarDays.map((item, index) => <View key={`${item.day ?? 'empty'}-${index}`} style={styles.calendarSlot}>{item.day ? <View style={[styles.calendarDay, savingsTone(item.kwh), item.today && styles.calendarToday]}><Text style={[styles.calendarDayText, item.kwh > 1.5 && styles.calendarDayTextStrong]}>{item.day}</Text>{item.kwh > 0 && <View style={[styles.calendarDot, item.kwh > 1.5 && styles.calendarDotStrong]} />}</View> : null}</View>)}</View>
        <View style={styles.calendarLegend}><Text style={styles.legendText}>Less</Text>{[0, .7, 1.5, 2.2].map((value) => <View key={value} style={[styles.legendSquare, savingsTone(value)]} />)}<Text style={styles.legendText}>More</Text></View>
      </View>

      <View style={styles.weekChartCard}>
        <View><Text style={styles.cardTitle}>This week</Text><Text style={styles.cardMeta}>14.0 kWh saved</Text></View>
        <View style={styles.barChart}>{recentWeekSavings.map((value, index) => <View key={index} style={styles.barSlot}><View style={[styles.bar, { height: `${Math.max(value / maxSaving * 100, 12)}%` }]} /><Text style={styles.barLabel}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}</Text></View>)}</View>
        <View style={styles.weekWin}><Text style={styles.weekWinIcon}>↑</Text><View><Text style={styles.weekWinValue}>18% above last week</Text><Text style={styles.weekWinMeta}>Your strongest week this month.</Text></View></View>
      </View>
    </View>

    <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>Achievements</Text><Text style={styles.sectionMeta}>4 of 6 collected</Text></View><View style={styles.achievementCount}><Text style={styles.achievementCountText}>4 / 6</Text></View></View>
    <View style={[styles.achievementGrid, compact && styles.stack]}>{achievements.map((achievement) => <View key={achievement.id} style={[styles.achievementCard, compact && styles.achievementCardCompact, !achievement.unlocked && styles.achievementLocked]}>
      <View style={[styles.achievementIcon, achievement.unlocked && styles.achievementIconUnlocked]}><Text style={styles.achievementIconText}>{achievement.icon}</Text></View>
      <View style={styles.flex}><View style={styles.achievementTitleLine}><Text style={styles.achievementName}>{achievement.name}</Text>{achievement.unlocked && <Pill tone="lime">Unlocked</Pill>}</View><Text style={styles.achievementDescription}>{achievement.description}</Text>
        {!achievement.unlocked && <View style={styles.achievementProgress}><View style={[styles.achievementProgressFill, { width: `${achievement.progress * 100}%` }]} /></View>}
        <Text style={[styles.achievementMeta, achievement.unlocked && styles.achievementMetaUnlocked]}>{achievement.unlocked ? `Earned ${achievement.unlockedAt}` : achievement.progressLabel}</Text>
      </View>
    </View>)}</View>
  </View>;
}

function JourneyStat({ value, label }: { value: string; label: string }) {
  return <View style={styles.journeyStat}><Text style={styles.journeyStatValue}>{value}</Text><Text style={styles.journeyStatLabel}>{label}</Text></View>;
}

function savingsTone(kwh: number) {
  if (kwh >= 2) return styles.savingHigh;
  if (kwh >= 1) return styles.savingMedium;
  if (kwh > 0) return styles.savingLow;
  return styles.savingNone;
}

function ordinal(rank: number) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { flexDirection: 'column' },
  pressed: { opacity: .78, transform: [{ translateY: 1 }] },
  nav: { alignSelf: 'center', flexDirection: 'row', backgroundColor: '#E6ECE8', borderRadius: 17, padding: 4, gap: 3, borderWidth: 1, borderColor: '#D7E1DC' },
  navItem: { minWidth: 92, minHeight: 43, paddingHorizontal: 14, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  navActive: { backgroundColor: Palette.ink, shadowColor: Palette.shadow, shadowOpacity: .15, shadowRadius: 9 },
  navIcon: { color: Palette.inkMuted, fontSize: 14, fontWeight: '900' },
  navIconActive: { color: Palette.lime },
  navLabel: { color: Palette.inkSoft, fontSize: 11, fontWeight: '900' },
  navLabelActive: { color: Palette.paper },
  eyebrow: { color: Palette.mintDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  homeCompetition: { backgroundColor: '#FFF9EB', borderWidth: 1, borderColor: '#F0DFC0', borderRadius: 23, padding: 18, gap: 15 },
  homeCompetitionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  homeCompetitionTitle: { color: Palette.ink, fontSize: 17, fontWeight: '900', marginTop: 4 },
  silverBadge: { backgroundColor: '#D9E3E7', borderRadius: 100, paddingHorizontal: 11, paddingVertical: 7 },
  silverBadgeText: { color: '#3E5965', fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  homeStats: { flexDirection: 'row', alignItems: 'center' },
  homeStat: { flex: 1 },
  homeStatValue: { color: Palette.ink, fontSize: 17, fontWeight: '900' },
  homeStatLabel: { color: Palette.inkMuted, fontSize: 8, fontWeight: '800', marginTop: 3 },
  homeStatDivider: { width: 1, height: 32, backgroundColor: '#E8DCC4', marginHorizontal: 10 },
  eligibilityBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, padding: 12, backgroundColor: '#FFF2D0', borderWidth: 1, borderColor: '#EFCB75' },
  eligibilityUnlocked: { backgroundColor: '#E9FFC0', borderColor: '#BCE65D' },
  eligibilityMissed: { backgroundColor: '#F0F2F0', borderColor: '#D8DFDB' },
  eligibilityIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' },
  eligibilityIconText: { color: Palette.ink, fontSize: 18, fontWeight: '900' },
  eligibilityIconMissed: { backgroundColor: '#DDE4E0' },
  eligibilityTitle: { color: Palette.ink, fontSize: 11, fontWeight: '900' },
  eligibilityMeta: { color: Palette.inkSoft, fontSize: 9, fontWeight: '700', marginTop: 3 },
  showcaseScreen: { gap: 20 },
  hallsHero: { overflow: 'hidden', backgroundColor: Palette.ink, borderRadius: 28, padding: 23, minHeight: 270, shadowColor: Palette.shadow, shadowOpacity: .18, shadowRadius: 24 },
  hallsOrb: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: '#173E49', right: -80, top: -110 },
  heroEyebrow: { color: Palette.lime, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  hallsHeroBody: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 26, marginBottom: 29 },
  hallsHeroTitle: { color: Palette.paper, fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -.9 },
  hallsHeroCopy: { color: '#A9C2C0', fontSize: 11, fontWeight: '700', marginTop: 7 },
  heroRank: { minWidth: 106, alignItems: 'center', justifyContent: 'center', backgroundColor: '#183C48', borderWidth: 1, borderColor: '#315761', borderRadius: 22, padding: 16 },
  heroRankValue: { color: Palette.lime, fontSize: 27, fontWeight: '900' },
  heroRankLabel: { color: '#B7CAC8', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  hallGoalTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  hallGoalLabel: { color: '#87AAA8', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  hallGoalValue: { color: Palette.paper, fontSize: 10, fontWeight: '900' },
  hallGoalTrack: { height: 10, borderRadius: 5, backgroundColor: '#244550', overflow: 'hidden' },
  hallGoalFill: { height: 10, borderRadius: 5, backgroundColor: Palette.lime },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  sectionTitle: { color: Palette.ink, fontSize: 22, fontWeight: '900', letterSpacing: -.6 },
  sectionMeta: { color: Palette.inkMuted, fontSize: 9, fontWeight: '800', marginTop: 3 },
  periodToggle: { flexDirection: 'row', backgroundColor: '#E5ECE8', borderRadius: 13, padding: 3 },
  periodButton: { minWidth: 58, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center' },
  periodButtonActive: { backgroundColor: Palette.paper },
  periodText: { color: Palette.inkMuted, fontSize: 9, fontWeight: '900' },
  periodTextActive: { color: Palette.ink },
  leaderboard: { overflow: 'hidden', borderRadius: 23, borderWidth: 1, borderColor: '#DDE7E1', backgroundColor: Palette.paper },
  hallRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#E8EEEA' },
  hallRowCurrent: { backgroundColor: '#F5FFE7' },
  rankMedal: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#ECF0ED', alignItems: 'center', justifyContent: 'center' },
  goldMedal: { backgroundColor: '#FFE49A' }, silverMedal: { backgroundColor: '#DCE6EA' }, bronzeMedal: { backgroundColor: '#F5D2B5' },
  rankMedalText: { color: Palette.ink, fontSize: 11, fontWeight: '900' },
  hallMonogram: { width: 42, height: 42, borderRadius: 15, backgroundColor: Palette.ink, alignItems: 'center', justifyContent: 'center' },
  hallMonogramCurrent: { backgroundColor: Palette.lime },
  hallMonogramText: { color: Palette.paper, fontSize: 10, fontWeight: '900' },
  hallMonogramTextCurrent: { color: Palette.ink },
  hallNameLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  hallName: { color: Palette.ink, fontSize: 12, fontWeight: '900' },
  hallMeta: { color: Palette.inkMuted, fontSize: 8, fontWeight: '700', marginTop: 4 },
  hallReward: { minWidth: 64, alignItems: 'flex-end' },
  hallTier: { color: Palette.ink, fontSize: 9, fontWeight: '900' },
  hallAccess: { color: Palette.mintDark, fontSize: 8, fontWeight: '800', marginTop: 3 },
  trend: { width: 18, color: Palette.success, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  trendDown: { color: Palette.coral },
  prizeGrid: { flexDirection: 'row', gap: 10 },
  prizeCard: { flex: 1, minHeight: 132, backgroundColor: Palette.paper, borderWidth: 1, borderColor: '#DEE6E1', borderTopWidth: 5, borderRadius: 18, padding: 14 },
  prizeRank: { color: Palette.inkMuted, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  prizeTier: { color: Palette.ink, fontSize: 16, fontWeight: '900', marginTop: 5 },
  prizeReward: { color: Palette.inkSoft, fontSize: 9, lineHeight: 13, fontWeight: '800', marginTop: 8 },
  prizeAccess: { color: Palette.mintDark, fontSize: 8, fontWeight: '900', marginTop: 7 },
  journeyHero: { minHeight: 210, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20, overflow: 'hidden', backgroundColor: '#17333C', borderRadius: 28, padding: 23 },
  journeyHeroCompact: { flexDirection: 'column', alignItems: 'stretch' },
  journeyHeroTitle: { maxWidth: 470, color: Palette.paper, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -.8, marginTop: 9 },
  journeyHeroCopy: { color: '#AFC4C2', fontSize: 10, fontWeight: '700', marginTop: 9 },
  streakFlame: { minWidth: 108, minHeight: 122, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.lime, borderRadius: 28, transform: [{ rotate: '2deg' }] },
  streakFlameCompact: { minHeight: 72, flexDirection: 'row', gap: 8, borderRadius: 21, transform: [{ rotate: '0deg' }] },
  streakFlameIcon: { color: Palette.ink, fontSize: 22, fontWeight: '900' },
  streakValue: { color: Palette.ink, fontSize: 37, lineHeight: 40, fontWeight: '900', letterSpacing: -1.3 },
  streakLabel: { color: Palette.ink, fontSize: 7, fontWeight: '900', letterSpacing: .9 },
  journeyStats: { flexDirection: 'row', gap: 10 },
  journeyStatsCompact: { flexWrap: 'wrap' },
  journeyStat: { flex: 1, minWidth: 125, backgroundColor: Palette.paper, borderWidth: 1, borderColor: '#DDE6E1', borderRadius: 17, padding: 14 },
  journeyStatValue: { color: Palette.ink, fontSize: 17, fontWeight: '900' },
  journeyStatLabel: { color: Palette.inkMuted, fontSize: 8, fontWeight: '800', marginTop: 4 },
  journeyGrid: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  calendarCard: { flex: 1.5, backgroundColor: Palette.paper, borderWidth: 1, borderColor: '#DDE6E1', borderRadius: 23, padding: 18 },
  weekChartCard: { flex: 1, minHeight: 310, backgroundColor: Palette.paper, borderWidth: 1, borderColor: '#DDE6E1', borderRadius: 23, padding: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: Palette.ink, fontSize: 16, fontWeight: '900' },
  cardMeta: { color: Palette.inkMuted, fontSize: 8, fontWeight: '800', marginTop: 3 },
  weekdays: { flexDirection: 'row', marginTop: 18, marginBottom: 7 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: Palette.inkMuted, fontSize: 8, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarSlot: { width: `${100 / 7}%`, padding: 3 },
  calendarDay: { aspectRatio: 1, minHeight: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { color: Palette.inkSoft, fontSize: 9, fontWeight: '800' },
  calendarDayTextStrong: { color: Palette.ink, fontWeight: '900' },
  calendarToday: { borderWidth: 2, borderColor: Palette.ink },
  calendarDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Palette.mintDark, marginTop: 2 },
  calendarDotStrong: { backgroundColor: Palette.ink },
  savingNone: { backgroundColor: '#F0F3F1' }, savingLow: { backgroundColor: '#DDF8EC' }, savingMedium: { backgroundColor: '#9AEBCE' }, savingHigh: { backgroundColor: Palette.lime },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 12 },
  legendText: { color: Palette.inkMuted, fontSize: 7, fontWeight: '800' },
  legendSquare: { width: 11, height: 11, borderRadius: 3 },
  barChart: { height: 170, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 20 },
  barSlot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  bar: { width: '75%', maxWidth: 24, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: Palette.mintDark },
  barLabel: { color: Palette.inkMuted, fontSize: 7, fontWeight: '900' },
  weekWin: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E9F8F1', borderRadius: 13, padding: 10, marginTop: 15 },
  weekWinIcon: { color: Palette.success, fontSize: 18, fontWeight: '900' },
  weekWinValue: { color: Palette.ink, fontSize: 9, fontWeight: '900' },
  weekWinMeta: { color: Palette.inkMuted, fontSize: 7, fontWeight: '700', marginTop: 2 },
  achievementCount: { backgroundColor: Palette.ink, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9 },
  achievementCountText: { color: Palette.lime, fontSize: 10, fontWeight: '900' },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  achievementCard: { width: '48.9%', minHeight: 144, flexDirection: 'row', gap: 12, backgroundColor: Palette.paper, borderWidth: 1, borderColor: '#DDE6E1', borderRadius: 20, padding: 15 },
  achievementCardCompact: { width: '100%' },
  achievementLocked: { backgroundColor: '#F3F5F3', opacity: .76 },
  achievementIcon: { width: 45, height: 45, borderRadius: 16, backgroundColor: '#E4E9E6', alignItems: 'center', justifyContent: 'center' },
  achievementIconUnlocked: { backgroundColor: Palette.lime },
  achievementIconText: { color: Palette.ink, fontSize: 16, fontWeight: '900' },
  achievementTitleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  achievementName: { color: Palette.ink, fontSize: 12, fontWeight: '900' },
  achievementDescription: { color: Palette.inkSoft, fontSize: 8, lineHeight: 12, marginTop: 5 },
  achievementProgress: { height: 5, borderRadius: 3, backgroundColor: '#DCE3DF', overflow: 'hidden', marginTop: 10 },
  achievementProgressFill: { height: 5, borderRadius: 3, backgroundColor: Palette.mintDark },
  achievementMeta: { color: Palette.inkMuted, fontSize: 8, fontWeight: '900', marginTop: 8 },
  achievementMetaUnlocked: { color: Palette.mintDark },
});
