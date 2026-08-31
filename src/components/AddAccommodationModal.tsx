import { useState, useCallback, useEffect } from 'react';
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { AccentButton, GhostButton } from '@/components/Buttons';
import { SectionCard } from '@/components/SectionCard';
import { HeadingText, LabelText, MicroText } from '@/components/Typography';
import { useThemeColors } from '@/lib/theme';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useReducedExperience } from '@/lib/accessibility';
import { insertAccommodation, updateAccommodation, type SchoolAccommodation } from '@/db/api';

interface AddAccommodationModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  onSaved: () => void;
  accommodation?: SchoolAccommodation | null;
}

function isValidDate(str: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return d.toISOString().slice(0, 10) === str;
}

export function AddAccommodationModal({ visible, onClose, studentId, onSaved, accommodation }: AddAccommodationModalProps) {
  const theme = useThemeColors();
  const { isDark } = useTheme();
  const { reduced } = useReducedExperience();
  const isEditing = Boolean(accommodation?.id);
  const [title, setTitle] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle('');
    setSourceName('');
    setIssuedDate('');
    setValidUntil('');
    setIsActive(true);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible && accommodation) {
      setTitle(accommodation.title);
      setSourceName(accommodation.source === 'clinician' ? '' : accommodation.source);
      setIssuedDate(accommodation.issuedDate ?? '');
      setValidUntil(accommodation.validUntil ?? '');
      setIsActive(accommodation.active);
    } else if (visible) {
      reset();
    }
  }, [visible, accommodation, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedSource = sourceName.trim();

    if (!trimmedTitle) {
      setError('Please enter an accommodation title.');
      return;
    }
    if (issuedDate && !isValidDate(issuedDate)) {
      setError('Please enter a valid issued date (YYYY-MM-DD) or leave it blank.');
      return;
    }
    if (validUntil && !isValidDate(validUntil)) {
      setError('Please enter a valid valid-until date (YYYY-MM-DD) or leave it blank.');
      return;
    }

    setLoading(true);
    let result: SchoolAccommodation | null = null;

    if (isEditing && accommodation) {
      result = await updateAccommodation(accommodation.id, {
        title: trimmedTitle,
        sourceName: trimmedSource || null,
        issuedDate: issuedDate || null,
        validUntil: validUntil || null,
        status: isActive ? 'active' : 'inactive',
      });
    } else {
      result = await insertAccommodation({
        studentId,
        title: trimmedTitle,
        sourceName: trimmedSource || null,
        issuedDate: issuedDate || null,
        validUntil: validUntil || null,
        status: isActive ? 'active' : 'inactive',
      });
    }
    setLoading(false);

    if (result) {
      onSaved();
      reset();
      onClose();
    } else {
      setError('Unable to save accommodation. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType={reduced ? 'fade' : 'slide'}
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className={cn('flex-1', isDark && 'dark')}>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="w-full max-w-[720px] self-center px-6 pt-6 pb-24"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="flex-row items-center justify-between mb-4">
            <HeadingText className="leading-tight">{isEditing ? 'Edit Accommodation' : 'Record Accommodation'}</HeadingText>
            <Pressable
              onPress={handleClose}
              className="min-h-11 min-w-11 items-center justify-center rounded-full active:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <X size={22} color={theme.foreground} />
            </Pressable>
          </View>

          <MicroText className="text-muted-foreground mb-5 leading-5">
            Record a support or accommodation that may be visible to the student and authorized school staff.
          </MicroText>

          <SectionCard className="gap-4 mb-4">
            <View className="gap-2">
              <LabelText>Title *</LabelText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Reduced screen time"
                placeholderTextColor={theme.foregroundMuted}
                className="bg-background text-foreground rounded-xl px-4 py-3.5 text-base border border-border"
                style={{ minHeight: 52 } as object}
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            <View className="gap-2">
              <LabelText>Source / Issuer</LabelText>
              <TextInput
                value={sourceName}
                onChangeText={setSourceName}
                placeholder="e.g., Dr. Smith, Neurology"
                placeholderTextColor={theme.foregroundMuted}
                className="bg-background text-foreground rounded-xl px-4 py-3.5 text-base border border-border"
                style={{ minHeight: 52 } as object}
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            <View className="gap-2">
              <LabelText>Issued date (optional)</LabelText>
              <TextInput
                value={issuedDate}
                onChangeText={setIssuedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.foregroundMuted}
                className="bg-background text-foreground rounded-xl px-4 py-3.5 text-base border border-border"
                style={{ minHeight: 52 } as object}
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            <View className="gap-2">
              <LabelText>Valid until (optional)</LabelText>
              <TextInput
                value={validUntil}
                onChangeText={setValidUntil}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.foregroundMuted}
                className="bg-background text-foreground rounded-xl px-4 py-3.5 text-base border border-border"
                style={{ minHeight: 52 } as object}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                editable={!loading}
              />
            </View>

            <View className="flex-row items-center justify-between py-2">
              <LabelText>Active</LabelText>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                disabled={loading}
                trackColor={{ false: theme.moon, true: theme.moss }}
                thumbColor={isActive ? theme.warmWhite : theme.foregroundMuted}
                ios_backgroundColor={theme.moon}
              />
            </View>
          </SectionCard>

          {error ? <MicroText className="text-destructive mb-3">{error}</MicroText> : null}

          <AccentButton
            label={loading ? 'Saving…' : (isEditing ? 'Save Changes' : 'Save Accommodation')}
            onPress={handleSave}
            disabled={loading}
            loading={loading}
            className="mb-1 w-full"
          />
          <GhostButton label="Cancel" onPress={handleClose} className="self-center px-4" style={{ minHeight: 44 }} disabled={loading} />
        </ScrollView>
      </SafeAreaView>
      </View>
    </Modal>
  );
}
