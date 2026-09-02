import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, KeyboardAvoidingView, Pressable, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Activity, ChevronDown, ChevronUp, ClipboardCheck, FileSearch, LayoutDashboard, Stethoscope, UserRound, Users } from 'lucide-react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { AddAccommodationModal } from '@/components/AddAccommodationModal';
import { SchoolObservationsSection } from '@/components/SchoolObservationsSection';
import { AccentButton, PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { useSession } from '@/ctx';
import { supabase } from '@/client/supabase';
import { COLORS, useThemeColors } from '@/lib/theme';
import { useTheme } from '@/context/ThemeContext';
import { ACTIVITY_CATEGORIES, type ActivityCategory, type ActivityLog } from '@/data/types';
import type { SchoolObservation } from '@/data/types';
import { CHALLENGE_TAGS, TOLERANCE_LABELS } from '@/data/activityCatalog';
import {
  analyzePersonalizedPatterns,
  type PatternModelResult,
  type PersonalizedPattern,
} from '@/lib/patternModel';
import {
  connectStudentByCode,
  fetchClinicianLinkedStudents,
  fetchClinicianActivityLogs,
  fetchClinicianChallengeTags,
  fetchClinicianDailyCheckIns,
  fetchClinicianAccommodations,
  getSchoolObservationsForStudent,
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

function ClinicianPatternCard({
  pattern,
  activities,
}: {
  pattern: PersonalizedPattern;
  activities: Map<string, ActivityLog>;
}) {
  const [expanded, setExpanded] = useState(false);
  const evidence = pattern.supportingActivityIds
    .map((id) => activities.get(id))
    .filter((activity): activity is ActivityLog => Boolean(activity));

  return (
    <View className="mb-2 rounded-xl bg-muted p-3">
      <LabelText className="mb-1 leading-5">{pattern.title}</LabelText>
      <MicroText className="mb-1 leading-5 text-muted-foreground">
        {pattern.description}
      </MicroText>
      <MicroText className="mb-3 text-muted-foreground">
        Evidence strength: {pattern.strength} · {pattern.supportCount} supporting records
      </MicroText>
      <SecondaryButton
        label={expanded ? 'Hide details' : 'Why am I seeing this?'}
        onPress={() => setExpanded((value) => !value)}
        className="self-start rounded-full px-3 py-1"
        style={{ minHeight: 44 }}
      />
      {expanded ? (
        <View className="mt-3 border-t border-border pt-3">
          {evidence.map((activity) => {
            const tags = activity.challengeTagIds
              .map((id) => CHALLENGE_TAGS.find((tag) => tag.id === id)?.label)
              .filter((label): label is string => Boolean(label));
            return (
              <View key={activity.id} className="mb-3">
                <Text className="text-sm font-medium text-foreground">
                  {formatDate(activity.date)} · {activity.customLabel || activity.activityCategory}
                </Text>
                <MicroText className="text-muted-foreground">
                  {TOLERANCE_LABELS[activity.toleranceRating]} · {activity.durationMinutes} min
                </MicroText>
                {tags.length > 0 ? (
                  <MicroText className="mt-0.5 text-muted-foreground">
                    Tags: {tags.join(', ')}
                  </MicroText>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function ClinicianWorkspaceScreen() {
  const { session, role } = useSession();
  const themeColors = useThemeColors();
  const { isDark, toggleTheme } = useTheme();

  const clinicianId = session?.user?.id;
  const displayUsername = session?.user?.email?.replace('@miaoda.com', '');
  const clinicianName = session?.user?.user_metadata?.display_name ?? displayUsername ?? 'Clinician';
  const currentDate = new Date().toISOString().slice(0, 10);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ClinicianActivityLog[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<ClinicianDailyCheckIn[]>([]);
  const [challengeTags, setChallengeTags] = useState<ClinicianChallengeTag[]>([]);
  const [accommodations, setAccommodations] = useState<SchoolAccommodation[]>([]);
  const [schoolObservations, setSchoolObservations] = useState<SchoolObservation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addStudentId, setAddStudentId] = useState<string | null>(null);
  const [editAcc, setEditAcc] = useState<SchoolAccommodation | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'accommodations' | 'profile'>('overview');
  const [themeError, setThemeError] = useState<string | null>(null);
  const [studentChooserOpen, setStudentChooserOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!clinicianId) return;
    setRefreshing(true);
    const linkedStudents = await fetchClinicianLinkedStudents(clinicianId);
    const studentIds = linkedStudents.map((s) => s.studentId);
    const [logs, checkins, accs, observationGroups] = await Promise.all([
      fetchClinicianActivityLogs(studentIds),
      fetchClinicianDailyCheckIns(studentIds),
      fetchClinicianAccommodations(studentIds),
      Promise.all(studentIds.map(getSchoolObservationsForStudent)),
    ]);
    const logIds = logs.map((l) => l.id);
    const realTags = await fetchClinicianChallengeTags(logIds);
    setStudents(linkedStudents);
    setSelectedStudentId((current) => linkedStudents.some((student) => student.studentId === current)
      ? current
      : linkedStudents[0]?.studentId ?? null);
    setActivityLogs(logs);
    setChallengeTags(realTags);
    setDailyCheckIns(checkins);
    setAccommodations(accs);
    setSchoolObservations(observationGroups.flat());
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

  const schoolObservationsByStudent = useMemo(() => {
    const map = new Map<string, SchoolObservation[]>();
    for (const observation of schoolObservations) {
      const list = map.get(observation.studentId) ?? [];
      list.push(observation);
      map.set(observation.studentId, list);
    }
    return map;
  }, [schoolObservations]);

  const patternReviewsByStudent = useMemo(() => {
    const reviews = new Map<
      string,
      { result: PatternModelResult; activities: Map<string, ActivityLog> }
    >();

    for (const student of students) {
      const modelActivities = activityLogs
        .filter(
          (log) =>
            log.studentId === student.studentId &&
            log.manageability >= 1 &&
            log.manageability <= 3,
        )
        .map((log): ActivityLog => {
          const knownCategory = ACTIVITY_CATEGORIES.includes(
            log.activityCategory as ActivityCategory,
          )
            ? (log.activityCategory as ActivityCategory)
            : 'Other';
          const tagIds = challengeTags
            .filter((tag) => tag.activityLogId === log.id)
            .map((tag) => CHALLENGE_TAGS.find((known) => known.label === tag.tag)?.id)
            .filter((id): id is string => Boolean(id));

          return {
            id: log.id,
            date: log.date,
            activityCategory: knownCategory,
            customLabel: log.activityName,
            durationMinutes: log.durationMinutes,
            toleranceRating: log.manageability as ActivityLog['toleranceRating'],
            notes: log.note ?? '',
            challengeTagIds: tagIds,
          };
        });

      reviews.set(student.studentId, {
        result: analyzePersonalizedPatterns(modelActivities),
        activities: new Map(modelActivities.map((activity) => [activity.id, activity])),
      });
    }

    return reviews;
  }, [activityLogs, challengeTags, students]);

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
            data={selectedStudents}
            keyExtractor={(item) => item.accessId}
            contentInsetAdjustmentBehavior="automatic"
            refreshing={refreshing}
            onRefresh={loadData}
            ListHeaderComponent={(
              <View className="pb-4">
                <View className="mb-3 flex-row items-center gap-2">
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${themeColors.accent}22` }}>
                    <Stethoscope size={19} color={themeColors.foreground} />
                  </View>
                  <EditorialLabel>CLINICIAN WORKSPACE</EditorialLabel>
                </View>
                <HeadingText className="mb-2">Students shared with you</HeadingText>
                <MicroText className="text-muted-foreground mb-6">
                  Review self-reported recovery records shared with you by students.
                </MicroText>

                {students.length === 0 || showConnect ? <SectionCard className="mb-6">
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
                    className="mb-6 self-start"
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

                {students.length > 0 && selectedStudent ? (
                  <View className="mb-4">
                    <Pressable
                      onPress={() => setStudentChooserOpen((open) => !open)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: studentChooserOpen }}
                      className="min-h-[60px] flex-row items-center gap-3 rounded-xl border p-4 active:opacity-90"
                      style={{ borderColor: themeColors.accent, backgroundColor: `${themeColors.accent}12` }}
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
                          className="min-h-[60px] flex-row items-center gap-3 rounded-xl border p-4 active:opacity-90"
                          style={{ borderColor: selected ? themeColors.accent : themeColors.border, backgroundColor: selected ? `${themeColors.accent}12` : themeColors.card }}
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
                  <View className="flex-row rounded-xl border border-border bg-card p-1">
                    {([
                      ['overview', 'Overview', LayoutDashboard],
                      ['evidence', 'Evidence', FileSearch],
                      ['accommodations', 'Accommodations', ClipboardCheck],
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
                          className="min-h-[60px] flex-1 items-center justify-center rounded-lg px-0.5 py-2 active:opacity-90"
                          style={{ backgroundColor: selected ? COLORS.deepForest : 'transparent' }}
                        >
                          <Icon size={18} color={color} />
                          <Text className="mt-1 text-center text-[10px] font-semibold leading-3" numberOfLines={2} style={{ color }}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
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
              const patternReview = patternReviewsByStudent.get(student.studentId);
              const studentSchoolObservations = schoolObservationsByStudent.get(student.studentId) ?? [];

              return (
                <SectionCard
                  className={activeTab === 'profile' ? 'mb-4 border-0 bg-transparent p-0' : 'mb-4'}
                  style={activeTab === 'profile' ? { shadowColor: 'transparent', elevation: 0 } : undefined}
                >
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
                      <MicroText className="mt-1.5 text-muted-foreground">Student</MicroText>
                    </View>
                  </View> : null}

                  {activeTab === 'overview' ? (
                    <View>
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

                    <View className="rounded-xl border border-border p-3">
                      <MicroText className="text-muted-foreground">Current review</MicroText>
                      <LabelText className="mt-1 leading-5">
                        {recentLogs.length} recent student-reported activities · {studentSchoolObservations.length} school observations · {activeStudentAccs.length} current supports
                      </LabelText>
                    </View>
                    </View>
                  ) : null}

                  {activeTab === 'evidence' ? (
                    <View>
                  <SubheadingText className="text-sm mb-2">Student-reported evidence</SubheadingText>
                  <MicroText className="mb-3 leading-5 text-muted-foreground">
                    Recent self-reported activity records. These observations do not determine medical readiness.
                  </MicroText>
                  {recentLogs.length === 0 ? (
                    <MicroText className="text-muted-foreground mb-3">No activity records yet.</MicroText>
                  ) : (
                    <View className="mb-4 gap-3">
                      {recentLogs.map((log) => (
                        <View key={log.id} className="rounded-xl border border-border bg-card p-4">
                          <View className="flex-row items-start justify-between gap-3">
                            <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                              {log.activityName}
                            </Text>
                            <MicroText className="text-foreground opacity-70">{formatDate(log.date)}</MicroText>
                          </View>
                          <View className="mt-2 flex-row flex-wrap items-center gap-3">
                            <View className="flex-row items-center gap-1">
                              <Activity size={12} color={themeColors.foregroundMuted} />
                              <MicroText className="text-foreground opacity-75">{log.activityCategory}</MicroText>
                            </View>
                            {log.durationMinutes > 0 && (
                              <View className="flex-row items-center gap-1">
                                <MicroText className="text-foreground opacity-75">{log.durationMinutes} min</MicroText>
                              </View>
                            )}
                            <MicroText className="text-foreground opacity-75">
                              {MANAGEABILITY[log.manageability] ?? `Manageability ${log.manageability}`}
                            </MicroText>
                          </View>
                          {challengeTags.some((tag) => tag.activityLogId === log.id) ? (
                            <View className="mt-3 flex-row flex-wrap gap-2">
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

                  <SchoolObservationsSection
                    studentId={student.studentId}
                    observations={studentSchoolObservations}
                    editable={false}
                    title="School observations"
                  />

                  <View className="mb-4 border-t border-border pt-4">
                    <SubheadingText className="mb-2 text-sm">AI-assisted observations</SubheadingText>
                    <MicroText className="mb-3 leading-5 text-muted-foreground">
                      Personalized analysis of this student's recorded activities. These associations support review and do not diagnose, predict recovery, or recommend accommodations.
                    </MicroText>
                    {patternReview?.result.status === 'ready' ? (
                      patternReview.result.patterns.map((pattern) => (
                        <ClinicianPatternCard
                          key={pattern.id}
                          pattern={pattern}
                          activities={patternReview.activities}
                        />
                      ))
                    ) : (
                      <View className="rounded-xl bg-muted p-3">
                        <LabelText className="mb-1">Building the pattern map</LabelText>
                        <MicroText className="leading-5 text-muted-foreground">
                          ReEntry does not display AI-assisted observations until enough useful variation exists in the student's records and the model quality checks are usable.
                        </MicroText>
                      </View>
                    )}
                  </View>

                    </View>
                  ) : null}

                  {activeTab === 'accommodations' ? (
                    <View className="mt-4 border-t border-border pt-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <SubheadingText className="text-sm">Clinician-recorded accommodations</SubheadingText>
                  </View>
                  {activeStudentAccs.length === 0 ? (
                    <MicroText className="text-muted-foreground">No recorded accommodations.</MicroText>
                  ) : (
                    <View className="gap-4">
                      {activeStudentAccs.map((acc) => (
                        <View key={acc.id} className="rounded-xl border border-border bg-card p-4">
                          <View className="flex-row items-start justify-between gap-3">
                            <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
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
                          <View className="mt-3 gap-1.5">
                            <MicroText className="text-foreground opacity-70">Source: {acc.source}</MicroText>
                            {acc.issuedDate ? (
                              <MicroText className="text-foreground opacity-70">Issued {formatDate(acc.issuedDate)}</MicroText>
                            ) : null}
                            <MicroText className="text-foreground opacity-70">Updated {formatDate(acc.updatedAt.slice(0, 10))}</MicroText>
                            {acc.validUntil ? (
                              <MicroText className="text-foreground opacity-70">Valid until {formatDate(acc.validUntil)}</MicroText>
                            ) : null}
                          </View>
                          <View className="mt-3 border-t border-border pt-3">
                          <SecondaryButton
                            label="Edit"
                            onPress={() => {
                              setEditAcc(acc);
                              setAddStudentId(student.studentId);
                            }}
                            className="w-full max-w-[160px] self-center"
                            style={{ minHeight: 44, backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }}
                            accessibilityLabel="Edit accommodation"
                          />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <View className="mt-6 border-t border-border pt-6">
                    <SubheadingText className="mb-2 text-sm">Clinician decision</SubheadingText>
                    <MicroText className="mb-3 leading-5 text-muted-foreground">
                      Review the student's recorded experiences and document supports you decide are appropriate.
                    </MicroText>
                    <AccentButton
                      label="Record accommodation"
                      onPress={() => setAddStudentId(student.studentId)}
                      className="mb-4 w-full"
                    />
                  </View>
                    </View>
                  ) : null}

                  {activeTab === 'profile' ? (
                    <View className="gap-6">
                      <View>
                        <SubheadingText className="mb-3 text-sm">Identity</SubheadingText>
                        <SectionCard>
                        <Text className="font-semibold text-foreground">{clinicianName}</Text>
                        <MicroText className="mt-1.5 text-muted-foreground">Clinician</MicroText>
                        </SectionCard>
                      </View>
                      <View>
                        <SubheadingText className="mb-3 text-sm">Display</SubheadingText>
                        <SectionCard className="flex-row items-center justify-between gap-4">
                          <View className="flex-1">
                            <Text className="font-semibold text-foreground">Dark Mode</Text>
                            <MicroText className="mt-1.5 text-muted-foreground">Use the dark appearance across ReEntry.</MicroText>
                          </View>
                          <Switch
                            value={isDark}
                            onValueChange={handleToggleTheme}
                            trackColor={{ false: themeColors.mossLight, true: themeColors.moss }}
                            thumbColor={COLORS.warmWhite}
                            accessibilityLabel="Dark Mode toggle"
                          />
                        </SectionCard>
                        {themeError ? <Text className="mt-3 text-sm text-destructive">{themeError}</Text> : null}
                      </View>
                      <View>
                        <SubheadingText className="mb-3 text-sm">Account</SubheadingText>
                        <SecondaryButton label="Sign Out" onPress={handleSignOut} className="mb-4 w-full self-center px-5" style={{ minHeight: 44 }} />
                      </View>
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
