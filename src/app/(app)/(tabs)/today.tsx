/**
 * Today Tab — ReEntry
 *
 * Editorial "Today at School" card showing today's activity logs.
 * Low-friction "Log activity" button opens the ActivityLogModal.
 * All data derives from AppContext. No diagnosis or behavior prescription.
 */

import { useCallback, useMemo, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { Mic, Plus } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { VoiceActivityCapture } from '@/components/VoiceActivityCapture';
import { ActivityCard } from '@/components/ActivityCard';
import { StudentPageHeader } from '@/components/StudentPageHeader';
import { HeroBotanical } from '@/components/Icons';
import { useAppContext } from '@/context/AppContext';
import { TOLERANCE_LABELS } from '@/data/activityCatalog';
import { COLORS, useThemeColors } from '@/lib/theme';
import type { ActivityCategory, ActivityLog, StudentScheduleItem } from '@/data/types';
import type { VoiceActivityContext, VoiceActivityDraft } from '@/lib/voiceActivityParser';

interface ScheduledActivity {
  id: string;
  label: string;
  category: ActivityCategory;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

type SmartCapturePrefill = {
  activityCategory?: ActivityCategory | null;
  customLabel?: string | null;
  durationMinutes?: number | null;
  toleranceRating?: ActivityLog['toleranceRating'] | null;
  challengeTagIds?: string[];
  notes?: string;
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

function timeMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatScheduleTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')}`;
}

function isScheduleItemLogged(item: StudentScheduleItem, logs: ActivityLog[]): boolean {
  const expected = item.activityName.trim().toLocaleLowerCase('en-US');
  return logs.some((log) => (log.customLabel ?? '').trim().toLocaleLowerCase('en-US') === expected);
}

export default function TodayScreen() {
  const { today, activityLogs, lowStimulationMode, scheduleItems } = useAppContext();
  const router = useRouter();
  const { scheduleItemId } = useLocalSearchParams<{ scheduleItemId?: string }>();
  const theme = useThemeColors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLog | undefined>(undefined);
  const [capturePrefill, setCapturePrefill] = useState<SmartCapturePrefill | undefined>();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | undefined>();
  const [voiceContext, setVoiceContext] = useState<VoiceActivityContext | undefined>();

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
    setVoiceTranscript(undefined);
  }, []);

  const openVoiceCapture = useCallback(() => {
    setVoiceTranscript(undefined);
    setVoiceContext(undefined);
    setVoiceOpen(true);
  }, []);

  const openSmartVoiceCapture = useCallback((scheduled: ScheduledActivity) => {
    setVoiceTranscript(undefined);
    setVoiceContext({
      activityCategory: scheduled.category,
      customLabel: scheduled.label,
      durationMinutes: scheduled.durationMinutes,
    });
    setVoiceOpen(true);
  }, []);

  const openVoiceReview = useCallback((draft: VoiceActivityDraft, transcript: string) => {
    setVoiceOpen(false);
    setEditingLog(undefined);
    setCapturePrefill(draft);
    setVoiceTranscript(transcript);
    setModalOpen(true);
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

  const todaysSchedule = useMemo(() => {
    const jsDay = new Date().getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    return scheduleItems
      .filter((item) => item.active && item.daysOfWeek.includes(isoDay))
      .map((item): ScheduledActivity => ({
        id: item.id,
        label: item.activityName,
        category: item.activityCategory,
        startMinutes: timeMinutes(item.startTime),
        endMinutes: timeMinutes(item.endTime),
        durationMinutes: timeMinutes(item.endTime) - timeMinutes(item.startTime),
      }))
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [scheduleItems]);

  const smartCaptureActivity = useMemo(() => {
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const notificationItem = typeof scheduleItemId === 'string'
      ? todaysSchedule.find((item) => item.id === scheduleItemId)
      : undefined;
    if (notificationItem && !isScheduleItemLogged(scheduleItems.find((item) => item.id === notificationItem.id)!, todaysLogs)) {
      return notificationItem;
    }
    return [...todaysSchedule]
      .reverse()
      .find(
        (scheduled) =>
          scheduled.endMinutes <= minutesNow &&
          !todaysLogs.some((log) => (log.customLabel ?? '').trim().toLocaleLowerCase('en-US') === scheduled.label.trim().toLocaleLowerCase('en-US')),
      );
  }, [scheduleItemId, scheduleItems, todaysLogs, todaysSchedule]);

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
      <StudentPageHeader className="mb-3" />
      <View className="mb-4 flex-row justify-end">
        <EditorialLabel>{formatTodayHeader()}</EditorialLabel>
      </View>

      {/* Primary heading */}
      <HeadingText className="mb-1">How did{"\n"}today feel?</HeadingText>
      <MicroText className="mb-5">{formatTodayFriendly()}</MicroText>

      {/* Today at School — the single primary logging area. */}
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
        <View className="flex-1">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <Text className="text-xs font-bold uppercase tracking-[0.18em] text-forest/70">Today at School</Text>
            <Text className="text-sm font-semibold text-forest/80">
              {todaysLogs.length} logged
            </Text>
          </View>

          {smartCaptureActivity ? (
            <View>
              <Text className="text-2xl font-bold text-forest">{smartCaptureActivity.label} just ended</Text>
              <Text className="mb-3 mt-1 text-sm font-medium text-forest/80">How manageable was it?</Text>
              <View className="gap-2">
                {([3, 2, 1] as const).map((rating) => (
                  <SecondaryButton
                    key={rating}
                    label={TOLERANCE_LABELS[rating]}
                    onPress={() => openSmartCapture(smartCaptureActivity, rating)}
                    appearance="light"
                    className="w-full"
                    accessibilityLabel={`${smartCaptureActivity.label}: ${TOLERANCE_LABELS[rating]}`}
                  />
                ))}
              </View>
              <View className="mt-3 flex-row flex-wrap gap-2">
                <SecondaryButton
                  label="Log something else"
                  onPress={openNewModal}
                  appearance="light"
                  className="min-w-[150px] flex-1 rounded-full"
                  style={{ minHeight: 48 }}
                  iconLeft={<Plus size={18} color={COLORS.forest} />}
                />
                <SecondaryButton
                  label="Use voice"
                  onPress={() => openSmartVoiceCapture(smartCaptureActivity)}
                  appearance="light"
                  className="min-w-[130px] flex-1 rounded-full"
                  style={{ minHeight: 48, backgroundColor: `${COLORS.warmWhite}CC`, borderWidth: 1.5 }}
                  iconLeft={<Mic size={18} color={COLORS.forest} />}
                  accessibilityLabel={`Use voice for ${smartCaptureActivity.label}`}
                />
              </View>
            </View>
          ) : (
            <View>
              <Text className="text-3xl font-bold text-forest">{todaysLogs.length}</Text>
              <Text className="mb-2 text-sm font-medium text-forest/80">
                {todaysLogs.length === 1 ? 'activity logged today' : 'activities logged today'}
              </Text>
              <Text className="mb-4 max-w-[82%] text-sm leading-5 text-forest/80">{heroObservation}</Text>
              <View className="flex-row flex-wrap gap-2">
                <PrimaryButton
                  label="Log activity"
                  onPress={openNewModal}
                  appearance="light"
                  className="min-w-[150px] flex-1 rounded-full"
                  style={{ minHeight: 48 }}
                  iconLeft={<Plus size={18} color={COLORS.warmWhite} />}
                />
                <SecondaryButton
                  label="Use voice"
                  onPress={openVoiceCapture}
                  appearance="light"
                  className="min-w-[130px] flex-1 rounded-full"
                  style={{ minHeight: 48, backgroundColor: `${COLORS.warmWhite}CC`, borderWidth: 1.5 }}
                  iconLeft={<Mic size={18} color={COLORS.forest} />}
                  accessibilityLabel="Use voice to log an activity"
                />
              </View>
              <Text className="mt-3 text-xs leading-5 text-forest/80">
                Record a school activity. You&apos;ll review everything before saving.
              </Text>
            </View>
          )}

          {!lowStimulationMode && (
            <View pointerEvents="none" className="absolute -right-4 -bottom-4 opacity-20">
              <HeroBotanical width={140} height={140} color={theme.accentForeground} />
            </View>
          )}
        </View>
      </SectionCard>

      <SectionCard className="mb-5">
        <View className="mb-3 flex-row items-center justify-between gap-3">
          <SubheadingText>School day</SubheadingText>
          <Pressable onPress={() => router.push('/(app)/(tabs)/schedule' as RelativePathString)} className="min-h-[44px] justify-center px-2" accessibilityRole="button" accessibilityLabel="Manage school schedule">
            <Text className="font-semibold text-foreground">Manage</Text>
          </Pressable>
        </View>
        {todaysSchedule.length > 0 ? todaysSchedule.map((item) => {
          const now = new Date();
          const minutesNow = now.getHours() * 60 + now.getMinutes();
          const logged = todaysLogs.some((log) => (log.customLabel ?? '').trim().toLocaleLowerCase('en-US') === item.label.trim().toLocaleLowerCase('en-US'));
          const status = logged ? 'Logged' : minutesNow >= item.endMinutes ? 'Log now' : 'Upcoming';
          return (
            <View key={item.id} className="flex-row items-center justify-between border-t border-border py-3 first:border-t-0">
              <View className="flex-1"><Text className="font-semibold text-foreground">{item.label}</Text><MicroText className="mt-1 text-muted-foreground">{formatScheduleTime(`${String(Math.floor(item.startMinutes / 60)).padStart(2, '0')}:${String(item.startMinutes % 60).padStart(2, '0')}`)}–{formatScheduleTime(`${String(Math.floor(item.endMinutes / 60)).padStart(2, '0')}:${String(item.endMinutes % 60).padStart(2, '0')}`)}</MicroText></View>
              <View
                className="rounded-full border px-3 py-1.5"
                style={{
                  backgroundColor: status === 'Log now' ? COLORS.brightYellow : theme.mossLight,
                  borderColor: status === 'Log now' ? COLORS.warmGold : theme.border,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: status === 'Log now' ? COLORS.deepForest : theme.foreground }}
                >
                  {status}
                </Text>
              </View>
            </View>
          );
        }) : (
          <LabelText className="leading-5 text-muted-foreground">No classes scheduled for today.</LabelText>
        )}
        <MicroText className="mt-2 leading-5 text-muted-foreground">ReEntry can remind you after scheduled classes.</MicroText>
      </SectionCard>

      <SectionCard className="mb-4">
        <LabelText className="mb-2 font-semibold text-foreground">Observation window</LabelText>
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
        <SectionCard className="mb-5 py-4">
          <LabelText className="leading-5 text-muted-foreground">Nothing logged today yet.</LabelText>
        </SectionCard>
      ) : (
        <View className="mb-5">
          {todaysLogs.map((log) => (
            <ActivityCard key={log.id} log={log} onPress={() => openEditModal(log)} />
          ))}
        </View>
      )}

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
        reviewTranscript={voiceTranscript}
        title={voiceTranscript ? 'Review your activity' : undefined}
        submitLabel={voiceTranscript ? 'Confirm & Log' : undefined}
      />
      <VoiceActivityCapture
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onDraftReady={openVoiceReview}
        context={voiceContext}
      />
    </ScreenShell>
  );
}
