/** Full ReEntry Pass with minimum-necessary school support information. */
import { useMemo } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ChevronLeft, Shield } from 'lucide-react-native';

import { SecondaryButton } from '@/components/Buttons';
import { StudentPageHeader } from '@/components/StudentPageHeader';
import { SectionCard } from '@/components/SectionCard';
import { HeadingText, LabelText, MicroText } from '@/components/Typography';
import { useAppContext } from '@/context/AppContext';
import { useReducedExperience } from '@/lib/accessibility';
import { useThemeColors } from '@/lib/theme';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface TeacherViewProps {
  visible: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string | null, fallback = 'Not recorded'): string {
  if (!dateStr) return fallback;
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TeacherView({ visible, onClose }: TeacherViewProps) {
  const { accommodationRecords, today } = useAppContext();
  const { reduced } = useReducedExperience();
  const theme = useThemeColors();
  const { isDark } = useTheme();

  const activeSchoolRecords = useMemo(
    () =>
      accommodationRecords
        .filter((record) =>
          record.visibleToSchool &&
          record.status !== 'inactive' &&
          (!record.activeUntil || record.activeUntil >= today),
        )
        .sort((a, b) =>
          (a.dateIssued ?? '').localeCompare(b.dateIssued ?? ''),
        ),
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
      <View className={cn('flex-1', isDark && 'dark')}>
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
          <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="w-full max-w-[720px] self-center px-6 pb-16 pt-5"
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
          <SecondaryButton
            label="Back"
            onPress={onClose}
            className="mb-6 self-start px-4"
            iconLeft={<ChevronLeft size={20} color={theme.foreground} />}
            accessibilityLabel="Back to ReEntry Pass"
          />

          <StudentPageHeader />
          <HeadingText className="mb-2 leading-tight">Current school supports</HeadingText>
          <LabelText className="mb-6 leading-5">
            {activeSchoolRecords.length} active school support{activeSchoolRecords.length === 1 ? '' : 's'}
          </LabelText>

          {activeSchoolRecords.length === 0 ? (
            <SectionCard className="mb-5">
              <LabelText>No active school supports recorded.</LabelText>
            </SectionCard>
          ) : (
            <View className="mb-5 gap-3">
              {activeSchoolRecords.map((record) => (
                <SectionCard key={record.id}>
                  <Text className="mb-2 text-base font-semibold text-foreground">
                    {record.accommodationType}
                  </Text>
                  <View className="gap-2">
                    <View className="flex-row items-center gap-2">
                      <Calendar size={15} color={theme.foregroundMuted} />
                      <LabelText>
                        Valid through: {formatDate(record.activeUntil, 'No end date recorded')}
                      </LabelText>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Shield size={15} color={theme.foregroundMuted} />
                      <LabelText>Recorded by: {record.issuedBy}</LabelText>
                    </View>
                  </View>
                </SectionCard>
              ))}
            </View>
          )}

          <MicroText className="text-center leading-5 text-muted-foreground">
            Recorded accommodations only.
          </MicroText>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
