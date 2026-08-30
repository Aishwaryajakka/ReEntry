/**
 * Recovery Story — deterministic observational patterns drawn from the
 * authenticated student's own activity_logs, challenge_tags, and daily_checkins.
 *
 * No invented evidence. No diagnosis, severity, or recovery predictions.
 */

import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { SectionCard } from '@/components/SectionCard';
import { SecondaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText } from '@/components/Typography';
import { useThemeColors } from '@/lib/theme';
import { CHALLENGE_TAGS, TOLERANCE_LABELS } from '@/data/mayaDataset';
import type { ActivityLog, DailyCheckIn } from '@/data/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function strengthLabel(count: number): { text: string; threshold: number } {
  if (count >= 4) return { text: 'Evidence strength: Recurring pattern', threshold: 4 };
  if (count >= 2) return { text: 'Evidence strength: Limited', threshold: 2 };
  return { text: 'Evidence strength: Not enough records', threshold: 0 };
}

interface EvidenceItem {
  date: string;
  label: string;
  value: string;
  tags?: string[];
}

interface Pattern {
  id: string;
  title: string;
  strength: string;
  evidence: EvidenceItem[];
}

type TagMaster = { id: string; label: string; category?: 'environmental' | 'cognitive' | 'social' | 'physical' };

function getTagMaster(tagId: string): TagMaster | undefined {
  return CHALLENGE_TAGS.find((t) => t.id === tagId);
}

