/**
 * Tolerance Tab — "Your Tolerance Areas"
 *
 * Per-category summaries derived from the authenticated student's activity logs.
 * No medical scores, no recovery percentages, no predictions.
 * Allowed trend labels only: Improving in records, Mixed in records,
 * More difficult in recent records, Not enough records yet.
 */

import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, type RelativePathString } from 'expo-router';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { CategoryIcon } from '@/components/Icons';
import { StudentPageHeader } from '@/components/StudentPageHeader';
import { VisualToleranceMap } from '@/components/VisualToleranceMap';
import { useAppContext } from '@/context/AppContext';
import { CHALLENGE_TAGS, TOLERANCE_LABELS } from '@/data/activityCatalog';
import { ACTIVITY_CATEGORIES } from '@/data/types';
import type { ActivityLog } from '@/data/types';
import { COLORS, useThemeColors } from '@/lib/theme';
import {
  average,
  compareEarlierAndRecent,
  groupActivityLogsByCategory,
} from '@/lib/activityAnalysis';
import { buildToleranceMap, type ToleranceDimensionId } from '@/lib/toleranceMap';

const CATEGORY_CONFIG: Record<string, { color: string }> = {
  Reading: { color: COLORS.moss },
  Screens: { color: COLORS.brightYellow },
  Class: { color: COLORS.turmeric },
  Homework: { color: COLORS.moss },
  'Noise/busy environment': { color: COLORS.rust },
  'Physical activity': { color: COLORS.moss },
  'Social activity': { color: COLORS.turmeric },
  Transportation: { color: COLORS.moss },
  Other: { color: COLORS.moss },
};

type TrendLabel = 'Improving in records' | 'Mixed in records' | 'More difficult in recent records' | 'Not enough records yet';

interface CategorySummary {
  key: string;
  count: number;
  manageable: number;
  someDifficulty: number;
  veryDifficult: number;
  avg: number | null;
  trend: TrendLabel;
  color: string;
}

function formatMapDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatEvidenceDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function deriveTrend(ratings: number[]): TrendLabel {
  if (ratings.length < 4) return 'Not enough records yet';

  const trend = compareEarlierAndRecent(ratings);
  if (trend === 'improving') return 'Improving in records';
  if (trend === 'more-difficult') return 'More difficult in recent records';
  return 'Mixed in records';
}

function summarizeCategory(category: string, logs: ActivityLog[]): CategorySummary {
  const ratings = logs.map((l) => l.toleranceRating);
  const manageable = ratings.filter((r) => r === 3).length;
  const someDifficulty = ratings.filter((r) => r === 2).length;
  const veryDifficult = ratings.filter((r) => r === 1).length;
  const avg = ratings.length > 0 ? average(ratings) : null;
  const trend = deriveTrend(ratings);

  return {
    key: category,
    count: logs.length,
    manageable,
    someDifficulty,
    veryDifficult,
    avg,
    trend,
    color: CATEGORY_CONFIG[category]?.color ?? COLORS.moss,
  };
}

function TrendBadge({ trend }: { trend: TrendLabel }) {
  const theme = useThemeColors();
  const isPositive = trend === 'Improving in records';
  const isNegative = trend === 'More difficult in recent records';

  return (
    <View
      className="rounded-lg px-2.5 py-1.5 border"
      style={{
        borderColor: isNegative ? COLORS.rust : theme.border,
        backgroundColor: isPositive ? `${COLORS.moss}20` : isNegative ? `${COLORS.rust}15` : theme.mossLight,
        maxWidth: 140,
        flexShrink: 1,
      }}
    >
      <Text
        className="text-xs font-medium text-center"
        numberOfLines={2}
        style={{
          color: isNegative ? theme.foreground : isPositive ? theme.moss : theme.foreground,
        }}
      >
        {trend}
      </Text>
    </View>
  );
}

