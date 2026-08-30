/**
 * ToleranceMeter — visual representation of a self-reported tolerance rating.
 * Uses shape + label to ensure color is NOT the sole carrier of meaning.
 * Supports the 1–3 activity log scale (Manageable / Some difficulty / Very difficult)
 * and the legacy 1–5 scale.
 */

import { View, Text } from 'react-native';
import React from 'react';
import { cn } from '@/lib/utils';

const RATING_LABELS: Record<number, string> = {
  1: 'Very difficult',
  2: 'Some difficulty',
  3: 'Manageable',
};

// Segment fill — uses shape count + opacity as primary signal; tint is secondary
const SEGMENT_ACTIVE_STYLE: Record<number, string> = {
  1: 'bg-destructive opacity-90',
  2: 'bg-accent opacity-70',
  3: 'bg-primary opacity-80',
};

interface ToleranceMeterProps {
  rating: number;
  /** If true, renders 3 segments; else 5. */
  scale?: 3 | 5;
  showLabel?: boolean;
  compact?: boolean;
}

export const ToleranceMeter: React.FC<ToleranceMeterProps> = ({
  rating,
  scale = 3,
  showLabel = true,
  compact = false,
}) => {
  const segments = scale === 3 ? [1, 2, 3] : [1, 2, 3, 4, 5];
  const segmentStyle = SEGMENT_ACTIVE_STYLE[rating] ?? 'bg-muted';

  return (
    <View className={cn('gap-1', compact ? '' : 'gap-2')}>
      <View className="flex-row gap-1">
        {segments.map((i) => (
          <View
            key={i}
            className={cn(
              'rounded-sm',
              compact ? 'h-2' : 'h-3',
              i <= rating ? segmentStyle : 'bg-border opacity-50',
            )}
            style={{ flex: 1 }}
          />
        ))}
      </View>
      {showLabel && (
        <Text className="text-xs text-muted-foreground">{RATING_LABELS[rating] ?? ''}</Text>
      )}
    </View>
  );
};
