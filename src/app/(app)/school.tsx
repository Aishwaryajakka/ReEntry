import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Users } from 'lucide-react-native';

import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { useSession } from '@/ctx';
import { supabase } from '@/client/supabase';
import { useThemeColors } from '@/lib/theme';
import {
  connectStudentByCode,
  fetchSchoolLinkedStudents,
  fetchSchoolAccommodations,
  type SchoolStudent,
  type SchoolAccommodation,
} from '@/db/api';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SchoolWorkspaceScreen() {
  const { session, role } = useSession();
  const themeColors = useThemeColors();

  const schoolStaffId = session?.user?.id;
  const displayUsername = session?.user?.email?.replace('@miaoda.com', '');

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [accommodations, setAccommodations] = useState<SchoolAccommodation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!schoolStaffId) return;
    setRefreshing(true);
    const linkedStudents = await fetchSchoolLinkedStudents(schoolStaffId);
    const accs = await fetchSchoolAccommodations(linkedStudents.map((s) => s.studentId));
    setStudents(linkedStudents);
    setAccommodations(accs);
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
      await loadStudents();
    } else {
      setError('That code is invalid, expired, or already in use. Please double-check and try again.');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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
            data={students}
            keyExtractor={(item) => item.accessId}
            contentInsetAdjustmentBehavior="automatic"
            refreshing={refreshing}
            onRefresh={loadStudents}
            ListHeaderComponent={(
              <View className="pb-4">
              <EditorialLabel className="mb-3">SCHOOL WORKSPACE</EditorialLabel>
              <HeadingText className="mb-1">Students shared with you</HeadingText>
              <MicroText className="text-muted-foreground mb-5">
                Only information relevant to current school support is shown here.
              </MicroText>

              <SectionCard className="mb-5">
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
              </SectionCard>

              {students.length === 0 && !refreshing ? (
                <SectionCard className="items-center py-8">
                  <Text className="text-xl font-semibold text-foreground mb-2">No students connected yet</Text>
                  <MicroText className="text-center leading-5 px-4">
                    When a student shares their access code, their school-relevant information will appear here.
                  </MicroText>
                </SectionCard>
              ) : null}
            </View>
          )}
          renderItem={({ item: student }) => {
            const studentAccs = accommodationsByStudent.get(student.studentId) ?? [];
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

                <View className="bg-muted rounded-xl p-3 mb-3">
                  <MicroText className="text-muted-foreground mb-1">Return-to-Learn status</MicroText>
                  <Text className="text-sm font-medium text-foreground">
                    {student.returnToLearnStatus ?? 'Not recorded'}
                  </Text>
                </View>

                <SubheadingText className="text-sm mb-2">Active accommodations</SubheadingText>
                {studentAccs.length === 0 ? (
                  <MicroText className="text-muted-foreground">No active accommodations to display.</MicroText>
                ) : (
                  <View className="gap-2">
                    {studentAccs.map((acc) => (
                      <View key={acc.id} className="bg-muted rounded-xl p-3">
                        <Text className="text-sm font-medium text-foreground mb-1" numberOfLines={2}>
                          {acc.title}
                        </Text>
                        <MicroText className="text-muted-foreground">
                          Source: {acc.source}
                        </MicroText>
                        {acc.issuedDate ? (
                          <MicroText className="text-muted-foreground">
                            Issued {formatDate(acc.issuedDate)}
                          </MicroText>
                        ) : null}
                        <MicroText className="text-muted-foreground">
                          Updated {formatDate(acc.updatedAt.slice(0, 10))}
                        </MicroText>
                        {acc.validUntil ? (
                          <MicroText className="text-muted-foreground">
                            Valid until {formatDate(acc.validUntil)}
                          </MicroText>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
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
    </ScreenShell>
  );
}
