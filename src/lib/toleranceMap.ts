import type { ActivityLog } from '@/data/types';

export type ToleranceDimensionId =
  | 'class-school'
  | 'screens'
  | 'reading'
  | 'noise-busy'
  | 'concentration'
  | 'physical'
  | 'social';

export type ToleranceDimensionState =
  | 'No records yet'
  | 'Limited records'
  | 'Mostly manageable in recent records'
  | 'Mixed in recent records'
  | 'Often difficult in recent records';

interface DimensionDefinition {
  id: ToleranceDimensionId;
  label: string;
  supports: (activity: ActivityLog) => boolean;
  relevantChallengeTagIds: string[];
}

const DIMENSIONS: DimensionDefinition[] = [
  { id: 'class-school', label: 'Class / School', supports: (log) => log.activityCategory === 'Class', relevantChallengeTagIds: [] },
  { id: 'screens', label: 'Screens', supports: (log) => log.activityCategory === 'Screens' || log.challengeTagIds.includes('ct-screen'), relevantChallengeTagIds: ['ct-screen'] },
  { id: 'reading', label: 'Reading', supports: (log) => log.activityCategory === 'Reading', relevantChallengeTagIds: [] },
  { id: 'noise-busy', label: 'Noise / Busy', supports: (log) => log.activityCategory === 'Noise/busy environment' || log.challengeTagIds.includes('ct-noise') || log.challengeTagIds.includes('ct-crowded'), relevantChallengeTagIds: ['ct-noise', 'ct-crowded'] },
  { id: 'concentration', label: 'Concentration', supports: (log) => log.challengeTagIds.includes('ct-conc'), relevantChallengeTagIds: ['ct-conc'] },
  { id: 'physical', label: 'Physical Activity', supports: (log) => log.activityCategory === 'Physical activity', relevantChallengeTagIds: [] },
  { id: 'social', label: 'Social Activity', supports: (log) => log.activityCategory === 'Social activity', relevantChallengeTagIds: [] },
];

export type ToleranceCellState = 'Manageable' | 'Some difficulty' | 'Very difficult' | 'No record';

export interface ToleranceMapCell {
  date: string;
  state: ToleranceCellState;
  supportingActivities: ActivityLog[];
}

export interface ToleranceDimension {
  id: ToleranceDimensionId;
  label: string;
  state: ToleranceDimensionState;
  supportCount: number;
  /** Internal plotting value only. Null means the minimum-data gate was not met. */
  plotValue: number | null;
  supportingActivities: ActivityLog[];
  relevantChallengeTagIds: string[];
  cells: ToleranceMapCell[];
}

export interface ToleranceMapResult {
  dimensions: ToleranceDimension[];
  recentActivities: ActivityLog[];
  firstDate: string | null;
  lastDate: string | null;
  recordedDays: number;
  recordedDates: string[];
}

function stateFor(count: number, average: number): ToleranceDimensionState {
  if (count === 0) return 'No records yet';
  if (count < 3) return 'Limited records';
  if (average >= 0.67) return 'Mostly manageable in recent records';
  if (average >= 0.34) return 'Mixed in recent records';
  return 'Often difficult in recent records';
}

function plotRating(rating: ActivityLog['toleranceRating']): number {
  if (rating === 3) return 1;
  if (rating === 2) return 0.5;
  return 0;
}

function cellState(activities: ActivityLog[]): ToleranceCellState {
  if (activities.length === 0) return 'No record';
  const average = activities.reduce((sum, activity) => sum + plotRating(activity.toleranceRating), 0) / activities.length;
  if (average >= 0.75) return 'Manageable';
  if (average >= 0.25) return 'Some difficulty';
  return 'Very difficult';
}

export function buildToleranceMap(activityLogs: ActivityLog[]): ToleranceMapResult {
  const orderedDates = Array.from(new Set(activityLogs.map((log) => log.date))).sort();
  const recentDates = orderedDates.slice(-7);
  const dateSet = new Set(recentDates);
  const recentActivities = activityLogs
    .filter((log) => dateSet.has(log.date))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const dimensions = DIMENSIONS.map((definition): ToleranceDimension => {
    const supportingActivities = recentActivities.filter(definition.supports);
    const average = supportingActivities.length === 0
      ? 0
      : supportingActivities.reduce((sum, activity) => sum + plotRating(activity.toleranceRating), 0) / supportingActivities.length;
    const eligible = supportingActivities.length >= 3;
    return {
      id: definition.id,
      label: definition.label,
      state: stateFor(supportingActivities.length, average),
      supportCount: supportingActivities.length,
      plotValue: eligible ? average : null,
      supportingActivities,
      relevantChallengeTagIds: definition.relevantChallengeTagIds,
      cells: recentDates.map((date) => {
        const activities = supportingActivities.filter((activity) => activity.date === date);
        return { date, state: cellState(activities), supportingActivities: activities };
      }),
    };
  });

  return {
    dimensions,
    recentActivities,
    firstDate: recentDates[0] ?? null,
    lastDate: recentDates[recentDates.length - 1] ?? null,
    recordedDays: recentDates.length,
    recordedDates: recentDates,
  };
}
