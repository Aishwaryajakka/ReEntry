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
import { PrimaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { ActivityLogModal } from '@/components/ActivityLogModal';
import { ActivityCard } from '@/components/ActivityCard';
import { HeroBotanical } from '@/components/Icons';
import { useAppContext } from '@/context/AppContext';
import { TOLERANCE_LABELS } from '@/data/activityCatalog';
import { COLORS, useThemeColors } from '@/lib/theme';
import type { ActivityLog } from '@/data/types';

function formatTodayHeader(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function formatTodayFriendly(): string {
  const today = new Date();
  return today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function TodayScreen() {
  const { today, activityLogs, lowStimulationMode } = useAppContext();
  const theme = useThemeColors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLog | undefined>(undefined);

  const todaysLogs = useMemo(
    () => activityLogs.filter((l) => l.date === today).sort((a, b) => a.id.localeCompare(b.id)),
    [activityLogs, today],
  );

  const openNewModal = useCallback(() => {
    setEditingLog(undefined);
    setModalOpen(true);
  }, []);
  const openEditModal = useCallback((log: ActivityLog) => {
    setEditingLog(log);
    setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingLog(undefined);
  }, []);

  const heroObservation = useMemo(() => {
    if (todaysLogs.length === 0) return 'No activities logged yet. Add the first one.';
    const reading = todaysLogs.find((l) => l.activityCategory === 'Reading');
    if (reading) {
      return `Reading felt ${TOLERANCE_LABELS[reading.toleranceRating].toLowerCase()} than earlier this week.`;
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

      {/* Today's activities */}
      <SubheadingText className="mb-3">Today&apos;s activities</SubheadingText>
      {todaysLogs.length === 0 ? (
        <SectionCard className="mb-5">
          <LabelText className="italic">No activities logged yet. Tap Log Activity to add one.</LabelText>
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

      <ActivityLogModal visible={modalOpen} onClose={closeModal} log={editingLog} />
    </ScreenShell>
  );
}
