/**
 * Pass Tab — ReEntry Pass
 *
 * Displays accommodation records from shared AppContext.
 * Minimum-necessary disclosure. ReEntry records accommodations
 * only — it does not prescribe, approve, or authorize them.
 */

import { useState } from 'react';
import { View, Text } from 'react-native';
import { Shield } from 'lucide-react-native';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { PrimaryButton } from '@/components/Buttons';
import { TeacherView } from '@/components/TeacherView';
import { HeroBotanical } from '@/components/Icons';
import { useAppContext } from '@/context/AppContext';
import { COLORS, useThemeColors } from '@/lib/theme';

function formatDate(dateStr: string | null, fallback = 'Not recorded'): string {
  if (!dateStr) return fallback;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PassScreen() {
  const { user, accommodationRecords, today, lowStimulationMode } = useAppContext();
  const theme = useThemeColors();
  const [teacherViewVisible, setTeacherViewVisible] = useState(false);

  const activeRecords = accommodationRecords.filter(
    (r) => r.visibleToSchool && (!r.activeUntil || r.activeUntil >= today),
  );

  return (
    <ScreenShell>
      {/* Header */}
      <EditorialLabel className="mb-3">ReEntry Pass</EditorialLabel>
      <HeadingText className="mb-1 leading-tight">Your Pass</HeadingText>
      <LabelText className="mb-5 leading-5">
        Your recorded accommodations for school support.
      </LabelText>

      {/* ReEntry Pass — compact yellow credential card */}
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
                <Shield size={16} color={COLORS.warmWhite} />
              </View>
              <Text className="text-2xl font-bold text-forest">{user.firstName}</Text>
            </View>
            <Text className="text-sm font-semibold text-forest/80 mb-3">Return-to-Learn</Text>
            <Text className="text-3xl font-bold text-forest mb-1">
              {activeRecords.length}
            </Text>
            <Text className="text-xs font-bold tracking-[0.15em] text-forest/80 uppercase mb-3">
              Active accommodation{activeRecords.length !== 1 ? 's' : ''}
            </Text>
            <Text className="text-sm text-forest/80">
              Valid through {activeRecords[0] ? formatDate(activeRecords[0].activeUntil, 'No end date recorded') : '—'}
            </Text>
          </View>
          {!lowStimulationMode && (
            <View className="absolute -right-4 -bottom-4 opacity-15">
              <HeroBotanical width={140} height={140} color={theme.accentForeground} />
            </View>
          )}
        </View>
      </SectionCard>

      {/* Show Pass */}
      <PrimaryButton
        label="Show Pass"
        className="w-full mb-4"
        onPress={() => setTeacherViewVisible(true)}
      />

      <TeacherView
        visible={teacherViewVisible}
        onClose={() => setTeacherViewVisible(false)}
      />

      {/* Compact accommodation cards */}
      <SubheadingText className="mb-3">Recorded accommodations</SubheadingText>
      <View className="gap-3 mb-4">
        {accommodationRecords.map((rec) => {
          const isActive = !rec.activeUntil || rec.activeUntil >= today;
          return (
            <SectionCard key={rec.id} className={isActive ? '' : 'opacity-60'}>
              <View className="flex-row items-start justify-between mb-1">
                <Text className="text-sm font-semibold text-foreground flex-1 mr-2">
                  {rec.accommodationType}
                </Text>
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: isActive ? theme.moss : theme.mossLight }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isActive ? COLORS.warmWhite : theme.foreground }}
                  >
                    {isActive ? 'Active' : 'Expired'}
                  </Text>
                </View>
              </View>
              <LabelText>Source: {rec.issuedBy}</LabelText>
              <LabelText>Updated: {formatDate(rec.dateIssued)}</LabelText>
            </SectionCard>
          );
        })}
      </View>

      <View className="px-1 mt-2">
        <MicroText className="text-center leading-5">
          ReEntry displays recorded accommodations. It does not prescribe or authorize them.
        </MicroText>
      </View>
    </ScreenShell>
  );
}
