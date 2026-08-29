import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Palette } from '@/constants/theme';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}><View style={styles.brandLeaf}><Text style={styles.brandBolt}>↯</Text></View></View>
      {!compact && <Text style={styles.brandName}>CommonGrid</Text>}
    </View>
  );
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={[styles.buttonText, variant === 'primary' && styles.primaryText, (variant === 'ghost' || variant === 'secondary') && styles.ghostText]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function ProgressBar({ value, color = Palette.mintDark, height = 12 }: { value: number; color?: string; height?: number }) {
  const percent = Math.max(0, Math.min(value, 1)) * 100;
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }} style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color, height }]} />
    </View>
  );
}

export function ProgressRing({ value, size = 76, color = Palette.lime, label }: { value: number; size?: number; color?: string; label?: string }) {
  const stroke = 8; const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius; const normalized = Math.max(0, Math.min(1, value));
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(normalized * 100) }} style={{ width: size, height: size }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}><Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,.16)" strokeWidth={stroke} fill="none" /><Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - normalized)} rotation="-90" origin={`${size / 2}, ${size / 2}`} /></Svg>
    <View style={styles.ringLabel}><Text style={styles.ringValue}>{label ?? `${Math.round(normalized * 100)}%`}</Text></View>
  </View>;
}

export function Pill({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'lime' | 'cream' | 'coral' | 'violet' | 'navy' | 'amber' }) {
  const colors = { mint: '#D9F8EC', lime: Palette.lime, cream: Palette.cream, coral: '#FFE1DC', violet: '#EEE7FF', navy: Palette.navy, amber: '#FFF0C9' };
  return <View style={[styles.pill, { backgroundColor: colors[tone] }]}><Text style={[styles.pillText, tone === 'navy' && styles.pillLight]}>{children}</Text></View>;
}

export function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return <View style={styles.stat}><Text style={[styles.statValue, accent ? { color: accent } : undefined]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={styles.sectionHeader}><View style={styles.sectionCopy}><Text style={type.section}>{title}</Text>{subtitle && <Text style={type.small}>{subtitle}</Text>}</View>{action}</View>;
}

export function EmptyState({ icon = '✦', title, body, action }: { icon?: string; title: string; body: string; action?: ReactNode }) {
  return <Card style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>{icon}</Text></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{action}</Card>;
}

export function Skeleton({ height = 18, width = '100%' }: { height?: number; width?: number | `${number}%` }) {
  return <View style={[styles.skeleton, { height, width }]} />;
}

export const type = StyleSheet.create({
  title: { color: Palette.ink, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -1.2 },
  section: { color: Palette.ink, fontSize: 21, lineHeight: 26, fontWeight: '900', letterSpacing: -0.65 },
  body: { color: Palette.inkSoft, fontSize: 15, lineHeight: 22 },
  small: { color: Palette.inkSoft, fontSize: 12, lineHeight: 17 },
});

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: Palette.navy, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }], shadowColor: Palette.shadow, shadowOpacity: .2, shadowRadius: 10 },
  brandLeaf: { width: 26, height: 26, borderTopLeftRadius: 13, borderBottomRightRadius: 13, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center' },
  brandBolt: { fontSize: 22, fontWeight: '900', color: Palette.ink },
  brandName: { fontSize: 19, fontWeight: '900', color: Palette.ink, letterSpacing: -0.5 },
  button: { minHeight: 48, paddingHorizontal: 19, paddingVertical: 13, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  button_primary: { backgroundColor: Palette.lime, borderColor: '#9FD22E', shadowColor: Palette.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 7 },
  button_secondary: { backgroundColor: Palette.paper, borderColor: Palette.line },
  button_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  button_dark: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  button_danger: { backgroundColor: Palette.danger, borderColor: Palette.danger },
  buttonText: { fontSize: 14, fontWeight: '800', color: Palette.paper },
  primaryText: { color: Palette.ink },
  ghostText: { color: Palette.inkSoft },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.88 },
  card: { backgroundColor: Palette.paper, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Palette.line, shadowColor: Palette.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 20 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Palette.mintDark },
  track: { width: '100%', backgroundColor: '#E8ECE8', borderRadius: 100, overflow: 'hidden' },
  fill: { borderRadius: 100 },
  pill: { borderRadius: 100, paddingHorizontal: 11, paddingVertical: 6, alignSelf: 'flex-start' },
  pillText: { color: Palette.ink, fontSize: 11, fontWeight: '800' },
  pillLight: { color: Palette.paper },
  stat: { flex: 1, minWidth: 88 },
  statValue: { color: Palette.ink, fontSize: 23, fontWeight: '900' },
  statLabel: { color: Palette.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 2 },
  ringLabel: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }, ringValue: { color: Palette.paper, fontWeight: '900', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }, sectionCopy: { flex: 1, gap: 2 },
  empty: { alignItems: 'center', paddingVertical: 34, gap: 9 }, emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#EEE7FF', alignItems: 'center', justifyContent: 'center' }, emptyIconText: { color: Palette.violetDark, fontSize: 25, fontWeight: '900' }, emptyTitle: { color: Palette.ink, fontSize: 17, fontWeight: '900' }, emptyBody: { color: Palette.inkSoft, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 340 },
  skeleton: { borderRadius: 10, backgroundColor: Palette.paperMuted },
});
