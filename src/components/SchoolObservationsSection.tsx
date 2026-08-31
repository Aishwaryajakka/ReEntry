import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from './Buttons';
import { LabelText, MicroText, SubheadingText } from './Typography';
import {
  SCHOOL_OBSERVATION_LABELS,
  SCHOOL_OBSERVATION_TYPES,
  SCHOOL_SUPPORT_LABELS,
  SCHOOL_SUPPORT_TYPES,
  type SchoolObservation,
  type SchoolObservationType,
  type SchoolSupportType,
} from '@/data/types';
import {
  deleteSchoolObservation,
  insertSchoolObservation,
  updateSchoolObservation,
} from '@/db/api';
import { useThemeColors } from '@/lib/theme';

function formatOccurredAt(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SchoolObservationsSection({
  studentId,
  observations,
  currentUserId,
  editable,
  onChanged,
  title = 'School observations',
}: {
  studentId: string;
  observations: SchoolObservation[];
  currentUserId?: string;
  editable: boolean;
  onChanged?: () => Promise<void>;
  title?: string;
}) {
  const theme = useThemeColors();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [observationType, setObservationType] = useState<SchoolObservationType>('completed_as_planned');
  const [supportUsed, setSupportUsed] = useState<SchoolSupportType[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setContext('');
    setObservationType('completed_as_planned');
    setSupportUsed([]);
    setNote('');
    setError(null);
  };

  const startEditing = (observation: SchoolObservation) => {
    setEditingId(observation.id);
    setContext(observation.context);
    setObservationType(observation.observationType);
    setSupportUsed(observation.supportUsed);
    setNote(observation.note ?? '');
    setError(null);
    setShowForm(true);
  };

  const toggleSupport = (support: SchoolSupportType) => {
    setSupportUsed((current) => current.includes(support)
      ? current.filter((item) => item !== support)
      : [...current, support]);
  };

  const save = async () => {
    if (!currentUserId || !context.trim()) {
      setError('Enter a context before recording this observation.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        context,
        observationType,
        supportUsed,
        note,
      };
      if (editingId) {
        await updateSchoolObservation(editingId, input);
      } else {
        await insertSchoolObservation({ ...input, studentId, createdBy: currentUserId });
      }
      resetForm();
      await onChanged?.();
    } catch {
      setError('The observation could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (observation: SchoolObservation) => {
    Alert.alert('Delete school observation?', 'This removes the functional observation from the shared record.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteSchoolObservation(observation.id);
              await onChanged?.();
            } catch {
              setError('The observation could not be deleted. Please try again.');
            }
          })();
        },
      },
    ]);
  };

  return (
    <View className="mt-4 border-t border-border pt-4">
      <SubheadingText className="mb-1 text-sm">{title}</SubheadingText>
      <MicroText className="mb-3 leading-5 text-muted-foreground">
        {editable
          ? 'Record minimum-necessary functional observations from the school day.'
          : 'Read-only functional evidence recorded by linked school staff.'}
      </MicroText>

      {editable && !showForm ? (
        <PrimaryButton label="Record school observation" onPress={() => setShowForm(true)} className="mb-4 w-full" />
      ) : null}

      {editable && showForm ? (
        <View className="mb-4 rounded-xl border border-border bg-muted p-4">
          <LabelText className="mb-2">Context</LabelText>
          <TextInput
            value={context}
            onChangeText={setContext}
            placeholder="Chemistry, English, Lunch…"
            placeholderTextColor={theme.foregroundMuted}
            maxLength={120}
            className="mb-4 rounded-xl border border-border bg-background px-3 py-3 text-foreground"
          />

          <LabelText className="mb-2">What did you observe?</LabelText>
          <View className="mb-4 gap-2">
            {SCHOOL_OBSERVATION_TYPES.map((type) => {
              const selected = observationType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setObservationType(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  className="min-h-12 justify-center rounded-xl border px-3 py-3"
                  style={{
                    borderColor: selected ? theme.turmeric : theme.border,
                    backgroundColor: selected ? `${theme.turmeric}18` : theme.background,
                  }}
                >
                  <Text className="text-sm font-medium text-foreground">{SCHOOL_OBSERVATION_LABELS[type]}</Text>
                </Pressable>
              );
            })}
          </View>

          <LabelText className="mb-2">Support used</LabelText>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {SCHOOL_SUPPORT_TYPES.map((support) => {
              const selected = supportUsed.includes(support);
              return (
                <Pressable
                  key={support}
                  onPress={() => toggleSupport(support)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  className="min-h-11 justify-center rounded-full border px-3 py-2"
                  style={{
                    borderColor: selected ? theme.moss : theme.border,
                    backgroundColor: selected ? theme.mossLight : theme.background,
                  }}
                >
                  <Text className="text-sm text-foreground">{SCHOOL_SUPPORT_LABELS[support]}</Text>
                </Pressable>
              );
            })}
          </View>

          <LabelText className="mb-2">Optional note</LabelText>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Needed a short break before finishing the assignment."
            placeholderTextColor={theme.foregroundMuted}
            maxLength={500}
            multiline
            textAlignVertical="top"
            className="min-h-24 rounded-xl border border-border bg-background px-3 py-3 text-foreground"
          />
          <MicroText className="mt-2 text-muted-foreground">Use neutral, functional details only.</MicroText>
          {error ? <Text className="mt-3 text-sm text-destructive">{error}</Text> : null}
          <PrimaryButton
            label={editingId ? 'Save changes' : 'Record observation'}
            onPress={save}
            loading={saving}
            disabled={saving || !context.trim()}
            className="mt-4 w-full"
          />
          <SecondaryButton label="Cancel" onPress={resetForm} disabled={saving} className="mt-2 w-full" />
        </View>
      ) : null}

      {error && !showForm ? <Text className="mb-3 text-sm text-destructive">{error}</Text> : null}
      {observations.length === 0 ? (
        <MicroText className="text-muted-foreground">No school observations recorded yet.</MicroText>
      ) : (
        <View className="gap-2">
          {observations.map((observation) => {
            const authoredByCurrentUser = editable && observation.createdBy === currentUserId;
            return (
              <View key={observation.id} className="rounded-xl bg-muted p-3">
                <MicroText className="mb-1 font-semibold uppercase tracking-[0.08em] text-muted-foreground">School observation</MicroText>
                <Text className="text-sm font-semibold text-foreground">{observation.context}</Text>
                <MicroText className="mb-2 text-muted-foreground">{formatOccurredAt(observation.occurredAt)}</MicroText>
                <LabelText className="leading-5">{SCHOOL_OBSERVATION_LABELS[observation.observationType]}</LabelText>
                {observation.supportUsed.length > 0 ? (
                  <MicroText className="mt-2 leading-5 text-muted-foreground">
                    Support used: {observation.supportUsed.map((support) => SCHOOL_SUPPORT_LABELS[support]).join(' · ')}
                  </MicroText>
                ) : null}
                {observation.note ? <MicroText className="mt-2 leading-5 text-foreground">“{observation.note}”</MicroText> : null}
                <MicroText className="mt-2 text-muted-foreground">Recorded by school staff</MicroText>
                {authoredByCurrentUser ? (
                  <View className="mt-3 flex-row gap-2">
                    <SecondaryButton label="Edit" onPress={() => startEditing(observation)} className="flex-1" />
                    <SecondaryButton label="Delete" onPress={() => remove(observation)} className="flex-1" />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
