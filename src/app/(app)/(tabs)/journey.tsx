/**
 * Journey Tab — Activity Timeline
 *
 * Uses real chronological activity records from the authenticated student.
 * Shows dates, activities, manageability, and challenge tags.
 * Includes polished empty state when little/no data exists.
 * No recovery predictions, no severity estimates, no medical readiness.
 */

import { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, SectionList } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { useRouter, type RelativePathString } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton } from '@/components/Buttons';
import {
  HeadingText,
  SubheadingText,
  LabelText,
  MicroText,
} from '@/components/Typography';
import { DataBadgeList } from '@/components/DataBadge';
import { CategoryIcon } from '@/components/Icons';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { RecoveryStory } from '@/components/RecoveryStory';
import { StudentPageHeader } from '@/components/StudentPageHeader';
import { useAppContext } from '@/context/AppContext';
import { useReducedExperience } from '@/lib/accessibility';
import { TOLERANCE_LABELS } from '@/data/activityCatalog';
import type { ActivityLog, ChallengeTag } from '@/data/types';
import { useThemeColors } from '@/lib/theme';

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
  });
}

function ActivityRow({
  log,
  allTags,
  lowStimulationMode,
  onPress,
}: {
  log: ActivityLog;
  allTags: ChallengeTag[];
  lowStimulationMode: boolean;
  onPress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const height = useSharedValue(0);

  const { reduced } = useReducedExperience();
  const reducedOrLowStim = reduced || lowStimulationMode;
  const theme = useThemeColors();

  const title = log.customLabel || log.activityCategory;

  const toggle = () => {
    setExpanded((prev) => !prev);

    height.value = withTiming(expanded ? 0 : 1, {
      duration: reducedOrLowStim ? 0 : 180,
    });
  };

  const detailStyle = useAnimatedStyle(() => ({
    opacity: reducedOrLowStim
      ? expanded
        ? 1
        : 0
      : height.value,

    height: expanded ? 'auto' : 0,
    overflow: 'hidden',
  }));

  return (
    <View className="border-b border-border py-3" style={{ width: '100%' }}>
      {/*
        The expandable activity header is one button.

        IMPORTANT:
        The Edit button below is NOT nested inside this Pressable.
        On React Native Web, Pressable becomes an HTML <button>.
      */}
      <Pressable
        onPress={toggle}
        className="active:opacity-80"
        style={{ width: '100%' }}
        accessibilityRole="button"
        accessibilityLabel={`${title} activity, ${log.durationMinutes} minutes, ${
          TOLERANCE_LABELS[log.toleranceRating]
        }`}
        accessibilityState={{ expanded }}
      >
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'stretch' }}>
          <View style={{ width: 48, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.mossLight }}
            >
              <CategoryIcon
                category={log.activityCategory}
                size={20}
                color={theme.foreground}
              />
            </View>
          </View>

          <View style={{ minWidth: 0, flex: 1, justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 8 }}>
            <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
              {title}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Manageability: {TOLERANCE_LABELS[log.toleranceRating]}
            </Text>
          </View>

          <View style={{ width: 76, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', columnGap: 8 }}>
            <MicroText className="text-right text-muted-foreground">
              {log.durationMinutes} min
            </MicroText>
            {expanded ? (
              <ChevronDown size={16} color={theme.foregroundMuted} />
            ) : (
              <ChevronRight size={16} color={theme.foregroundMuted} />
            )}
          </View>
        </View>
      </Pressable>

      {/*
        Expanded details are a SIBLING of the header Pressable,
        not a child of it.

        That prevents:
        <button>
          <button>Edit</button>
        </button>
      */}
      <Animated.View style={detailStyle}>
        <View className="pt-2 pl-13">
          {log.challengeTagIds.length > 0 && (
            <DataBadgeList
              tagIds={log.challengeTagIds}
              allTags={allTags}
              className="mb-2"
            />
          )}

          {log.notes ? (
            <LabelText className="italic leading-5 text-muted-foreground">
              "{log.notes}"
            </LabelText>
          ) : null}

          <Pressable
            onPress={onPress}
            className="mt-2 self-start"
            accessibilityRole="button"
            accessibilityLabel="Edit this activity"
          >
            <MicroText className="text-foreground underline">
              Edit activity
            </MicroText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

interface Section {
  date: string;
  data: ActivityLog[];
}

export default function JourneyScreen() {
  const {
    activityLogs,
    challengeTags,
    today,
    lowStimulationMode,
  } = useAppContext();

  const [editingLog, setEditingLog] = useState<ActivityLog | undefined>(
    undefined,
  );

  const [modalOpen, setModalOpen] = useState(false);

  const router = useRouter();

  const sections = useMemo<Section[]>(() => {
    const byDate = new Map<string, ActivityLog[]>();

    for (const log of activityLogs) {
      const list = byDate.get(log.date) ?? [];

      list.push(log);

      byDate.set(log.date, list);
    }

    return Array.from(byDate.entries())
      .map(([date, logs]) => ({
        date,
        data: logs.sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activityLogs]);

  const totalCount = activityLogs.length;

  const uniqueDates = new Set(
    activityLogs.map((log) => log.date),
  ).size;

  const observationWindow = useMemo(() => {
    if (activityLogs.length === 0) return null;
    const dates = activityLogs.map((log) => log.date).sort();
    return `${formatShort(dates[0])}–${formatShort(dates[dates.length - 1])}`;
  }, [activityLogs]);

  const openEdit = useCallback((log: ActivityLog) => {
    setEditingLog(log);
    setModalOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setModalOpen(false);
    setEditingLog(undefined);
  }, []);

  return (
    <ScreenShell>
      <StudentPageHeader />

      <HeadingText className="mb-2 leading-tight text-foreground">
        Recovery Journey
      </HeadingText>

      <LabelText className="mb-5 leading-5 text-muted-foreground">
        {observationWindow
          ? `Observation window: ${observationWindow} · ${uniqueDates} recorded date${uniqueDates === 1 ? '' : 's'}`
          : 'Your observation window will appear after you record an activity.'}
      </LabelText>

      <RecoveryStory
        activityLogs={activityLogs}
      />

      {totalCount === 0 ? (
        <SectionCard className="mb-5 items-center py-8">
          <Text className="text-xl font-semibold text-foreground mb-2">
            No activities yet
          </Text>

          <MicroText className="text-center leading-5 mb-5 px-4">
            Your activity timeline will appear here once you log your first
            activity on the Today tab.
          </MicroText>

          <PrimaryButton
            label="Log your first activity"
            onPress={() =>
              router.navigate(
                '/(app)/(tabs)/today' as RelativePathString,
              )
            }
            className="w-full"
          />
        </SectionCard>
      ) : (
        <>
          <SubheadingText className="mb-2">Activity timeline</SubheadingText>
          <MicroText className="mb-3 text-muted-foreground">
            {totalCount} activit{totalCount === 1 ? 'y' : 'ies'}, newest first. Tap an activity to see details.
          </MicroText>

          <SectionList
            sections={sections}
            style={{ width: '100%' }}
            contentContainerStyle={{ width: '100%' }}
            keyExtractor={(item) => item.id}
            contentInsetAdjustmentBehavior="automatic"
            renderSectionHeader={({
              section: { date },
            }) => (
              <View className="py-2 border-b border-border">
                <Text className="text-sm font-bold text-foreground">
                  {date === today
                    ? 'Today'
                    : formatWeekday(date)}{' '}
                  · {formatShort(date)}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <ActivityRow
                log={item}
                allTags={challengeTags}
                lowStimulationMode={lowStimulationMode}
                onPress={() => openEdit(item)}
              />
            )}
            renderSectionFooter={() => (
              <View className="h-4" />
            )}
            ListFooterComponent={
              <View className="mt-4 px-1">
                <MicroText className="text-center leading-5 text-muted-foreground">
                  These records reflect what you reported. ReEntry does not
                  estimate recovery time, predict outcomes, or provide
                  medical advice.
                </MicroText>
              </View>
            }
          />
        </>
      )}

      <ActivityLogModal
        visible={modalOpen}
        onClose={closeEdit}
        log={editingLog}
      />
    </ScreenShell>
  );
}
