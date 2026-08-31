import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Pressable, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ChevronDown, ChevronUp, ClipboardList, GraduationCap, LayoutDashboard, UserRound, Users } from 'lucide-react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { ReEntryWordmark } from '@/components/ReEntryWordmark';
import { SchoolObservationsSection } from '@/components/SchoolObservationsSection';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { useSession } from '@/ctx';
import { supabase } from '@/client/supabase';
import { useThemeColors } from '@/lib/theme';
import { COLORS } from '@/lib/theme';
import { useTheme } from '@/context/ThemeContext';
import {
  connectStudentByCode,
  fetchSchoolLinkedStudents,
  fetchSchoolAccommodations,
  getSchoolObservationsForStudent,
  type SchoolStudent,
  type SchoolAccommodation,
} from '@/db/api';
import type { SchoolObservation } from '@/data/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SchoolWorkspaceScreen() {
  const { session, role } = useSession();
  const themeColors = useThemeColors();
  const { isDark, toggleTheme } = useTheme();

  const schoolStaffId = session?.user?.id;
  const displayUsername = session?.user?.email?.replace('@miaoda.com', '');
  const staffName = session?.user?.user_metadata?.display_name ?? displayUsername ?? 'School staff';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [accommodations, setAccommodations] = useState<SchoolAccommodation[]>([]);
  const [observations, setObservations] = useState<SchoolObservation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'observations' | 'profile'>('overview');
  const [themeError, setThemeError] = useState<string | null>(null);
  const [studentChooserOpen, setStudentChooserOpen] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!schoolStaffId) return;
    setRefreshing(true);
    const linkedStudents = await fetchSchoolLinkedStudents(schoolStaffId);
    const studentIds = linkedStudents.map((s) => s.studentId);
    const [accs, observationGroups] = await Promise.all([
      fetchSchoolAccommodations(studentIds),
      Promise.all(studentIds.map(getSchoolObservationsForStudent)),
    ]);
    setStudents(linkedStudents);
    setSelectedStudentId((current) => linkedStudents.some((student) => student.studentId === current)
      ? current
      : linkedStudents[0]?.studentId ?? null);
    setAccommodations(accs);
    setObservations(observationGroups.flat());
    setRefreshing(false);
  }, [schoolStaffId]);

  useFocusEffect(
    useCallback(() => {
      void loadStudents();
    }, [loadStudents]),
  );

  const accommodationsByStudent = useMemo(() => {
    const map = new Map<string, SchoolAccommodation[]>();
    for (const acc of accommodations) {
      const list = map.get(acc.studentId) ?? [];
      list.push(acc);
      map.set(acc.studentId, list);
    }
    return map;
  }, [accommodations]);

  const observationsByStudent = useMemo(() => {
    const map = new Map<string, SchoolObservation[]>();
    for (const observation of observations) {
      const list = map.get(observation.studentId) ?? [];
      list.push(observation);
      map.set(observation.studentId, list);
    }
    return map;
  }, [observations]);

  const handleConnect = async () => {
    if (!schoolStaffId) return;
    if (!code.trim()) {
      setError('Please enter a student access code.');
      return;
    }
    setLoading(true);
    setError(null);
    const studentId = await connectStudentByCode(code, 'school_staff');
    if (studentId) {
      setCode('');
      setShowConnect(false);
      await loadStudents();
    } else {
      setError('That code is invalid, expired, or already in use. Please double-check and try again.');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleToggleTheme = async () => {
    try {
      setThemeError(null);
      await toggleTheme();
    } catch {
      setThemeError('Appearance could not be updated. Please try again.');
    }
  };

  const selectedStudents = selectedStudentId
    ? students.filter((student) => student.studentId === selectedStudentId)
    : [];
  const selectedStudent = selectedStudents[0];

  if (role !== 'school_staff') {
    return (
      <ScreenShell>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-muted-foreground">This workspace is for school staff accounts.</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell noScroll>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 px-5 pt-6 pb-6">
          <FlatList
            data={selectedStudents}
            keyExtractor={(item) => item.accessId}
            contentInsetAdjustmentBehavior="automatic"
            refreshing={refreshing}
            onRefresh={loadStudents}
            ListHeaderComponent={(
              <View className="pb-4">
                <ReEntryWordmark className="mb-5" />
                <View className="mb-3 flex-row items-center gap-2">
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${themeColors.turmeric}22` }}>
                    <GraduationCap size={20} color={themeColors.foreground} />
                  </View>
                  <EditorialLabel>SCHOOL WORKSPACE</EditorialLabel>
                </View>
                <HeadingText className="mb-1">Students shared with you</HeadingText>
                <MicroText className="text-muted-foreground mb-5">
                  School staff see recorded supports needed for school, not the student's private recovery records.
                </MicroText>

              {students.length === 0 || showConnect ? <SectionCard className="mb-5">
                <View className="flex-row items-center gap-2 mb-2">
                  <Users size={18} color={themeColors.foreground} />
                  <Text className="text-base font-semibold text-foreground">Connect Student</Text>
                </View>
                <LabelText className="leading-5 mb-3">
                  Enter the access code the student generated from their Connected Access section.
                </LabelText>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="Enter 6-character code"
                  placeholderTextColor={themeColors.foregroundMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                  className="w-full bg-muted text-foreground rounded-xl px-4 py-3 mb-3"
                  style={[{ fontSize: 16 } as object]}
                  editable={!loading}
                />
                {error ? (
                  <Text className="text-sm text-destructive mb-3">{error}</Text>
                ) : null}
                <PrimaryButton
                  label={loading ? 'Connecting…' : 'Connect Student'}
                  onPress={handleConnect}
                  disabled={loading}
                  loading={loading}
                  className="w-full"
                />
                {students.length > 0 ? (
                  <SecondaryButton
                    label="Cancel"
                    onPress={() => setShowConnect(false)}
                    className="mt-3 w-full"
                  />
                ) : null}
              </SectionCard> : (
                <SecondaryButton
                  label="Connect another student"
                  onPress={() => setShowConnect(true)}
                  className="mb-5 self-start"
                />
              )}

                {students.length === 0 && !refreshing ? (
                <SectionCard className="items-center py-8">
                  <Text className="text-xl font-semibold text-foreground mb-2">No students connected yet</Text>
                  <MicroText className="text-center leading-5 px-4">
                    When a student shares their access code, their school-relevant information will appear here.
                  </MicroText>
                </SectionCard>
                ) : null}

                {students.length > 0 && selectedStudent ? (
                  <View className="mb-4">
                    <Pressable
                      onPress={() => setStudentChooserOpen((open) => !open)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: studentChooserOpen }}
                      className="min-h-14 flex-row items-center gap-3 rounded-xl border px-3 py-2"
                      style={{ borderColor: themeColors.turmeric, backgroundColor: `${themeColors.turmeric}12` }}
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-accent">
                        <Text className="font-bold text-accent-foreground">{(selectedStudent.displayName ?? 'Student').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View className="flex-1">
                        <MicroText className="font-semibold uppercase tracking-[0.1em] text-muted-foreground">Selected student</MicroText>
                        <Text className="font-semibold text-foreground">{selectedStudent.displayName ?? 'Student'}</Text>
                      </View>
                      {studentChooserOpen ? <ChevronUp size={18} color={themeColors.foreground} /> : <ChevronDown size={18} color={themeColors.foreground} />}
                    </Pressable>
                    {studentChooserOpen ? <View className="mt-2 gap-2">
                    {students.map((student) => {
                      const selected = student.studentId === selectedStudentId;
                      return (
                        <Pressable
                          key={student.accessId}
                          onPress={() => {
                            setSelectedStudentId(student.studentId);
                            setActiveTab('overview');
                            setStudentChooserOpen(false);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          className="min-h-14 flex-row items-center gap-3 rounded-xl border px-3 py-2"
                          style={{ borderColor: selected ? themeColors.turmeric : themeColors.border, backgroundColor: selected ? `${themeColors.turmeric}12` : themeColors.card }}
                        >
                          <View className="h-9 w-9 items-center justify-center rounded-full bg-accent">
                            <Text className="font-bold text-accent-foreground">{(student.displayName ?? 'Student').charAt(0).toUpperCase()}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="font-semibold text-foreground">{student.displayName ?? 'Student'}</Text>
                            <MicroText className="text-muted-foreground">{selected ? 'Selected student' : 'Open workspace'}</MicroText>
                          </View>
                        </Pressable>
                      );
                    })}
                    </View> : null}
                  </View>
                ) : null}

                {selectedStudent ? (
                  <View className="mb-1 flex-row rounded-xl border border-border bg-card p-1">
                    {([
                      ['overview', 'Overview', LayoutDashboard],
                      ['observations', 'Observations', ClipboardList],
                      ['profile', 'Profile', UserRound],
                    ] as const).map(([tab, label, Icon]) => {
                      const selected = activeTab === tab;
                      const color = selected ? COLORS.brightYellow : themeColors.foreground;
                      return (
                        <Pressable
                          key={tab}
                          onPress={() => setActiveTab(tab)}
                          accessibilityRole="tab"
                          accessibilityState={{ selected }}
                          className="min-h-14 flex-1 items-center justify-center rounded-lg px-1 py-1.5"
                          style={{ backgroundColor: selected ? themeColors.foreground : 'transparent' }}
                        >
                          <Icon size={17} color={color} />
                          <Text className="mt-1 text-[11px] font-semibold" style={{ color }}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
            </View>
          )}
          renderItem={({ item: student }) => {
            const studentAccs = accommodationsByStudent.get(student.studentId) ?? [];
            const studentObservations = observationsByStudent.get(student.studentId) ?? [];
            return (
              <SectionCard className="mb-4">
                {activeTab !== 'profile' ? <View className="flex-row items-center gap-3 mb-3">
                  <View className="w-10 h-10 rounded-full bg-accent items-center justify-center">
                    <Text className="text-base font-bold text-accent-foreground">
                      {(student.displayName ?? 'Student').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                      {student.displayName ?? 'Student'}
                    </Text>
                    <MicroText className="text-muted-foreground">Student</MicroText>
                  </View>
                </View> : null}

                {activeTab === 'overview' ? (
                  <View>
                    <MicroText className="mb-3 leading-5 text-muted-foreground">
                      School staff see recorded supports needed for school, not the student's private recovery records.
                    </MicroText>
                <SubheadingText className="text-sm mb-2">Current school supports</SubheadingText>
                {studentAccs.length === 0 ? (
                  <MicroText className="text-muted-foreground">No active accommodations to display.</MicroText>
                ) : (
                  <View className="gap-2">
                    {studentAccs.map((acc) => (
                      <View key={acc.id} className="bg-muted rounded-xl p-3">
                        <Text className="text-sm font-medium text-foreground mb-1" numberOfLines={2}>
                          {acc.title}
                        </Text>
                        {acc.issuedDate ? (
                          <MicroText className="text-muted-foreground">
                            Issued / started: {formatDate(acc.issuedDate)}
                          </MicroText>
                        ) : null}
                        <MicroText className="text-muted-foreground">
                          Valid through: {acc.validUntil ? formatDate(acc.validUntil) : 'No end date recorded'}
                        </MicroText>
                        <MicroText className="mt-1 font-semibold text-foreground">Active</MicroText>
                      </View>
                    ))}
                  </View>
                )}
                  </View>
                ) : null}

                {activeTab === 'observations' ? (
                  <SchoolObservationsSection
                    studentId={student.studentId}
                    observations={studentObservations}
                    currentUserId={schoolStaffId}
                    editable
                    onChanged={loadStudents}
                  />
                ) : null}

                {activeTab === 'profile' ? (
                  <View className="gap-4">
                    <View className="rounded-xl bg-muted p-3">
                      <Text className="font-semibold text-foreground">{staffName}</Text>
                      <MicroText className="text-muted-foreground">School staff</MicroText>
                    </View>
                    <View className="flex-row items-center justify-between gap-4 rounded-xl border border-border p-3">
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">Dark Mode</Text>
                        <MicroText className="text-muted-foreground">Use the dark appearance across ReEntry.</MicroText>
                      </View>
                      <Switch
                        value={isDark}
                        onValueChange={handleToggleTheme}
                        trackColor={{ false: themeColors.mossLight, true: themeColors.moss }}
                        thumbColor={COLORS.warmWhite}
                        accessibilityLabel="Dark Mode toggle"
                      />
                    </View>
                    {themeError ? <Text className="text-sm text-destructive">{themeError}</Text> : null}
                    <SecondaryButton label="Sign Out" onPress={handleSignOut} className="w-full" />
                  </View>
                ) : null}
              </SectionCard>
            );
          }}
          ListFooterComponent={(
            <View className="h-8" />
          )}
        />
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