function buildPatterns(
  activityLogs: ActivityLog[],
  dailyCheckIns: DailyCheckIn[],
): Pattern[] {
  const patterns: Pattern[] = [];
  const sortedLogs = [...activityLogs].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Recurring activity-category difficulty
  const byCategory = new Map<string, ActivityLog[]>();
  for (const log of sortedLogs) {
    const list = byCategory.get(log.activityCategory) ?? [];
    list.push(log);
    byCategory.set(log.activityCategory, list);
  }

  for (const [category, logs] of byCategory.entries()) {
    if (logs.length < 2) continue;
    const ratings = logs.map((l) => l.toleranceRating);
    const avg = average(ratings);
    const rounded = Math.round(avg) as 1 | 2 | 3;
    const label = TOLERANCE_LABELS[rounded];
    const evidence = logs.map((l) => ({
      date: l.date,
      label: l.customLabel || l.activityCategory,
      value: `${TOLERANCE_LABELS[l.toleranceRating]}${l.durationMinutes > 0 ? ` · ${l.durationMinutes} min` : ''}`,
      tags: l.challengeTagIds.map((id) => getTagMaster(id)?.label).filter(Boolean) as string[],
    }));
    patterns.push({
      id: `cat-${category}`,
      title: `Your records show ${category} is usually ${label.toLowerCase()}`,
      strength: strengthLabel(logs.length).text,
      evidence,
    });

    // Earlier vs recent for this category
    if (logs.length >= 4) {
      const mid = Math.floor(logs.length / 2);
      const earlier = logs.slice(0, mid);
      const recent = logs.slice(mid);
      const earlierAvg = average(earlier.map((l) => l.toleranceRating));
      const recentAvg = average(recent.map((l) => l.toleranceRating));
      if (Math.abs(recentAvg - earlierAvg) > 0.25) {
        const direction = recentAvg > earlierAvg ? 'Improving' : 'More difficult';
        const evidenceItems = [...earlier, ...recent].map((l) => ({
          date: l.date,
          label: l.customLabel || l.activityCategory,
          value: `${TOLERANCE_LABELS[l.toleranceRating]}${l.durationMinutes > 0 ? ` · ${l.durationMinutes} min` : ''}`,
          tags: l.challengeTagIds.map((id) => getTagMaster(id)?.label).filter(Boolean) as string[],
        }));
        patterns.push({
          id: `cat-trend-${category}`,
          title: `Compared with earlier entries, ${category} is ${direction.toLowerCase()} in recent records`,
          strength: strengthLabel(logs.length).text,
          evidence: evidenceItems,
        });
      }
    }
  }

  // 2. Recurring challenge tags
  const tagCounts = new Map<string, { label: string; count: number; logs: ActivityLog[] }>();
  for (const log of sortedLogs) {
    for (const tagId of log.challengeTagIds) {
      const master = getTagMaster(tagId);
      if (!master) continue;
      const existing = tagCounts.get(master.id) ?? { label: master.label, count: 0, logs: [] };
      existing.count += 1;
      existing.logs.push(log);
      tagCounts.set(master.id, existing);
    }
  }

  for (const [tagId, { label, count, logs }] of tagCounts.entries()) {
    if (count < 2) continue;
    patterns.push({
      id: `tag-${tagId}`,
      title: `This pattern appeared: ${label} reported across ${count} activities`,
      strength: strengthLabel(count).text,
      evidence: logs.map((l) => ({
        date: l.date,
        label: l.customLabel || l.activityCategory,
        value: `${TOLERANCE_LABELS[l.toleranceRating]}${l.durationMinutes > 0 ? ` · ${l.durationMinutes} min` : ''}`,
        tags: l.challengeTagIds.map((id) => getTagMaster(id)?.label).filter(Boolean) as string[],
      })),
    });
  }

  // 3. Screen / noise / concentration patterns
  const sensoryTagIds = CHALLENGE_TAGS.filter((t) => t.category === 'environmental').map((t) => t.id);
  const sensoryLogs = sortedLogs.filter((l) => l.challengeTagIds.some((id) => sensoryTagIds.includes(id)));
  if (sensoryLogs.length >= 2) {
    const tagLabelSet = new Set<string>();
    for (const l of sensoryLogs) {
      for (const id of l.challengeTagIds) {
        const master = getTagMaster(id);
        if (master?.category === 'environmental') tagLabelSet.add(master.label);
      }
    }
    patterns.push({
      id: 'sensory',
      title: `Your records show environmental factors (${Array.from(tagLabelSet).slice(0, 3).join(', ')}) appearing in your activity logs`,
      strength: strengthLabel(sensoryLogs.length).text,
      evidence: sensoryLogs.map((l) => ({
        date: l.date,
        label: l.customLabel || l.activityCategory,
        value: `${TOLERANCE_LABELS[l.toleranceRating]}${l.durationMinutes > 0 ? ` · ${l.durationMinutes} min` : ''}`,
        tags: l.challengeTagIds
          .map((id) => getTagMaster(id))
          .filter((t) => t?.category === 'environmental')
          .map((t) => t?.label)
          .filter(Boolean) as string[],
      })),
    });
  }

  // 4. Cognitive / concentration patterns
  const cognitiveTagIds = CHALLENGE_TAGS.filter((t) => t.category === 'cognitive').map((t) => t.id);
  const cognitiveLogs = sortedLogs.filter((l) => l.challengeTagIds.some((id) => cognitiveTagIds.includes(id)));
  if (cognitiveLogs.length >= 2) {
    const tagLabelSet = new Set<string>();
    for (const l of cognitiveLogs) {
      for (const id of l.challengeTagIds) {
        const master = getTagMaster(id);
        if (master?.category === 'cognitive') tagLabelSet.add(master.label);
      }
    }
    patterns.push({
      id: 'cognitive',
      title: `Your records show cognitive challenges (${Array.from(tagLabelSet).slice(0, 3).join(', ')}) appearing in your activity logs`,
      strength: strengthLabel(cognitiveLogs.length).text,
      evidence: cognitiveLogs.map((l) => ({
        date: l.date,
        label: l.customLabel || l.activityCategory,
        value: `${TOLERANCE_LABELS[l.toleranceRating]}${l.durationMinutes > 0 ? ` · ${l.durationMinutes} min` : ''}`,
        tags: l.challengeTagIds
          .map((id) => getTagMaster(id))
          .filter((t) => t?.category === 'cognitive')
          .map((t) => t?.label)
          .filter(Boolean) as string[],
      })),
    });
  }

  // 5. Overall earlier-vs-recent trend when enough records exist
  if (sortedLogs.length >= 4) {
    const mid = Math.floor(sortedLogs.length / 2);
    const earlier = sortedLogs.slice(0, mid);
    const recent = sortedLogs.slice(mid);
    const earlierAvg = average(earlier.map((l) => l.toleranceRating));
    const recentAvg = average(recent.map((l) => l.toleranceRating));
    if (Math.abs(recentAvg - earlierAvg) > 0.25) {
      const direction = recentAvg > earlierAvg ? 'Improving' : 'More difficult';
      patterns.push({
        id: 'overall-trend',
        title: `Compared with earlier entries, your recent activity reports are ${direction.toLowerCase()}`,
        strength: strengthLabel(sortedLogs.length).text,
        evidence: [...earlier, ...recent].map((l) => ({
          date: l.date,
          label: l.customLabel || l.activityCategory,
          value: `${TOLERANCE_LABELS[l.toleranceRating]}${l.durationMinutes > 0 ? ` · ${l.durationMinutes} min` : ''}`,
          tags: l.challengeTagIds.map((id) => getTagMaster(id)?.label).filter(Boolean) as string[],
        })),
      });
    }
  }

  // 6. Daily check-in overall-feeling pattern (optional, uses only real check-ins)
  if (dailyCheckIns.length >= 4) {
    const sortedCheckins = [...dailyCheckIns].sort((a, b) => a.date.localeCompare(b.date));
    const mid = Math.floor(sortedCheckins.length / 2);
    const earlier = sortedCheckins.slice(0, mid);
    const recent = sortedCheckins.slice(mid);
    const earlierAvg = average(earlier.map((c) => c.overallFeeling));
    const recentAvg = average(recent.map((c) => c.overallFeeling));
    if (Math.abs(recentAvg - earlierAvg) > 0.25) {
      const direction = recentAvg > earlierAvg ? 'Improving' : 'More difficult';
      patterns.push({
        id: 'checkin-trend',
        title: `Compared with earlier entries, your daily check-ins are ${direction.toLowerCase()}`,
        strength: strengthLabel(sortedCheckins.length).text,
        evidence: sortedCheckins.map((c) => ({
          date: c.date,
          label: 'Daily check-in',
          value: `Overall feeling ${c.overallFeeling}/5`,
        })),
      });
    }
  }

  return patterns;
}

