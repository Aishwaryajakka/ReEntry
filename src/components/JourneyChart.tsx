/**
 * JourneyChart — compact 14-day recovery chart for Journey tab.
 * Shape + color + label. Color is never the sole carrier of meaning.
 * Dark background variant.
 */

import { View, Text } from 'react-native';
import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { COLORS, useThemeColors } from '@/lib/theme';
import type { DailyCheckIn } from '@/data/types';

const FEELING_LABELS: Record<number, string> = {
  1: 'Very difficult',
  2: 'Difficult',
  3: 'Mixed',
  4: 'Mostly manageable',
  5: 'Manageable',
};

const FEELING_MARKER: Record<number, { shape: string; color: string }> = {
  1: { shape: '—', color: COLORS.rust },
  2: { shape: '–', color: COLORS.rust },
  3: { shape: '•', color: COLORS.turmeric },
  4: { shape: '+', color: COLORS.moss },
  5: { shape: '++', color: COLORS.warmWhite },
};

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'narrow' });
}

interface JourneyChartProps {
  /** Reversed chronological order (most recent first) */
  days: DailyCheckIn[];
}

export const JourneyChart: React.FC<JourneyChartProps> = ({ days }) => {
  const { today } = useAppContext();
  const theme = useThemeColors();

  const sorted = useMemo(() => [...days].sort((a, b) => a.date.localeCompare(b.date)), [days]);

  return (
    <View className="rounded-2xl border border-border p-4 bg-muted">
      <View className="flex-row justify-between items-end mb-4">
        {sorted.map((ci) => {
          const marker = FEELING_MARKER[ci.overallFeeling];
          const isToday = ci.date === today;
          return (
            <View key={ci.id} className="items-center gap-2" style={{ flex: 1 }}>
              <View
                className="w-8 h-8 rounded-full items-center justify-center border border-border"
                style={{ backgroundColor: isToday ? theme.accent : theme.mossLight }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: isToday ? theme.accentForeground : theme.foreground }}
                >
                  {marker.shape}
                </Text>
              </View>
              <Text className="text-[10px] text-muted-foreground">{formatDay(ci.date)}</Text>
            </View>
          );
        })}
      </View>

      <View className="border-t border-border pt-3">
        {sorted.length > 0 ? (
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">{formatShort(sorted[0].date)}</Text>
            <Text className="text-xs text-muted-foreground">{formatShort(sorted[sorted.length - 1].date)}</Text>
          </View>
        ) : (
          <Text className="text-xs text-muted-foreground text-center">No check-ins yet.</Text>
        )}
      </View>
    </View>
  );
};

export const JOURNEY_FEELING_LABELS = FEELING_LABELS;
export const JOURNEY_FEELING_MARKER = FEELING_MARKER;
