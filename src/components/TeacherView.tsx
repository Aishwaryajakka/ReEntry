/**
 * TeacherView — minimum-necessary school disclosure modal.
 *
 * Shows only current active school-visible accommodations.
 * Does NOT show activity history, Journey insights, symptoms, private notes, or medical data.
 * Uses existing AccommodationRecord demo data from AppContext.
 */

import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Shield, Calendar, User, QrCode } from 'lucide-react-native';
import { SectionCard } from '@/components/SectionCard';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { SecondaryButton } from '@/components/Buttons';
import { HeroBotanical } from '@/components/Icons';
import { useReducedExperience } from '@/lib/accessibility';
import { useAppContext } from '@/context/AppContext';
import { COLORS, useThemeColors } from '@/lib/theme';

interface TeacherViewProps {
  visible: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function DemoQR() {
  const theme = useThemeColors();
  return (
    <View
      className="items-center justify-center rounded-xl p-4 self-center"
      style={{ backgroundColor: theme.warmWhite }}
    >
      <QrCode size={120} color={theme.accentForeground} />
      <MicroText className="mt-2 text-center">Demo QR placeholder</MicroText>
    </View>
  );
}

export function TeacherView({ visible, onClose }: TeacherViewProps) {
  const { user, accommodationRecords, today, lowStimulationMode } = useAppContext();
  const { reduced } = useReducedExperience();
  const theme = useThemeColors();

  const activeSchoolRecords = useMemo(
    () =>
      accommodationRecords
        .filter((r) => r.visibleToSchool && r.activeUntil >= today)
        .sort((a, b) => a.dateIssued.localeCompare(b.dateIssued)),
    [accommodationRecords, today],
  );

  return (
    <Modal
      visible={visible}
      animationType={reduced ? 'fade' : 'slide'}
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6 pb-24"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Close */}
          <View className="flex-row items-center justify-between mb-4">
            <EditorialLabel>Teacher View</EditorialLabel>
            <Pressable
              onPress={onClose}
              className="p-2 rounded-full active:opacity-70"
              accessibilityLabel="Close Teacher View"
              accessibilityRole="button"
            >
              <X size={22} color={theme.foreground} />
            </Pressable>
          </View>

          {/* Header */}
          <HeadingText className="mb-2 leading-tight">Return-to-Learn</HeadingText>
          <LabelText className="mb-6 leading-5">
            Only information relevant to current school support is shown here.
          </LabelText>

          {/* Student credential */}
          <SectionCard
            className="mb-4 overflow-hidden"
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
                  ReEntry Pass
                </Text>
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="w-8 h-8 rounded-full bg-forest items-center justify-center">
                    <User size={16} color={theme.accentForeground} />
                  </View>
                  <Text className="text-2xl font-bold text-forest">{user.firstName}</Text>
                </View>
                <Text className="text-sm font-semibold text-forest/80 mb-2">Return-to-Learn</Text>
                <View className="flex-row items-center gap-2">
                  <Shield size={14} color={theme.accentForeground} />
                  <MicroText className="text-forest/80">
                    {activeSchoolRecords.length} active school accommodation{activeSchoolRecords.length !== 1 ? 's' : ''}
                  </MicroText>
                </View>
              </View>
              {!lowStimulationMode && (
                <View className="absolute -right-4 -bottom-4 opacity-15">
                  <HeroBotanical width={120} height={120} color={theme.accentForeground} />
                </View>
              )}
            </View>
          </SectionCard>

          {/* Active accommodations */}
          <SubheadingText className="mb-3">Current accommodations</SubheadingText>
          {activeSchoolRecords.length === 0 ? (
            <SectionCard className="mb-4">
              <LabelText className="italic">No active school accommodations recorded.</LabelText>
            </SectionCard>
          ) : (
            <View className="gap-3 mb-4">
              {activeSchoolRecords.map((rec) => (
                <SectionCard key={rec.id}>
                  <Text className="text-base font-semibold text-foreground mb-2">
                    {rec.accommodationType}
                  </Text>
                  <View className="gap-1">
                    <View className="flex-row items-center gap-2">
                      <Calendar size={14} color={theme.foregroundMuted} />
                      <LabelText>Valid through: {formatDate(rec.activeUntil)}</LabelText>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Shield size={14} color={theme.foregroundMuted} />
                      <LabelText>Source: {rec.issuedBy}</LabelText>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Calendar size={14} color={theme.foregroundMuted} />
                      <LabelText>Last updated: {formatDate(rec.dateIssued)}</LabelText>
                    </View>
                  </View>
                </SectionCard>
              ))}
            </View>
          )}

          {/* Demo QR */}
          {!lowStimulationMode && (
            <>
              <SubheadingText className="mb-3">Demo share code</SubheadingText>
              <SectionCard className="mb-4 items-center">
                <DemoQR />
                <MicroText className="text-center mt-3 leading-5">
                  This is a placeholder visual. Real sharing would be enabled in a later build.
                </MicroText>
              </SectionCard>
            </>
          )}

          {/* Disclaimers */}
          <SectionCard className="mb-6">
            <MicroText className="leading-5 mb-2">
              ReEntry displays recorded accommodations. It does not prescribe or authorize accommodations.
            </MicroText>
            <MicroText className="leading-5">
              No activity history, symptom details, or private notes are included in this view.
            </MicroText>
          </SectionCard>

          <SecondaryButton label="Back to Pass" onPress={onClose} className="w-full" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
