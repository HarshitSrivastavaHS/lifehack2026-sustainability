import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, View, type ViewStyle } from 'react-native';

import { Palette } from '@/constants/theme';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}><Text style={styles.brandBolt}>↯</Text></View>
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
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
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
      <Text style={[styles.buttonText, variant === 'primary' && styles.primaryText, variant === 'ghost' && styles.ghostText]}>
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

export function Pill({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'lime' | 'cream' | 'coral' }) {
  const colors = { mint: '#DDF8E9', lime: Palette.lime, cream: Palette.cream, coral: '#FFE4DE' };
  return <View style={[styles.pill, { backgroundColor: colors[tone] }]}><Text style={styles.pillText}>{children}</Text></View>;
}

export function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return <View style={styles.stat}><Text style={[styles.statValue, accent ? { color: accent } : undefined]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

export const type = StyleSheet.create({
  title: { color: Palette.ink, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1.1 },
  section: { color: Palette.ink, fontSize: 21, lineHeight: 26, fontWeight: '900', letterSpacing: -0.5 },
  body: { color: Palette.inkSoft, fontSize: 15, lineHeight: 22 },
  small: { color: Palette.inkSoft, fontSize: 12, lineHeight: 17 },
});

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: Palette.lime, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  brandBolt: { fontSize: 22, fontWeight: '900', color: Palette.ink },
  brandName: { fontSize: 19, fontWeight: '900', color: Palette.ink, letterSpacing: -0.5 },
  button: { minHeight: 48, paddingHorizontal: 19, paddingVertical: 13, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  button_primary: { backgroundColor: Palette.lime, borderColor: '#BCD741', shadowColor: Palette.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 0 },
  button_secondary: { backgroundColor: Palette.paper, borderColor: Palette.line },
  button_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  button_dark: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  buttonText: { fontSize: 14, fontWeight: '800', color: Palette.paper },
  primaryText: { color: Palette.ink },
  ghostText: { color: Palette.inkSoft },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.88 },
  card: { backgroundColor: Palette.paper, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Palette.line, shadowColor: Palette.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: Palette.mintDark },
  track: { width: '100%', backgroundColor: '#E8ECE8', borderRadius: 100, overflow: 'hidden' },
  fill: { borderRadius: 100 },
  pill: { borderRadius: 100, paddingHorizontal: 11, paddingVertical: 6, alignSelf: 'flex-start' },
  pillText: { color: Palette.ink, fontSize: 11, fontWeight: '800' },
  stat: { flex: 1, minWidth: 88 },
  statValue: { color: Palette.ink, fontSize: 23, fontWeight: '900' },
  statLabel: { color: Palette.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 2 },
});
