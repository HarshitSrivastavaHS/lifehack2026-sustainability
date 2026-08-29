import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import type { ChartSpec } from '@/core/challenges/types';
import { Palette } from '@/constants/theme';

const W = 640;
const H = 180;
const PAD = 24;

export function MetricChart({ spec }: { spec: ChartSpec }) {
  const maximum = Math.max(...spec.points.flatMap((point) => [point.value, point.comparison ?? 0]), 1);
  const step = (W - PAD * 2) / Math.max(spec.points.length, 1);
  const y = (value: number) => H - PAD - (value / maximum) * (H - PAD * 2);
  const path = spec.points.map((point, index) => `${index ? 'L' : 'M'} ${PAD + step * (index + 0.5)} ${y(point.value)}`).join(' ');
  const isLine = spec.kind === 'line' || spec.kind === 'sparkline';

  return <View accessibilityRole="image" accessibilityLabel={spec.accessibilitySummary}>
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={Palette.line} strokeWidth="2" />
      {isLine ? <>
        <Path d={path} fill="none" stroke={Palette.mintDark} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {spec.points.map((point, index) => <Circle key={point.label} cx={PAD + step * (index + 0.5)} cy={y(point.value)} r="5" fill={Palette.mintDark} />)}
      </> : spec.points.map((point, index) => {
        const center = PAD + step * (index + 0.5);
        const width = Math.min(24, step / 3);
        const expectedY = point.comparison === undefined ? undefined : y(point.comparison);
        return <ViewBars key={point.label} center={center} width={width} actualY={y(point.value)} expectedY={expectedY} />;
      })}
    </Svg>
    <View style={styles.labels}>{spec.points.map((point) => <Text key={point.label} style={styles.label}>{point.label}</Text>)}</View>
    <View style={styles.legend}>
      <Legend color={Palette.mintDark} label={spec.primaryLabel} />
      {spec.comparisonLabel && <Legend color="#D9E1DC" label={spec.comparisonLabel} />}
    </View>
  </View>;
}

function ViewBars({ center, width, actualY, expectedY }: { center: number; width: number; actualY: number; expectedY?: number }) {
  return <>
    {expectedY !== undefined && <Rect x={center - width - 2} y={expectedY} width={width} height={H - PAD - expectedY} rx="5" fill="#D9E1DC" />}
    <Rect x={center + (expectedY === undefined ? -width / 2 : 2)} y={actualY} width={width} height={H - PAD - actualY} rx="5" fill={Palette.mintDark} />
  </>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: -18, paddingHorizontal: 18 },
  label: { color: Palette.inkSoft, fontSize: 9, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginTop: 13 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Palette.inkSoft, fontSize: 11 },
});
