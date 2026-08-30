import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Users, Activity } from 'lucide-react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { AddAccommodationModal } from '@/components/AddAccommodationModal';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { useSession } from '@/ctx';
import { supabase } from '@/client/supabase';
import { COLORS, useThemeColors } from '@/lib/theme';
import {
  connectStudentByCode,
  fetchClinicianLinkedStudents,
  fetchClinicianActivityLogs,
  fetchClinicianChallengeTags,
  fetchClinicianDailyCheckIns,
  fetchClinicianAccommodations,
  type SchoolStudent,
  type SchoolAccommodation,
  type ClinicianActivityLog,
  type ClinicianDailyCheckIn,
  type ClinicianChallengeTag,
} from '@/db/api';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MANAGEABILITY: Record<number, string> = {
  1: 'Very difficult',
  2: 'Some difficulty',
  3: 'Manageable',
};

export default function ClinicianWorkspaceScreen() {
  const { session, role } = useSession();
  const themeColors = useThemeColors();

  const clinicianId = session?.user?.id;
  const displayUsername = session?.user?.email?.replace('@miaoda.com', '');
  const currentDate = new Date().toISOString().slice(0, 10);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ClinicianActivityLog[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<ClinicianDailyCheckIn[]>([]);
  const [challengeTags, setChallengeTags] = useState<ClinicianChallengeTag[]>([]);
  const [accommodations, setAccommodations] = useState<SchoolAccommodation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addStudentId, setAddStudentId] = useState<string | null>(null);
  const [editAcc, setEditAcc] = useState<SchoolAccommodation | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  const loadData = useCallback(async () => {
    if (!clinicianId) return;
    setRefreshing(true);
    const linkedStudents = await fetchClinicianLinkedStudents(clinicianId);
    const studentIds = linkedStudents.map((s) => s.studentId);
    const [logs, checkins, accs] = await Promise.all([
      fetchClinicianActivityLogs(studentIds),
      fetchClinicianDailyCheckIns(studentIds),
      fetchClinicianAccommodations(studentIds),
    ]);
    const logIds = logs.map((l) => l.id);
    const realTags = await fetchClinicianChallengeTags(logIds);
    setStudents(linkedStudents);
    setActivityLogs(logs);
    setChallengeTags(realTags);
    setDailyCheckIns(checkins);
    setAccommodations(accs);
    setRefreshing(false);
  }, [clinicianId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const logsByStudent = useMemo(() => {
    const map = new Map<string, ClinicianActivityLog[]>();
    for (const log of activityLogs) {
      const list = map.get(log.studentId) ?? [];
      list.push(log);
      map.set(log.studentId, list);
    }
    return map;
  }, [activityLogs]);

  const checkInsByStudent = useMemo(() => {
    const map = new Map<string, ClinicianDailyCheckIn[]>();
    for (const c of dailyCheckIns) {
      const list = map.get(c.studentId) ?? [];
      list.push(c);
      map.set(c.studentId, list);
    }
    return map;
  }, [dailyCheckIns]);

  const tagsByStudent = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const log of activityLogs) {
      const studentTags = map.get(log.studentId) ?? new Map<string, number>();
      for (const tag of challengeTags.filter((t) => t.activityLogId === log.id)) {
        studentTags.set(tag.tag, (studentTags.get(tag.tag) ?? 0) + 1);
      }
      map.set(log.studentId, studentTags);
    }
    return map;
  }, [activityLogs, challengeTags]);

  const accommodationsByStudent = useMemo(() => {
    const map = new Map<string, SchoolAccommodation[]>();
    for (const acc of accommodations) {
      const list = map.get(acc.studentId) ?? [];
      list.push(acc);
      map.set(acc.studentId, list);
    }
    return map;
  }, [accommodations]);

  const handleConnect = async () => {
    if (!clinicianId) return;
    if (!code.trim()) {
      setError('Please enter a student access code.');
      return;
    }
    setLoading(true);
    setError(null);
    const studentId = await connectStudentByCode(code, 'clinician');
    if (studentId) {
      setCode('');
      setShowConnect(false);
      await loadData();
    } else {
      setError('That code is invalid, expired, or already in use. Please double-check and try again.');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (role !== 'clinician') {
    return (
      <ScreenShell>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-muted-foreground">This workspace is for clinician accounts.</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell noScroll>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-1 px-5 pt-6 pb-6">
          <FlatList
            data={students}
            keyExtractor={(item) => item.accessId}
            contentInsetAdjustmentBehavior="automatic"
            refreshing={refreshing}
            onRefresh={loadData}
            ListHeaderComponent={(
              <View className="pb-4">
                <EditorialLabel className="mb-3">CLINICIAN WORKSPACE</EditorialLabel>
                <HeadingText className="mb-1">Students shared with you</HeadingText>
                <MicroText className="text-muted-foreground mb-5">
                  Review self-reported recovery records shared with you by students.
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
                      When a student shares their access code, their observational data will appear here.
                    </MicroText>
                  </SectionCard>
                ) : null}
              </View>
            )}
            renderItem={({ item: student }) => {
              const studentLogs = logsByStudent.get(student.studentId) ?? [];
              const recentLogs = studentLogs.slice(0, 5);
              const studentCheckIns = checkInsByStudent.get(student.studentId) ?? [];
              const studentTagCounts = tagsByStudent.get(student.studentId) ?? new Map<string, number>();
              const recurringTags = Array.from(studentTagCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
              const studentAccs = accommodationsByStudent.get(student.studentId) ?? [];
              const activeStudentAccs = studentAccs.filter(
                (acc) => acc.active && (!acc.validUntil || acc.validUntil >= currentDate),
              );
              const chronologicalDates = studentLogs.map((log) => log.date).sort();
              const observationWindow = chronologicalDates.length > 0
                ? `${formatDate(chronologicalDates[0])} – ${formatDate(chronologicalDates[chronologicalDates.length - 1])}`
                : 'No activity dates recorded';

              return (
                <SectionCard className="mb-4">
                  <View className="flex-row items-center gap-3 mb-3">
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
                  </View>

                  <SubheadingText className="mb-2">Student summary</SubheadingText>
                  <View className="mb-4 gap-2 rounded-xl bg-muted p-3">
                    <View>
                      <MicroText className="text-muted-foreground">Observation window</MicroText>
                      <Text className="text-sm font-medium text-foreground">{observationWindow}</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      <View className="rounded-full bg-background px-3 py-1.5">
                        <MicroText className="text-foreground">{studentLogs.length} activities</MicroText>
                      </View>
                      <View className="rounded-full bg-background px-3 py-1.5">
                        <MicroText className="text-foreground">{studentCheckIns.length} check-ins</MicroText>
                      </View>
                      <View className="rounded-full bg-background px-3 py-1.5">
                        <MicroText className="text-foreground">{activeStudentAccs.length} current supports</MicroText>
                      </View>
                    </View>
                  </View>

                  <SubheadingText className="text-sm mb-2">Functional evidence</SubheadingText>
                  <MicroText className="mb-3 leading-5 text-muted-foreground">
                    Recent self-reported activity records. These observations do not determine medical readiness.
                  </MicroText>
                  {recentLogs.length === 0 ? (
                    <MicroText className="text-muted-foreground mb-3">No activity records yet.</MicroText>
                  ) : (
                    <View className="gap-2 mb-3">
                      {recentLogs.map((log) => (
                        <View key={log.id} className="bg-muted rounded-xl p-3">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                              {log.activityName}
                            </Text>
                            <MicroText className="text-muted-foreground">{formatDate(log.date)}</MicroText>
                          </View>
                          <View className="flex-row items-center gap-4 flex-wrap">
                            <View className="flex-row items-center gap-1">
                              <Activity size={12} color={themeColors.foregroundMuted} />
                              <MicroText className="text-muted-foreground">{log.activityCategory}</MicroText>
                            </View>
                            {log.durationMinutes > 0 && (
                              <View className="flex-row items-center gap-1">
                                <MicroText className="text-muted-foreground">{log.durationMinutes} min</MicroText>
                              </View>
                            )}
                            <MicroText className="text-muted-foreground">
                              {MANAGEABILITY[log.manageability] ?? `Manageability ${log.manageability}`}
                            </MicroText>
                          </View>
                          {challengeTags.some((tag) => tag.activityLogId === log.id) ? (
                            <View className="mt-2 flex-row flex-wrap gap-1.5">
                              {challengeTags
                                .filter((tag) => tag.activityLogId === log.id)
                                .map((tag) => (
                                  <View key={tag.id} className="rounded-full bg-background px-2.5 py-1">
                                    <MicroText className="text-foreground">{tag.tag}</MicroText>
                                  </View>
                                ))}
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  )}

                  {recurringTags.length > 0 && (
                    <View className="mb-3">
                      <SubheadingText className="text-sm mb-2">Self-reported recurring challenge tags</SubheadingText>
                      <View className="flex-row flex-wrap gap-2">
                        {recurringTags.map(([tag, count]) => (
                          <View key={tag} className="bg-muted rounded-full px-3 py-1">
                            <MicroText className="text-foreground">{tag} ({count})</MicroText>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View className="flex-row items-center justify-between mb-2">
                    <SubheadingText className="text-sm">Current school supports</SubheadingText>
                  </View>
                  {activeStudentAccs.length === 0 ? (
                    <MicroText className="text-muted-foreground">No recorded accommodations.</MicroText>
                  ) : (
                    <View className="gap-2">
                      {activeStudentAccs.map((acc) => (
                        <View key={acc.id} className="bg-muted rounded-xl p-3">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                              {acc.title}
                            </Text>
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{ backgroundColor: acc.active ? themeColors.moss : themeColors.moon }}
                            >
                              <MicroText style={{ color: acc.active ? COLORS.warmWhite : themeColors.foreground }}>
                                {acc.active ? 'Active' : 'Inactive'}
                              </MicroText>
                            </View>
                          </View>
                          <MicroText className="text-muted-foreground">Source: {acc.source}</MicroText>
                          {acc.issuedDate ? (
                            <MicroText className="text-muted-foreground">Issued {formatDate(acc.issuedDate)}</MicroText>
                          ) : null}
                          <MicroText className="text-muted-foreground">Updated {formatDate(acc.updatedAt.slice(0, 10))}</MicroText>
                          {acc.validUntil ? (
                            <MicroText className="text-muted-foreground">Valid until {formatDate(acc.validUntil)}</MicroText>
                          ) : null}
                          <SecondaryButton
                            label="Edit"
                            onPress={() => {
                              setEditAcc(acc);
                              setAddStudentId(student.studentId);
                            }}
                            className="self-start rounded-full px-3 py-1 mt-2"
                            style={{ minHeight: 44 }}
                            accessibilityLabel="Edit accommodation"
                          />
                        </View>
                      ))}
                    </View>
                  )}

                  <View className="mt-4 border-t border-border pt-4">
                    <MicroText className="mb-3 leading-5 text-muted-foreground">
                      Review the student's recorded experiences and document supports you decide are appropriate.
                    </MicroText>
                    <PrimaryButton
                      label="Record accommodation"
                      onPress={() => setAddStudentId(student.studentId)}
                      className="w-full"
                    />
                  </View>
                </SectionCard>
              );
            }}
            ListFooterComponent={(
              <View className="pt-4 pb-8">
                <SecondaryButton label="Sign Out" onPress={handleSignOut} className="w-full" />
                {displayUsername ? (
                  <MicroText className="text-center text-muted-foreground mt-3">
                    Signed in as {displayUsername}
                  </MicroText>
                ) : null}
              </View>
            )}
          />
        </View>
      </KeyboardAvoidingView>

      <AddAccommodationModal
        visible={!!addStudentId}
        onClose={() => {
          setAddStudentId(null);
          setEditAcc(null);
        }}
        studentId={addStudentId ?? ''}
        onSaved={loadData}
        accommodation={editAcc}
      />
    </ScreenShell>
  );
}
