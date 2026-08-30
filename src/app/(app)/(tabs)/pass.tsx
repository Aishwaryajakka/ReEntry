/**
 * Pass Tab — ReEntry Pass
 *
 * Displays accommodation records from shared AppContext.
 * Minimum-necessary disclosure. ReEntry records accommodations
 * only — it does not prescribe, approve, or authorize them.
 */

import { useState } from 'react';
import { ScreenShell } from '@/components/ScreenShell';
import { HeadingText, LabelText, MicroText } from '@/components/Typography';
import { PrimaryButton } from '@/components/Buttons';
import { TeacherView } from '@/components/TeacherView';
import { ReEntryWordmark } from '@/components/ReEntryWordmark';
import { useAppContext } from '@/context/AppContext';

export default function PassScreen() {
  const { accommodationRecords, today } = useAppContext();
  const [teacherViewVisible, setTeacherViewVisible] = useState(false);

  const activeRecords = accommodationRecords.filter(
    (r) =>
      r.visibleToSchool &&
      r.status !== 'inactive' &&
      (!r.activeUntil || r.activeUntil >= today),
  );

  return (
    <ScreenShell>
      <ReEntryWordmark className="mb-6" />
      <HeadingText className="mb-2 leading-tight">Your ReEntry Pass</HeadingText>
      <LabelText className="mb-6 leading-5">
        {activeRecords.length} active school support{activeRecords.length === 1 ? '' : 's'}
      </LabelText>

      <PrimaryButton
        label="Show my pass"
        className="mb-5 w-full"
        onPress={() => setTeacherViewVisible(true)}
      />

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
