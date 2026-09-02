import { useState, useCallback, useEffect } from 'react';
import { Switch, TextInput, View } from 'react-native';

import { LabelText, MicroText } from '@/components/Typography';
import { ProfessionalFormSheet } from '@/components/ProfessionalFormSheet';
import { useThemeColors } from '@/lib/theme';
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
    <ProfessionalFormSheet
      visible={visible}
      title={isEditing ? 'Edit accommodation' : 'Record accommodation'}
      primaryLabel={isEditing ? 'Save changes' : 'Save accommodation'}
      onPrimaryPress={handleSave}
      onClose={handleClose}
      loading={loading}
      error={error}
    >
      <View className="gap-4">
        <MicroText className="leading-5 text-muted-foreground">
          Record a support or accommodation that may be visible to the student and authorized school staff.
        </MicroText>
        <View className="gap-[6px]">
          <LabelText>Title *</LabelText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Reduced screen time"
            placeholderTextColor={theme.foregroundMuted}
            className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
            style={{ minHeight: 52 } as object}
            returnKeyType="next"
            editable={!loading}
          />
        </View>

        <View className="gap-[6px]">
              <LabelText>Source / Issuer</LabelText>
              <TextInput
                value={sourceName}
                onChangeText={setSourceName}
                placeholder="e.g., Dr. Smith, Neurology"
                placeholderTextColor={theme.foregroundMuted}
                className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
                style={{ minHeight: 52 } as object}
                returnKeyType="next"
                editable={!loading}
              />
        </View>

        <View className="gap-[6px]">
              <LabelText>Issued date (optional)</LabelText>
              <TextInput
                value={issuedDate}
                onChangeText={setIssuedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.foregroundMuted}
                className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
                style={{ minHeight: 52 } as object}
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                editable={!loading}
              />
        </View>

        <View className="gap-[6px]">
              <LabelText>Valid until (optional)</LabelText>
              <TextInput
                value={validUntil}
                onChangeText={setValidUntil}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.foregroundMuted}
                className="rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
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
      </View>
    </ProfessionalFormSheet>
  );
}
