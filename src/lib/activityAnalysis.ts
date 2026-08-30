import type { ActivityLog } from '@/data/types';

export type RecordTrend = 'improving' | 'more-difficult' | 'mixed';

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function groupActivityLogsByCategory(
  logs: ActivityLog[],
): Map<string, ActivityLog[]> {
  const grouped = new Map<string, ActivityLog[]>();

  for (const log of logs) {
    const categoryLogs = grouped.get(log.activityCategory) ?? [];
    categoryLogs.push(log);
    grouped.set(log.activityCategory, categoryLogs);
  }

  return grouped;
}

export function compareEarlierAndRecent(
  values: number[],
  threshold = 0.25,
): RecordTrend {
  const midpoint = Math.floor(values.length / 2);
  const earlierAverage = average(values.slice(0, midpoint));
  const recentAverage = average(values.slice(midpoint));

  if (recentAverage - earlierAverage > threshold) return 'improving';
  if (earlierAverage - recentAverage > threshold) return 'more-difficult';
  return 'mixed';
}

export interface RecurringTagRecord {
  count: number;
  logs: ActivityLog[];
}

export function countChallengeTags(
  logs: ActivityLog[],
): Map<string, RecurringTagRecord> {
  const counts = new Map<string, RecurringTagRecord>();

  for (const log of logs) {
    for (const tagId of log.challengeTagIds) {
      const existing = counts.get(tagId) ?? { count: 0, logs: [] };
      existing.count += 1;
      existing.logs.push(log);
      counts.set(tagId, existing);
    }
  }

  return counts;
}
