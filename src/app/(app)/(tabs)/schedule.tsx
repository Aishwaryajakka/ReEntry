import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { HeadingText, LabelText, MicroText, SubheadingText } from '@/components/Typography';
import { useAppContext } from '@/context/AppContext';
import { ACTIVITY_CATEGORIES, type ActivityCategory, type StudentScheduleItem } from '@/data/types';
import type { ScheduleItemInput } from '@/db/api';
import { syncScheduleNotifications } from '@/lib/scheduleNotifications';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { StudentPageHeader } from '@/components/StudentPageHeader';

const WEEKDAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const EMPTY_FORM: ScheduleItemInput = {
  activityName: '',
  activityCategory: 'Class',
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '09:50',
  remindersEnabled: false,
  active: true,
};

function formatTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function validTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function SchoolScheduleScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { scheduleItems, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleItemInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isValid = useMemo(() =>
    form.activityName.trim().length > 0 &&
    form.daysOfWeek.length > 0 &&
    validTime(form.startTime) && validTime(form.endTime) &&
    form.endTime > form.startTime,
  [form]);

  const openNew = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((item: StudentScheduleItem) => {
    setEditingId(item.id);
    setForm({
      activityName: item.activityName,
      activityCategory: item.activityCategory,
      daysOfWeek: item.daysOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      remindersEnabled: item.remindersEnabled,
      active: item.active,
    });
    setMessage(null);
    setShowForm(true);
  }, []);

  const save = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = editingId
        ? await updateScheduleItem(editingId, form)
        : await addScheduleItem(form);
      const next = editingId
        ? scheduleItems.map((item) => item.id === editingId ? saved : item)
        : [...scheduleItems, saved];
      const result = await syncScheduleNotifications(next, form.remindersEnabled);
      if (result === 'denied') setMessage('Notification access is off. Your schedule was saved without local reminders.');
      if (result === 'unavailable') setMessage('Your schedule was saved. Local reminders are available in the iOS and Android app.');
      setShowForm(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The schedule item could not be saved.');
    } finally {
      setSaving(false);
    }
  }, [addScheduleItem, editingId, form, isValid, saving, scheduleItems, updateScheduleItem]);

  const remove = useCallback(async (itemId: string) => {
    setMessage(null);
    try {
      await deleteScheduleItem(itemId);
      await syncScheduleNotifications(scheduleItems.filter((item) => item.id !== itemId), false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The schedule item could not be deleted.');
    }
  }, [deleteScheduleItem, scheduleItems]);

  return (
    <ScreenShell>
      <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-2 self-start p-2" accessibilityRole="button" accessibilityLabel="Back to Today">
        <ArrowLeft size={20} color={theme.foreground} />
        <Text className="font-semibold text-foreground">Today</Text>
      </Pressable>
      <StudentPageHeader className="mb-4" />
      <HeadingText>School Schedule</HeadingText>
      <LabelText className="mb-5 mt-2 leading-5 text-muted-foreground">
        Your school schedule is used to time your ReEntry check-ins.
      </LabelText>

      {message && <SectionCard className="mb-4"><LabelText className="leading-5">{message}</LabelText></SectionCard>}

      {scheduleItems.map((item) => (
        <SectionCard key={item.id} className="mb-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <SubheadingText className="text-lg">{item.activityName}</SubheadingText>
              <LabelText className="mt-1">{formatTime(item.startTime)}–{formatTime(item.endTime)}</LabelText>
              <MicroText className="mt-1 text-muted-foreground">
                {WEEKDAYS.filter((day) => item.daysOfWeek.includes(day.value)).map((day) => day.label).join(', ')} · {item.activityCategory}
              </MicroText>
              <MicroText className="mt-2 text-muted-foreground">
                {item.remindersEnabled ? 'Reminder 5 minutes after class' : 'Reminders off'}{item.active ? '' : ' · Disabled'}
              </MicroText>
            </View>
            <View className="flex-row gap-1">
              <Pressable onPress={() => openEdit(item)} className="p-3" accessibilityRole="button" accessibilityLabel={`Edit ${item.activityName}`}>
                <Pencil size={19} color={theme.foreground} />
              </Pressable>
              <Pressable onPress={() => remove(item.id)} className="p-3" accessibilityRole="button" accessibilityLabel={`Delete ${item.activityName}`}>
                <Trash2 size={19} color={theme.rust} />
              </Pressable>
            </View>
          </View>
        </SectionCard>
      ))}

      {scheduleItems.length === 0 && !showForm && (
        <SectionCard className="mb-4"><LabelText>No classes saved yet. Add your recurring school-day schedule when you are ready.</LabelText></SectionCard>
      )}

      {!showForm && <PrimaryButton label="Add class or activity" onPress={openNew} iconLeft={<Plus size={20} color={theme.warmWhite} />} className="mb-5 w-full" />}

      {showForm && (
        <SectionCard className="mb-5">
          <SubheadingText className="mb-4">{editingId ? 'Edit schedule item' : 'Add schedule item'}</SubheadingText>
          <FieldLabel>Class or activity name</FieldLabel>
          <TextInput value={form.activityName} onChangeText={(activityName) => setForm((current) => ({ ...current, activityName }))} placeholder="Chemistry" placeholderTextColor={theme.foregroundMuted} className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground" />

          <FieldLabel>Category</FieldLabel>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {ACTIVITY_CATEGORIES.map((category) => <Choice key={category} label={category} selected={form.activityCategory === category} onPress={() => setForm((current) => ({ ...current, activityCategory: category as ActivityCategory }))} />)}
          </View>

          <FieldLabel>Recurring days</FieldLabel>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {WEEKDAYS.map((day) => <Choice key={day.value} label={day.label} selected={form.daysOfWeek.includes(day.value)} onPress={() => setForm((current) => ({ ...current, daysOfWeek: current.daysOfWeek.includes(day.value) ? current.daysOfWeek.filter((value) => value !== day.value) : [...current.daysOfWeek, day.value].sort() }))} />)}
          </View>

          <View className="mb-4 flex-row flex-wrap gap-3">
            <View className="min-w-[130px] flex-1"><FieldLabel>Start (HH:MM)</FieldLabel><TextInput value={form.startTime} onChangeText={(startTime) => setForm((current) => ({ ...current, startTime }))} placeholder="09:00" placeholderTextColor={theme.foregroundMuted} className="rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></View>
            <View className="min-w-[130px] flex-1"><FieldLabel>End (HH:MM)</FieldLabel><TextInput value={form.endTime} onChangeText={(endTime) => setForm((current) => ({ ...current, endTime }))} placeholder="09:50" placeholderTextColor={theme.foregroundMuted} className="rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></View>
          </View>

          <Choice label={form.remindersEnabled ? 'Reminders enabled' : 'Enable reminders'} selected={form.remindersEnabled} onPress={() => setForm((current) => ({ ...current, remindersEnabled: !current.remindersEnabled }))} icon={<Bell size={17} color={form.remindersEnabled ? theme.background : theme.foreground} />} />
          <View className="mt-2"><Choice label={form.active ? 'Schedule item active' : 'Schedule item disabled'} selected={form.active} onPress={() => setForm((current) => ({ ...current, active: !current.active }))} /></View>
          {!isValid && <MicroText className="mt-3 text-muted-foreground">Enter a name, at least one day, and an end time after the start time.</MicroText>}
          <PrimaryButton label={editingId ? 'Save changes' : 'Add to schedule'} onPress={save} disabled={!isValid} loading={saving} className="mt-5 w-full" />
          <SecondaryButton label="Cancel" onPress={() => setShowForm(false)} className="mt-3 w-full" />
        </SectionCard>
      )}

      <MicroText className="text-center leading-5 text-muted-foreground">
        ReEntry schedules collection opportunities only. It does not monitor or medically interpret your school day.
      </MicroText>
    </ScreenShell>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <LabelText className="mb-2 font-semibold text-foreground">{children}</LabelText>;
}

function Choice({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} className={cn('min-h-[42px] flex-row items-center gap-2 rounded-full border px-4 py-2.5', selected ? 'border-primary bg-primary' : 'border-border bg-background')} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
      {icon}
      <Text className={cn('text-sm font-medium', selected ? 'text-primary-foreground' : 'text-foreground')}>{label}</Text>
    </Pressable>
  );
}
