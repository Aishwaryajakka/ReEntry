/**
 * Tolerance Tab — "Your Tolerance Areas"
 *
 * Per-category summaries derived from the authenticated student's activity logs.
 * No medical scores, no recovery percentages, no predictions.
 * Allowed trend labels only: Improving in records, Mixed in records,
 * More difficult in recent records, Not enough records yet.
 */

import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useRouter, type RelativePathString } from 'expo-router';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { CategoryIcon } from '@/components/Icons';
import { useAppContext } from '@/context/AppContext';
import { TOLERANCE_LABELS } from '@/data/activityCatalog';
import { ACTIVITY_CATEGORIES } from '@/data/types';
import type { ActivityLog } from '@/data/types';
import { COLORS, useThemeColors } from '@/lib/theme';
import {
  average,
  compareEarlierAndRecent,
  groupActivityLogsByCategory,
} from '@/lib/activityAnalysis';

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
          color: isNegative ? COLORS.rust : isPositive ? COLORS.moss : theme.foreground,
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
        <MicroText className="text-muted-foreground">
          Average manageability: {TOLERANCE_LABELS[avgRounded as 1 | 2 | 3]}
        </MicroText>
      )}
    </View>
  );
}

export default function ToleranceScreen() {
  const { activityLogs } = useAppContext();
  const router = useRouter();

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

  const overallPattern = useMemo(() => {
    const all = activityLogs.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (all.length < 4) return 'Not enough records yet';
    const trend = compareEarlierAndRecent(all.map((log) => log.toleranceRating));
    if (trend === 'improving') return 'Improving in records';
    if (trend === 'more-difficult') return 'More difficult in recent records';
    return 'Mixed in records';
  }, [activityLogs]);

  const topCategory = categorySummaries.find((c) => c.count > 0);
  const totalCount = activityLogs.length;
  const categoryWithRecords = categorySummaries.filter((c) => c.count > 0);

  return (
    <ScreenShell>
      <EditorialLabel className="mb-3">Tolerance</EditorialLabel>
      <HeadingText className="mb-2 leading-tight">Your tolerance{"\n"}areas</HeadingText>
      <LabelText className="mb-5 leading-5">
        Based on your activity logs. Patterns compare earlier and recent entries.
      </LabelText>

      {/* Overall summary or empty state */}
      {totalCount === 0 ? (
        <SectionCard className="mb-5 items-center py-8">
          <Text className="text-xl font-semibold text-foreground mb-2">Your tolerance map starts here</Text>
          <MicroText className="text-center leading-5 mb-5 px-4">
            Log activities from your day and ReEntry will begin showing which parts of school and everyday life feel more or less manageable.
          </MicroText>
          <PrimaryButton
            label="Log an activity"
            onPress={() => router.navigate('/(app)/(tabs)/today' as RelativePathString)}
            className="w-full mb-3"
          />
          <MicroText className="text-center text-muted-foreground leading-5">
            Patterns appear as you add real experiences.
          </MicroText>
        </SectionCard>
      ) : (
        <SectionCard className="mb-5 border-l-4 border-l-secondary">
          <View>
            <MicroText className="mb-2 text-muted-foreground">
              You reported {totalCount} activity{totalCount !== 1 ? 'ies' : 'y'} across {categoryWithRecords.length} categor{categoryWithRecords.length !== 1 ? 'ies' : 'y'}.
            </MicroText>
            <LabelText className="leading-5">
              {overallPattern === 'Not enough records yet'
                ? 'Keep logging activities. A clearer comparison will appear after a few more entries.'
                : `Compared with earlier entries, your recent reports are ${overallPattern.toLowerCase()}.`}
            </LabelText>
          </View>
        </SectionCard>
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

      {topCategory && (
        <SectionCard className="mb-4 border-l-4 border-l-accent">
          <MicroText className="mb-1 text-muted-foreground">Your records show</MicroText>
          <LabelText className="leading-5">
            {topCategory.key} is your most-logged category ({topCategory.count} record{topCategory.count !== 1 ? 's' : ''}).
            {topCategory.trend === 'Not enough records yet'
              ? ' Log more to see a trend.'
              : ` Compared with earlier entries, this category is ${topCategory.trend.toLowerCase()}.`}
          </LabelText>
        </SectionCard>
      )}

      <View className="mt-2 px-1">
        <MicroText className="text-center leading-5">
          These are self-reported observations. They are not a diagnosis, severity estimate, or medical recommendation.
        </MicroText>
      </View>
    </ScreenShell>
  );
}
