/**
 * ActivityLogModal — low-friction cognitive-fatigue-aware logging flow.
 * Uses a single Modal with a bottom-sheet-like panel.
 * Preserves one-tap category selection, big manageability chips, and optional details.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { AccentButton, DestructiveButton, GhostButton } from './Buttons';
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
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const SELECTABLE_TAGS = CHALLENGE_TAGS;
const TOLERANCE_OPTIONS: ActivityLog['toleranceRating'][] = [3, 2, 1];

interface ActivityLogModalProps {
  visible: boolean;
  onClose: () => void;
  log?: ActivityLog;
  prefill?: {
    activityCategory?: ActivityCategory | null;
    customLabel?: string | null;
    durationMinutes?: number | null;
    toleranceRating?: ActivityLog['toleranceRating'] | null;
    challengeTagIds?: string[];
    notes?: string;
  };
  reviewTranscript?: string;
  title?: string;
  submitLabel?: string;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  visible,
  onClose,
  log,
  prefill,
  title,
  submitLabel,
}) => {
  const {
    addActivityLog,
    updateActivityLog,
    deleteActivityLog,
    today,
  } = useAppContext();

  const { reduced } = useReducedExperience();
  const theme = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
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
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

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
      setCategory(log?.activityCategory ?? prefill?.activityCategory ?? null);
      setCustomLabel(log?.customLabel ?? prefill?.customLabel ?? '');
      setDuration(log?.durationMinutes ?? prefill?.durationMinutes ?? 30);
      setTolerance(log?.toleranceRating ?? prefill?.toleranceRating ?? 2);
      setNote(log?.notes ?? prefill?.notes ?? '');
      setSelectedTagIds(new Set(log?.challengeTagIds ?? prefill?.challengeTagIds ?? []));
      setError(null);
      setSubmitting(false);
      submittingRef.current = false;
    } else {
      reset();
    }
  }, [visible, log, prefill, reset]);

  const isValid = !!category && customLabel.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    if (!isValid || !category) {
      setError('Please select a category and enter an activity name.');
      return;
    }

    setError(null);
    submittingRef.current = true;
    setSubmitting(true);

    const input = {
      date: today,
      activityCategory: category,
      customLabel: customLabel.trim(),
      durationMinutes: duration,
      toleranceRating: tolerance,
      notes: note,
      challengeTagIds: Array.from(selectedTagIds),
    };

    try {
      if (isEditing && log) {
        await updateActivityLog(log.id, input);
      } else {
        await addActivityLog(input);
      }

      reset();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your activity could not be saved. Please try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
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
      <View className={cn('flex-1 justify-end', isDark && 'dark')}>
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
            className="bg-card w-full max-w-[680px] self-center rounded-t-3xl"
            style={
              {
                borderCurve: 'continuous',
                height: '90%',
                paddingBottom: insets.bottom,
              } as object
            }
          >
            <View className="p-6">
              <View className="flex-row items-center justify-between mb-2">
                <SubheadingText>{title ?? 'Log activity'}</SubheadingText>

                <Pressable
                  onPress={onClose}
                  className="min-h-11 min-w-11 items-center justify-center rounded-full active:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className={cn('rounded-full border px-4 py-2.5', category !== cat && 'bg-card border-border')}
                    style={{
                      minHeight: 40,
                      ...(category === cat ? { backgroundColor: theme.accent, borderColor: theme.accent } : {}),
                    } as object}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: category === cat,
                    }}
                  >
                    <Text className="text-sm font-medium" style={{ color: category === cat ? theme.deepForest : theme.foreground }}>
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

                </>
              )}

              {/* 2. Duration */}
              <StepLabel>2. For how long?</StepLabel>

              <View className="flex-row flex-wrap gap-2 mb-5">
                {DURATION_OPTIONS.map((mins) => (
                  <Pressable
                    key={mins}
                    onPress={() => setDuration(mins)}
                    className={cn('w-[72px] rounded-xl border px-2 py-2.5', duration !== mins && 'bg-card border-border')}
                    style={{ minHeight: 44, ...(duration === mins ? { backgroundColor: theme.accent, borderColor: theme.accent } : {}) }}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: duration === mins,
                    }}
                  >
                    <Text className="text-center text-sm font-semibold" style={{ color: duration === mins ? theme.deepForest : theme.foreground }}>
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
                    className={cn('flex-row items-center justify-between rounded-xl border px-4 py-3.5', tolerance !== rating && 'bg-card border-border')}
                    style={tolerance === rating ? { backgroundColor: theme.accent, borderColor: theme.accent } : undefined}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: tolerance === rating,
                    }}
                  >
                    <Text className="text-base font-medium" style={{ color: tolerance === rating ? theme.deepForest : theme.foreground }}>
                      {TOLERANCE_LABELS[rating]}
                    </Text>

                    <View className="flex-row gap-1">
                      {[1, 2, 3].map((i) => (
                        <View
                          key={i}
                          className={cn('h-2 w-2 rounded-full', i > rating && 'bg-border')}
                          style={i <= rating ? { backgroundColor: tolerance === rating ? theme.deepForest : theme.foreground } : undefined}
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
                      className={cn('rounded-full border px-3 py-2', !selected && 'bg-card border-border')}
                      style={selected ? { backgroundColor: theme.accent, borderColor: theme.accent } : undefined}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: selected,
                      }}
                    >
                      <Text className="text-sm font-medium" style={{ color: selected ? theme.deepForest : theme.foreground }}>
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

            </ScrollView>

            <View className="border-t border-border px-6 pt-3">
              {error && (
                <Text className="mb-2 text-xs text-destructive" accessibilityLiveRegion="polite">
                  {error}
                </Text>
              )}

              <AccentButton
                label={isEditing ? 'Save changes' : submitLabel ?? 'Save entry'}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                loading={submitting}
                className="mb-1 w-full"
              />

              {isEditing && (
                <DestructiveButton
                  label="Delete entry"
                  onPress={handleDelete}
                  className="w-full mb-3"
                />
              )}

              <GhostButton
                label="Cancel"
                onPress={onClose}
                className="w-full"
                style={{ minHeight: 44 }}
              />
            </View>
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