function CategoryCard({ summary }: { summary: CategorySummary }) {
  const theme = useThemeColors();
  const avgRounded = summary.avg !== null ? Math.round(summary.avg) : null;

  return (
    <View
      className="bg-card rounded-2xl p-4 border border-border mb-3"
      style={[{ borderCurve: 'continuous' } as object]}
    >
      <View className="flex-row items-center justify-between mb-3 gap-3">
        <View className="flex-row items-center gap-3 flex-1 min-w-0">
          <View
            className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${summary.color}20` }}
          >
            <CategoryIcon category={summary.key} size={20} color={theme.foreground} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>{summary.key}</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {summary.count} record{summary.count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <TrendBadge trend={summary.trend} />
      </View>

      <View className="flex-row gap-2 mb-3">
        <View className="flex-1 min-w-0 bg-muted rounded-xl p-2.5 items-center">
          <Text className="text-lg font-bold text-foreground">{summary.manageable}</Text>
          <Text className="text-xs text-muted-foreground text-center" numberOfLines={2}>Manageable</Text>
        </View>
        <View className="flex-1 min-w-0 bg-muted rounded-xl p-2.5 items-center">
          <Text className="text-lg font-bold text-foreground">{summary.someDifficulty}</Text>
          <Text className="text-xs text-muted-foreground text-center" numberOfLines={2}>Some difficulty</Text>
        </View>
        <View className="flex-1 min-w-0 bg-muted rounded-xl p-2.5 items-center">
          <Text className="text-lg font-bold text-foreground">{summary.veryDifficult}</Text>
          <Text className="text-xs text-muted-foreground text-center" numberOfLines={2}>Very difficult</Text>
        </View>
      </View>

      {avgRounded !== null && (
        <MicroText className="border-t border-border pt-3 text-muted-foreground">
          Average manageability: {TOLERANCE_LABELS[avgRounded as 1 | 2 | 3]}
        </MicroText>
      )}
    </View>
  );
}

export default function ToleranceScreen() {
  const { activityLogs, lowStimulationMode } = useAppContext();
  const theme = useThemeColors();
  const router = useRouter();
  const [selectedDimensionId, setSelectedDimensionId] = useState<ToleranceDimensionId>('class-school');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const categorySummaries = useMemo<CategorySummary[]>(() => {
    const sortedLogs = activityLogs
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    const byCategory = groupActivityLogsByCategory(sortedLogs);
    for (const category of ACTIVITY_CATEGORIES) {
      if (!byCategory.has(category)) byCategory.set(category, []);
    }

    return Array.from(byCategory.entries())
      .map(([category, logs]) => summarizeCategory(category, logs))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [activityLogs]);

  const totalCount = activityLogs.length;
  const categoryWithRecords = categorySummaries.filter((c) => c.count > 0);
  const toleranceMap = useMemo(() => buildToleranceMap(activityLogs), [activityLogs]);
  const selectedDimension = toleranceMap.dimensions.find((dimension) => dimension.id === selectedDimensionId) ?? toleranceMap.dimensions[0];
  const selectedCell = selectedDate
    ? selectedDimension.cells.find((cell) => cell.date === selectedDate) ?? null
    : null;
  const selectedActivities = selectedCell?.supportingActivities ?? selectedDimension.supportingActivities;
  const selectedState = selectedCell?.state ?? selectedDimension.state;
  const recentWindow = toleranceMap.firstDate && toleranceMap.lastDate
    ? `${formatMapDate(toleranceMap.firstDate)}–${formatMapDate(toleranceMap.lastDate)}`
    : null;

  return (
    <ScreenShell className="max-w-[880px]">
      <StudentPageHeader className="mb-3" />
      <EditorialLabel className="mb-3">Tolerance</EditorialLabel>
      <HeadingText className="mb-2 leading-tight">Your tolerance areas</HeadingText>
      <LabelText className="mb-5 leading-5">
        What has been manageable lately? This view describes your recent activity records.
      </LabelText>

      <SectionCard className="mb-5">
        <View className="mb-2 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <SubheadingText>Functional Tolerance Map</SubheadingText>
            <MicroText className="mt-1 leading-5 text-muted-foreground">Based on how manageable your recent activities felt.</MicroText>
          </View>
          <View className="max-w-[130px] items-end">
            <MicroText className="text-right leading-4 text-muted-foreground">{recentWindow ?? 'No recent records yet'}</MicroText>
            {recentWindow ? (
              <View className="mt-1 flex-row items-baseline gap-1">
                <Text className="text-lg font-bold" style={{ color: theme.turmeric }}>{toleranceMap.recentActivities.length}</Text>
                <MicroText className="text-muted-foreground">recent</MicroText>
              </View>
            ) : null}
          </View>
        </View>
        <VisualToleranceMap
          dimensions={toleranceMap.dimensions}
          recordedDates={toleranceMap.recordedDates}
          selectedId={selectedDimension.id}
          selectedDate={selectedDate}
          onSelect={(dimensionId, date) => {
            setSelectedDimensionId(dimensionId);
            setSelectedDate(date);
          }}
          lowStimulation={lowStimulationMode}
        />
      </SectionCard>

      <SectionCard className="mb-5 border-l-4 border-l-accent">
        <SubheadingText className="mb-1">{selectedDimension.label}</SubheadingText>
        {selectedDate && <MicroText className="mb-1 font-semibold text-muted-foreground">{formatEvidenceDate(selectedDate)}</MicroText>}
        <LabelText className="mb-1 leading-5">{selectedState}</LabelText>
        <View className="mb-4 flex-row items-baseline gap-1.5">
          <Text className="text-xl font-bold" style={{ color: theme.turmeric }}>{selectedActivities.length}</Text>
          <MicroText className="text-muted-foreground">
            supporting record{selectedActivities.length === 1 ? '' : 's'}{selectedDate ? ' on this day' : ' across recent recorded days'}
          </MicroText>
        </View>
        {selectedActivities.length > 0 ? (
          <View>
            {selectedActivities.map((activity) => {
              const relevantTags = activity.challengeTagIds
                .filter((tagId) => selectedDimension.relevantChallengeTagIds.includes(tagId))
                .map((tagId) => CHALLENGE_TAGS.find((tag) => tag.id === tagId)?.label)
                .filter((label): label is string => Boolean(label));
              return (
                <View key={activity.id} className="border-t border-border py-3 first:border-t-0">
                  <View className="flex-row items-start justify-between gap-3">
                    <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={2}>{activity.customLabel || activity.activityCategory}</Text>
                    <MicroText className="text-muted-foreground">{formatMapDate(activity.date)}</MicroText>
                  </View>
                  <MicroText className="mt-1 text-muted-foreground">{TOLERANCE_LABELS[activity.toleranceRating]} · {activity.durationMinutes} min</MicroText>
                  {relevantTags.length > 0 && (
                    <MicroText className="mt-1 text-muted-foreground">Relevant tags: {relevantTags.join(', ')}</MicroText>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <LabelText className="leading-5 text-muted-foreground">
            {selectedDate ? 'No supporting activities were recorded for this area on this date.' : 'No recent activities support this area yet.'}
          </LabelText>
        )}
      </SectionCard>

      {totalCount === 0 && (
        <PrimaryButton label="Log an activity" onPress={() => router.navigate('/(app)/(tabs)/today' as RelativePathString)} className="mb-5 w-full" />
      )}

      {/* Per-category cards */}
      {categoryWithRecords.length > 0 && (
        <>
          <SubheadingText className="mb-3">By category</SubheadingText>
          <View className="mb-2">
            {categoryWithRecords.map((summary) => (
              <CategoryCard key={summary.key} summary={summary} />
            ))}
          </View>
        </>
      )}

      <View className="mt-2 px-1">
        <MicroText className="text-center leading-5">
          These are self-reported observations. They are not a diagnosis, severity estimate, or medical recommendation.
        </MicroText>
      </View>
    </ScreenShell>
  );
}
