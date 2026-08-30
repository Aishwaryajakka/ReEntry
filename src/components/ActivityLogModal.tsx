/**
 * ActivityLogModal — low-friction cognitive-fatigue-aware logging flow.
 * Uses a single Modal with a bottom-sheet-like panel.
 * Preserves one-tap category selection, big manageability chips, and optional details.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { DataBadge } from './DataBadge';
import { DividerLine } from './DividerLine';
import { LabelText, MicroText, SubheadingText } from './Typography';
import { useReducedExperience } from '@/lib/accessibility';
import { useAppContext } from '@/context/AppContext';
import { CHALLENGE_TAGS, TOLERANCE_LABELS } from '@/data/activityCatalog';
import {
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
  type ActivityLog,
} from '@/data/types';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const SELECTABLE_TAGS = CHALLENGE_TAGS;
const TOLERANCE_OPTIONS: ActivityLog['toleranceRating'][] = [3, 2, 1];

interface ActivityLogModalProps {
  visible: boolean;
  onClose: () => void;
  log?: ActivityLog;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  visible,
  onClose,
  log,
}) => {
  const {
    addActivityLog,
    updateActivityLog,
    deleteActivityLog,
    today,
  } = useAppContext();

  const { reduced } = useReducedExperience();
  const theme = useThemeColors();
  const isEditing = !!log;

  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [tolerance, setTolerance] =
    useState<ActivityLog['toleranceRating']>(2);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(),
  );
  const [note, setNote] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCategory(null);
    setDuration(30);
    setTolerance(2);
    setSelectedTagIds(new Set());
    setNote('');
    setCustomLabel('');
    setError(null);
  }, []);

  useEffect(() => {
    if (visible) {
      setCategory(log?.activityCategory ?? null);
      setCustomLabel(log?.customLabel ?? '');
      setDuration(log?.durationMinutes ?? 30);
      setTolerance(log?.toleranceRating ?? 2);
      setNote(log?.notes ?? '');
      setSelectedTagIds(new Set(log?.challengeTagIds ?? []));
      setError(null);
    } else {
      reset();
    }
  }, [visible, log, reset]);

  const isValid = !!category && customLabel.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid || !category) {
      setError('Please select a category and enter an activity name.');
      return;
    }

    setError(null);

    const input = {
      date: today,
      activityCategory: category,
      customLabel: customLabel.trim(),
      durationMinutes: duration,
      toleranceRating: tolerance,
      notes: note,
      challengeTagIds: Array.from(selectedTagIds),
    };

    if (isEditing && log) {
      await updateActivityLog(log.id, input);
    } else {
      await addActivityLog(input);
    }

    reset();
    onClose();
  }, [
    addActivityLog,
    category,
    customLabel,
    duration,
    isEditing,
    isValid,
    log,
    note,
    onClose,
    reset,
    selectedTagIds,
    today,
    tolerance,
    updateActivityLog,
  ]);

  const handleDelete = useCallback(async () => {
    if (!log) return;

    await deleteActivityLog(log.id);

    reset();
    onClose();
  }, [deleteActivityLog, log, onClose, reset]);

  const displayName = useMemo(() => {
    if (category === 'Class') {
      return customLabel.trim() || category;
    }

    if (category === 'Homework') {
      return customLabel.trim() || category;
    }

    return customLabel.trim() || category;
  }, [category, customLabel]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Backdrop.
            IMPORTANT: this is a sibling of the modal sheet so buttons
            inside the sheet are never nested inside another Pressable. */}
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={onClose}
          accessibilityLabel="Close logging flow"
          accessibilityRole="button"
        />

        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end"
          pointerEvents="box-none"
        >
          {/* Modal sheet.
              This MUST remain a View, not a Pressable, because the sheet
              contains interactive buttons. */}
          <View
            className="bg-card rounded-t-3xl max-h-[92%]"
            style={
              {
                borderCurve: 'continuous',
              } as object
            }
          >
            <View className="p-6">
              <View className="flex-row items-center justify-between mb-2">
                <SubheadingText>Log activity</SubheadingText>

                <Pressable
                  onPress={onClose}
                  className="p-2 rounded-full active:bg-muted"
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={20} color={theme.foreground} />
                </Pressable>
              </View>

              <LabelText className="leading-5 mb-6">
                Select the activity, duration, and how it felt. Everything is
                optional except the activity type.
              </LabelText>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerClassName="px-6 pb-8"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Category */}
              <StepLabel>1. What did you do?</StepLabel>

              <View className="flex-row flex-wrap gap-2 mb-5">
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={cn(
                      'rounded-full px-4 py-2.5 border',
                      category === cat
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border',
                    )}
                    style={{ minHeight: 40 } as object}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: category === cat,
                    }}
                  >
                    <Text
                      className={cn(
                        'text-sm font-medium',
                        category === cat
                          ? 'text-primary-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Activity name */}
              {category && (
                <>
                  <LabelText className="mb-2">Activity name</LabelText>

                  <TextInput
                    value={customLabel}
                    onChangeText={setCustomLabel}
                    placeholder="e.g., Chemistry, Bus ride, Cafeteria"
                    placeholderTextColor={theme.foregroundMuted}
                    className="bg-background rounded-xl border border-border px-4 py-3 text-foreground text-base mb-2"
                    style={
                      {
                        borderCurve: 'continuous',
                      } as object
                    }
                    accessibilityLabel="Activity name"
                    returnKeyType="done"
                  />

                  {error && (
                    <MicroText className="text-destructive mb-5">
                      {error}
                    </MicroText>
                  )}
                </>
              )}

              {/* 2. Duration */}
              <StepLabel>2. For how long?</StepLabel>

              <View className="flex-row flex-wrap gap-2 mb-5">
                {DURATION_OPTIONS.map((mins) => (
                  <Pressable
                    key={mins}
                    onPress={() => setDuration(mins)}
                    className={cn(
                      'rounded-xl px-4 py-3 border flex-1 min-w-[64]',
                      duration === mins
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border',
                    )}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: duration === mins,
                    }}
                  >
                    <Text
                      className={cn(
                        'text-sm font-semibold text-center',
                        duration === mins
                          ? 'text-primary-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {mins}m
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 3. Manageability */}
              <StepLabel>3. How manageable was it?</StepLabel>

              <View className="gap-2 mb-5">
                {TOLERANCE_OPTIONS.map((rating) => (
                  <Pressable
                    key={rating}
                    onPress={() => setTolerance(rating)}
                    className={cn(
                      'flex-row items-center justify-between rounded-xl border px-4 py-3.5',
                      tolerance === rating
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border',
                    )}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: tolerance === rating,
                    }}
                  >
                    <Text
                      className={cn(
                        'text-base font-medium',
                        tolerance === rating
                          ? 'text-primary-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {TOLERANCE_LABELS[rating]}
                    </Text>

                    <View className="flex-row gap-1">
                      {[1, 2, 3].map((i) => (
                        <View
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full',
                            i <= rating
                              ? tolerance === rating
                                ? 'bg-primary-foreground'
                                : 'bg-primary'
                              : 'bg-border',
                          )}
                        />
                      ))}
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* 4. Challenge tags */}
              <StepLabel>4. Optional challenges</StepLabel>

              <View className="flex-row flex-wrap gap-2 mb-5">
                {SELECTABLE_TAGS.map((tag) => {
                  const selected = selectedTagIds.has(tag.id);

                  return (
                    <Pressable
                      key={tag.id}
                      onPress={() => toggleTag(tag.id)}
                      className={cn(
                        'rounded-full border px-3 py-2',
                        selected
                          ? 'bg-primary border-primary'
                          : 'bg-card border-border',
                      )}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: selected,
                      }}
                    >
                      <Text
                        className={cn(
                          'text-sm font-medium',
                          selected
                            ? 'text-primary-foreground'
                            : 'text-foreground',
                        )}
                      >
                        {tag.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 5. Note */}
              <StepLabel>5. Optional note</StepLabel>

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Short note, e.g., board glare, loud tables..."
                placeholderTextColor={theme.foregroundMuted}
                multiline
                numberOfLines={3}
                className="bg-background rounded-xl border border-border px-4 py-3 text-foreground text-base mb-4"
                style={
                  {
                    borderCurve: 'continuous',
                    minHeight: 72,
                  } as object
                }
                textAlignVertical="top"
                accessibilityLabel="Optional note"
              />

              <DividerLine className="mb-4" />

              {/* Live preview */}
              <View className="bg-muted rounded-xl px-4 py-3 mb-5">
                <MicroText className="mb-1">
                  Will be logged today as:
                </MicroText>

                <Text className="text-foreground font-semibold">
                  {displayName} · {duration} min ·{' '}
                  {TOLERANCE_LABELS[tolerance]}
                </Text>

                {selectedTagIds.size > 0 && (
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {Array.from(selectedTagIds).map((id) => {
                      const tag = SELECTABLE_TAGS.find(
                        (item) => item.id === id,
                      );

                      return tag ? (
                        <DataBadge key={id} tag={tag} />
                      ) : null;
                    })}
                  </View>
                )}
              </View>

              {/* Actions */}
              <PrimaryButton
                label={isEditing ? 'Save changes' : 'Save entry'}
                onPress={handleSubmit}
                disabled={!isValid}
                className="w-full mb-3"
              />

              {isEditing && (
                <SecondaryButton
                  label="Delete entry"
                  onPress={handleDelete}
                  className="w-full mb-3"
                />
              )}

              <SecondaryButton
                label="Cancel"
                onPress={onClose}
                className="w-full"
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

function StepLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LabelText className="font-semibold text-foreground mb-2 mt-1">
      {children}
    </LabelText>
  );
}
