/**
 * Today Tab — ReEntry
 *
 * Editorial "Today at School" card showing today's activity logs.
 * Low-friction "Log activity" button opens the ActivityLogModal.
 * All data derives from AppContext. No diagnosis or behavior prescription.
 */

import { useCallback, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { ActivityCard } from '@/components/ActivityCard';
import { HeroBotanical } from '@/components/Icons';
import { useAppContext } from '@/context/AppContext';
import { TOLERANCE_LABELS } from '@/data/activityCatalog';
import { COLORS, useThemeColors } from '@/lib/theme';
import type { ActivityCategory, ActivityLog } from '@/data/types';

interface ScheduledActivity {
  label: string;
  category: ActivityCategory;
  endMinutes: number;
  durationMinutes: number;
}

const SCHOOL_SCHEDULE: ScheduledActivity[] = [
  { label: 'Chemistry', category: 'Class', endMinutes: 8 * 60 + 50, durationMinutes: 50 },
  { label: 'English', category: 'Class', endMinutes: 9 * 60 + 50, durationMinutes: 50 },
  { label: 'Math', category: 'Class', endMinutes: 10 * 60 + 50, durationMinutes: 50 },
  { label: 'Lunch', category: 'Social activity', endMinutes: 12 * 60 + 30, durationMinutes: 30 },
  { label: 'Study Hall', category: 'Class', endMinutes: 14 * 60, durationMinutes: 45 },
];

type SmartCapturePrefill = {
  activityCategory: ActivityCategory;
  customLabel: string;
  durationMinutes: number;
  toleranceRating: ActivityLog['toleranceRating'];
};

function formatTodayHeader(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function formatTodayFriendly(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function TodayScreen() {
  const { today, activityLogs, lowStimulationMode } = useAppContext();
  const theme = useThemeColors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLog | undefined>(undefined);
  const [capturePrefill, setCapturePrefill] = useState<SmartCapturePrefill | undefined>();

  const todaysLogs = useMemo(
    () => activityLogs.filter((l) => l.date === today).sort((a, b) => a.id.localeCompare(b.id)),
    [activityLogs, today],
  );

  const openNewModal = useCallback(() => {
    setEditingLog(undefined);
    setCapturePrefill(undefined);
    setModalOpen(true);
  }, []);
  const openEditModal = useCallback((log: ActivityLog) => {
    setEditingLog(log);
    setCapturePrefill(undefined);
    setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingLog(undefined);
    setCapturePrefill(undefined);
  }, []);

  const observationWindow = useMemo(() => {
    if (activityLogs.length === 0) return null;
    const dates = activityLogs.map((log) => log.date).sort();
    return {
      first: dates[0],
      latest: dates[dates.length - 1],
      days: new Set(dates).size,
      activities: activityLogs.length,
    };
  }, [activityLogs]);

  const smartCaptureActivity = useMemo(() => {
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    return [...SCHOOL_SCHEDULE]
      .reverse()
      .find(
        (scheduled) =>
          scheduled.endMinutes <= minutesNow &&
          !todaysLogs.some((log) =>
            (log.customLabel || log.activityCategory) === scheduled.label,
          ),
      );
  }, [todaysLogs]);

  const openSmartCapture = useCallback(
    (scheduled: ScheduledActivity, toleranceRating: ActivityLog['toleranceRating']) => {
      setEditingLog(undefined);
      setCapturePrefill({
        activityCategory: scheduled.category,
        customLabel: scheduled.label,
        durationMinutes: scheduled.durationMinutes,
        toleranceRating,
      });
      setModalOpen(true);
    },
    [],
  );

  const heroObservation = useMemo(() => {
    if (todaysLogs.length === 0) return 'Building your pattern map. Add an activity when you are ready.';
    const reading = todaysLogs.find((l) => l.activityCategory === 'Reading');
    if (reading) {
      return `Reading was recorded as ${TOLERANCE_LABELS[reading.toleranceRating].toLowerCase()} today.`;
    }
    const first = todaysLogs[0];
    return `${first.customLabel || first.activityCategory} felt ${TOLERANCE_LABELS[first.toleranceRating].toLowerCase()} today.`;
  }, [todaysLogs]);

  return (
    <ScreenShell>
      {/* Header: REENTRY / AUG 28 */}
      <View className="flex-row items-center justify-between mb-4">
        <EditorialLabel>ReEntry</EditorialLabel>
        <EditorialLabel>{formatTodayHeader()}</EditorialLabel>
      </View>

      {/* Primary heading */}
      <HeadingText className="mb-1">How did{"\n"}today feel?</HeadingText>
      <MicroText className="mb-5">{formatTodayFriendly()}</MicroText>

      {/* Today at School — compact yellow hero card */}
      <SectionCard
        className="mb-5 overflow-hidden"
        style={{
          backgroundColor: COLORS.brightYellow,
          borderColor: COLORS.warmGold,
          shadowColor: lowStimulationMode ? 'transparent' : COLORS.warmGold,
          shadowOpacity: lowStimulationMode ? 0 : 0.18,
          shadowRadius: lowStimulationMode ? 0 : 14,
          elevation: lowStimulationMode ? 0 : 4,
        } as object}
      >
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className="text-xs font-bold tracking-[0.18em] text-forest/70 uppercase mb-2">
              Today at School
            </Text>
            <Text className="text-3xl font-bold text-forest mb-1">
              {todaysLogs.length}
            </Text>
            <Text className="text-sm font-medium text-forest/80 mb-3">
              {todaysLogs.length === 1 ? 'activity logged' : 'activities logged'}
            </Text>
            <Text className="text-sm text-forest/80 leading-5 mb-4 max-w-[70%]">
              {heroObservation}
            </Text>
            <PrimaryButton
              label="Log activity"
              onPress={openNewModal}
              className="self-start rounded-full"
              style={{ minHeight: 44 }}
              appearance="dark"
              accessibilityLabel="Log activity"
            />
          </View>
          {!lowStimulationMode && (
            <View className="absolute -right-4 -bottom-4 opacity-20">
              <HeroBotanical width={140} height={140} color={theme.accentForeground} />
            </View>
          )}
        </View>
      </SectionCard>

      <SectionCard className="mb-5">
        <View className="mb-3 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <SubheadingText>Smart Capture</SubheadingText>
            <MicroText className="mt-1 leading-5 text-muted-foreground">
              Schedule prompts make it easier to record school activities. You choose what to report.
            </MicroText>
          </View>
        </View>
        {smartCaptureActivity ? (
          <View>
            <Text className="text-base font-semibold text-foreground">
              {smartCaptureActivity.label} just ended.
            </Text>
            <LabelText className="mb-3 mt-1">How manageable was it?</LabelText>
            <View className="gap-2">
              {([3, 2, 1] as const).map((rating) => (
                <SecondaryButton
                  key={rating}
                  label={TOLERANCE_LABELS[rating]}
                  onPress={() => openSmartCapture(smartCaptureActivity, rating)}
                  className="w-full"
                  accessibilityLabel={`${smartCaptureActivity.label}: ${TOLERANCE_LABELS[rating]}`}
                />
              ))}
            </View>
            <MicroText className="mt-3 leading-5 text-muted-foreground">
              You can add Noise, Screens, Concentration, Light, Fatigue, or other challenge tags before saving.
            </MicroText>
          </View>
        ) : (
          <LabelText className="leading-5 text-muted-foreground">
            Prompts appear here after scheduled classes end. Manual activity logging is always available.
          </LabelText>
        )}
      </SectionCard>

      <SectionCard className="mb-5">
        <SubheadingText className="mb-2">Observation window</SubheadingText>
        {observationWindow ? (
          <>
            <Text className="text-lg font-semibold text-foreground">
              {formatShortDate(observationWindow.first)} – {formatShortDate(observationWindow.latest)}
            </Text>
            <LabelText className="mt-1 text-muted-foreground">
              {observationWindow.days} day{observationWindow.days === 1 ? '' : 's'} · {observationWindow.activities} activit{observationWindow.activities === 1 ? 'y' : 'ies'}
            </LabelText>
          </>
        ) : (
          <>
            <SubheadingText className="text-base">Building your pattern map</SubheadingText>
            <LabelText className="mt-1 leading-5 text-muted-foreground">
              Your observation window begins when you record your first activity.
            </LabelText>
            <MicroText className="mt-2 leading-5 text-muted-foreground">
              Keep recording everyday activities so ReEntry can identify useful patterns in your records.
            </MicroText>
          </>
        )}
      </SectionCard>

      {/* Today's activities */}
      <SubheadingText className="mb-3">Today&apos;s activities</SubheadingText>
      {todaysLogs.length === 0 ? (
        <SectionCard className="mb-5">
          <SubheadingText className="text-base">Building your pattern map</SubheadingText>
          <LabelText className="mt-1 leading-5 text-muted-foreground">
            Record an everyday activity when you are ready, or use a Smart Capture prompt after class.
          </LabelText>
        </SectionCard>
      ) : (
        <View className="mb-5">
          {todaysLogs.map((log) => (
            <ActivityCard key={log.id} log={log} onPress={() => openEditModal(log)} />
          ))}
        </View>
      )}

      <PrimaryButton label="Log Activity" onPress={openNewModal} className="w-full mb-5" />

      {/* Footer disclaimer */}
      <View className="px-1">
        <MicroText className="text-center leading-5">
          ReEntry records your self-reported observations. It does not diagnose, assess severity, or tell you to stop or continue an activity.
        </MicroText>
      </View>

      <ActivityLogModal
        visible={modalOpen}
        onClose={closeModal}
        log={editingLog}
        prefill={capturePrefill}
      />
    </ScreenShell>
  );
}