function PatternCard({ pattern, lowStimulationMode }: { pattern: Pattern; lowStimulationMode: boolean }) {
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const reduced = lowStimulationMode;

  return (
    <View className="bg-muted rounded-2xl p-4 mb-3">
      <LabelText className="leading-5 mb-1" numberOfLines={3}>
        {pattern.title}
      </LabelText>
      <MicroText className="text-muted-foreground mb-3">{pattern.strength}</MicroText>
      <SecondaryButton
        label={expanded ? 'Hide details' : 'Why am I seeing this?'}
        onPress={() => setExpanded((v) => !v)}
        className="self-start rounded-full px-3 py-1"
        style={{ minHeight: 44 }}
        accessibilityLabel={expanded ? 'Hide evidence for this pattern' : 'Show evidence for this pattern'}
      />
      {expanded && (
        <View className="mt-3 pt-3 border-t border-border">
          <MicroText className="text-muted-foreground mb-2">
            These entries are from your own records. ReEntry does not diagnose or predict recovery.
          </MicroText>
          {pattern.evidence.map((item, idx) => (
            <View key={idx} className="mb-2">
              <Text className="text-sm font-medium text-foreground">
                {formatDate(item.date)} · {item.label}
              </Text>
              <Text className="text-sm text-muted-foreground">{item.value}</Text>
              {item.tags && item.tags.length > 0 && (
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Tags: {item.tags.join(', ')}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface RecoveryStoryProps {
  activityLogs: ActivityLog[];
  dailyCheckIns: DailyCheckIn[];
  lowStimulationMode: boolean;
}

export function RecoveryStory({ activityLogs, dailyCheckIns, lowStimulationMode }: RecoveryStoryProps) {
  const patterns = useMemo(() => buildPatterns(activityLogs, dailyCheckIns), [activityLogs, dailyCheckIns]);
  const totalRecords = activityLogs.length + dailyCheckIns.length;

  if (totalRecords < 2) {
    return (
      <SectionCard className="mb-5 border-l-4 border-l-accent">
        <HeadingText className="text-xl mb-2">Recovery Story</HeadingText>
        <LabelText className="leading-5 mb-2">
          Patterns will appear as you log more activities and daily check-ins.
        </LabelText>
        <MicroText className="text-muted-foreground">
          Recovery Story is built only from your own records. ReEntry does not diagnose or predict recovery.
        </MicroText>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="mb-5 border-l-4 border-l-accent">
      <View className="flex-row items-center justify-between mb-2">
        <HeadingText className="text-xl">Recovery Story</HeadingText>
        <MicroText className="text-muted-foreground">{patterns.length} pattern{patterns.length !== 1 ? 's' : ''}</MicroText>
      </View>
      <MicroText className="text-muted-foreground mb-4">
        Observational patterns from your own records. ReEntry does not diagnose or predict recovery.
      </MicroText>
      {patterns.map((pattern) => (
        <PatternCard key={pattern.id} pattern={pattern} lowStimulationMode={lowStimulationMode} />
      ))}
    </SectionCard>
  );
}
