import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { SecondaryButton } from '@/components/Buttons';
import { SectionCard } from '@/components/SectionCard';
import { HeadingText, LabelText, MicroText } from '@/components/Typography';
import { CHALLENGE_TAGS, TOLERANCE_LABELS } from '@/data/activityCatalog';
import type { ActivityLog } from '@/data/types';
import {
  analyzePersonalizedPatterns,
  type PersonalizedPattern,
} from '@/lib/patternModel';
import { useThemeColors } from '@/lib/theme';

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function PatternCard({
  pattern,
  activities,
}: {
  pattern: PersonalizedPattern;
  activities: Map<string, ActivityLog>;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeColors();
  const evidence = pattern.supportingActivityIds
    .map((id) => activities.get(id))
    .filter((activity): activity is ActivityLog => Boolean(activity));

  return (
    <View className="border-t border-border py-4 first:border-t-0">
      <Text className="mb-1 text-base font-semibold leading-5 text-foreground">{pattern.title}</Text>
      <LabelText className="mb-2 leading-5 text-muted-foreground">
        {pattern.description}
      </LabelText>
      <View className="mb-3 flex-row flex-wrap items-center gap-2">
        <MicroText className="text-muted-foreground">Evidence strength: {pattern.strength}</MicroText>
        <View className="rounded-full border px-2 py-1" style={{ borderColor: theme.turmeric, backgroundColor: `${theme.turmeric}22` }}>
          <Text className="text-xs font-bold" style={{ color: theme.foreground }}>{pattern.supportCount} supporting records</Text>
        </View>
      </View>
      <SecondaryButton
        label={expanded ? 'Hide details' : 'Why am I seeing this?'}
        onPress={() => setExpanded((value) => !value)}
        className="self-start rounded-full px-4 py-2"
        style={{ minHeight: 44 }}
        accessibilityLabel={expanded ? 'Hide evidence for this pattern' : 'Show evidence for this pattern'}
      />
      {expanded ? (
        <View className="mt-3 border-t border-border pt-3">
          <MicroText className="mb-3 leading-5 text-muted-foreground">
            These are actual activities from your records that align with this association.
          </MicroText>
          {evidence.map((activity) => {
            const tags = activity.challengeTagIds
              .map((id) => CHALLENGE_TAGS.find((tag) => tag.id === id)?.label)
              .filter((label): label is string => Boolean(label));
            return (
              <View key={activity.id} className="mb-3">
                <Text className="text-sm font-medium text-foreground">
                  {formatDate(activity.date)} · {activity.customLabel || activity.activityCategory}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {TOLERANCE_LABELS[activity.toleranceRating]} · {activity.durationMinutes} min
                </Text>
                {tags.length > 0 ? (
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    Tags: {tags.join(', ')}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function RecoveryStory({ activityLogs }: { activityLogs: ActivityLog[] }) {
  const theme = useThemeColors();
  const result = useMemo(
    () => analyzePersonalizedPatterns(activityLogs),
    [activityLogs],
  );
  const activities = useMemo(
    () => new Map(activityLogs.map((activity) => [activity.id, activity])),
    [activityLogs],
  );

  if (result.status !== 'ready') {
    return (
      <SectionCard className="mb-5 border-l-4 border-l-accent">
        <HeadingText className="mb-2 text-xl">AI-assisted patterns</HeadingText>
        <MicroText className="mb-3 text-muted-foreground">
          Personalized analysis of your own activity records.
        </MicroText>
        <LabelText className="mb-2 text-base leading-5">Building your pattern map</LabelText>
        <LabelText className="mb-2 leading-5 text-muted-foreground">
          Keep recording everyday activities with different manageability ratings so personalized associations can be evaluated.
        </LabelText>
        <MicroText className="leading-5 text-muted-foreground">
          {result.metadata.trainingRecords} activity record{result.metadata.trainingRecords === 1 ? '' : 's'} available. ReEntry only shows AI-assisted patterns when there is enough varied data and the validation check is usable.
        </MicroText>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="mb-5 border-l-4 border-l-accent">
      <View className="mb-2 flex-row items-center justify-between gap-2">
        <HeadingText className="flex-1 text-xl">AI-assisted patterns</HeadingText>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${theme.turmeric}22` }}>
          <Text className="text-xs font-bold" style={{ color: theme.foreground }}>
            {result.patterns.length} pattern{result.patterns.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
      <LabelText className="mb-2 leading-5">
        Personalized analysis of your own activity records.
      </LabelText>
      <MicroText className="mb-2 leading-5 text-muted-foreground">
        ReEntry looks for associations in what you recorded. These observations do not diagnose, predict recovery, or replace clinical judgment.
      </MicroText>
      <View className="mb-4 flex-row items-baseline gap-1.5">
        <Text className="text-lg font-bold" style={{ color: theme.turmeric }}>{result.metadata.trainingRecords}</Text>
        <MicroText className="text-muted-foreground">activity records analyzed</MicroText>
      </View>
      {result.patterns.map((pattern) => (
        <PatternCard key={pattern.id} pattern={pattern} activities={activities} />
      ))}
    </SectionCard>
  );
}
