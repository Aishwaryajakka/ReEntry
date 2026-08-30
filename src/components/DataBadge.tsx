/**
 * DataBadge — reusable ChallengeTag label chip.
 * Compact, no background fill — border only.
 */

import { View, Text } from 'react-native';
import React from 'react';
import { cn } from '@/lib/utils';
import type { ChallengeTag } from '@/data/types';

interface DataBadgeProps {
  tag: ChallengeTag;
  className?: string;
}

const categoryBorderColor: Record<NonNullable<ChallengeTag['category']>, string> = {
  environmental: 'border-secondary',
  cognitive:     'border-accent',
  social:        'border-destructive',
  physical:      'border-primary',
};

export const DataBadge: React.FC<DataBadgeProps> = ({ tag, className }) => (
  <View
    className={cn(
      'border rounded-full px-3 py-1 items-center justify-center',
      categoryBorderColor[tag.category ?? 'physical'],
      className,
    )}
  >
    <Text className="text-xs text-foreground font-medium">{tag.label}</Text>
  </View>
);

/** Render multiple tags from ids */
interface DataBadgeListProps {
  tagIds: string[];
  allTags: ChallengeTag[];
  className?: string;
}

export const DataBadgeList: React.FC<DataBadgeListProps> = ({ tagIds, allTags, className }) => {
  const tags = tagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean) as ChallengeTag[];
  if (tags.length === 0) return null;
  return (
    <View className={cn('flex-row flex-wrap gap-2', className)}>
      {tags.map((tag) => (
        <DataBadge key={tag.id} tag={tag} />
      ))}
    </View>
  );
};
