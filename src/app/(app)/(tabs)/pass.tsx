/**
 * Pass Tab — ReEntry Pass
 *
 * Displays accommodation records from shared AppContext.
 * Minimum-necessary disclosure. ReEntry records accommodations
 * only — it does not prescribe, approve, or authorize them.
 */

import { useState } from 'react';
import { Text, View } from 'react-native';
import { ScreenShell } from '@/components/ScreenShell';
import { HeadingText, LabelText, MicroText } from '@/components/Typography';
import { PrimaryButton } from '@/components/Buttons';
import { SectionCard } from '@/components/SectionCard';
import { TeacherView } from '@/components/TeacherView';
import { StudentPageHeader } from '@/components/StudentPageHeader';
import { useAppContext } from '@/context/AppContext';
import { School } from 'lucide-react-native';
import { useThemeColors } from '@/lib/theme';

export default function PassScreen() {
  const { accommodationRecords, today } = useAppContext();
  const [teacherViewVisible, setTeacherViewVisible] = useState(false);
  const theme = useThemeColors();

  const activeRecords = accommodationRecords.filter(
    (r) =>
      r.visibleToSchool &&
      r.status !== 'inactive' &&
      (!r.activeUntil || r.activeUntil >= today),
  );

  return (
    <ScreenShell>
      <StudentPageHeader />
      <HeadingText className="mb-4 leading-tight">Your ReEntry Pass</HeadingText>
      <SectionCard className="mb-5">
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
            <School size={21} color={theme.accentForeground} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-lg font-semibold text-foreground">Current school supports</Text>
            <LabelText className="mt-1 leading-5">
              {activeRecords.length} active support{activeRecords.length === 1 ? '' : 's'}
            </LabelText>
          </View>
        </View>
        <PrimaryButton label="Show my pass" className="w-full" onPress={() => setTeacherViewVisible(true)} />
      </SectionCard>

      <TeacherView
        visible={teacherViewVisible}
        onClose={() => setTeacherViewVisible(false)}
      />

      <MicroText className="text-center leading-5 text-muted-foreground">
        Recorded accommodations only.
      </MicroText>
    </ScreenShell>
  );
}
