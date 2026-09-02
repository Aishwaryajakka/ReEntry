/**
 * ReEntry database API — thin Supabase client wrapper.
 * All external database reads/writes go through here.
 */

import { supabase } from '@/client/supabase';
import { CHALLENGE_TAGS } from '@/data/activityCatalog';
import type {
  AccommodationRecordRow,
  ActivityLogRow,
  Appearance,
  ChallengeTagRow,
  DailyCheckInRow,
  StudentAccessRow,
  SchoolObservationRow,
  SharedSupportContactRow,
  StudentScheduleItemRow,
  TrustedContactRow,
  UserPreferencesRow,
} from '@/types/types';
import type {
  SchoolObservation,
  SchoolObservationType,
  SchoolSupportType,
  SharedSupportContact,
  TrustedContact,
} from '@/data/types';

export type { Appearance };

export const DEFAULT_APPEARANCE: Appearance = 'light';

const SHARED_SUPPORT_CONTACT_COLUMNS = 'user_id, role, display_name, support_phone, support_email, created_at, updated_at';

export async function fetchSharedSupportContactsForStudent(linkedViewerIds: string[]): Promise<SharedSupportContact[]> {
  const uniqueViewerIds = [...new Set(linkedViewerIds)];
  if (uniqueViewerIds.length === 0) return [];

  const { data, error } = await supabase
    .from('shared_support_contacts')
    .select(SHARED_SUPPORT_CONTACT_COLUMNS)
    .in('user_id', uniqueViewerIds)
    .order('display_name');
  if (error) {
    console.error('fetchSharedSupportContactsForStudent failed', error);
    return [];
  }
  return ((data ?? []) as SharedSupportContactRow[]).map((row) => ({
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    phone: row.support_phone,
    email: row.support_email,
  }));
}

const TRUSTED_CONTACT_COLUMNS = 'student_id, name, relationship, phone_number, created_at, updated_at';

function normalizeTrustedContact(row: TrustedContactRow): TrustedContact {
  return {
    studentId: row.student_id,
    name: row.name,
    relationship: row.relationship,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTrustedContact(studentId: string): Promise<TrustedContact | null> {
  const { data, error } = await supabase
    .from('student_trusted_contacts')
    .select(TRUSTED_CONTACT_COLUMNS)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) {
    console.error('fetchTrustedContact failed', error);
    return null;
  }
  return data ? normalizeTrustedContact(data as TrustedContactRow) : null;
}

export async function saveTrustedContact(studentId: string, input: { name: string; relationship: string; phoneNumber: string }): Promise<TrustedContact> {
  const { data, error } = await supabase
    .from('student_trusted_contacts')
    .upsert({
      student_id: studentId,
      name: input.name.trim(),
      relationship: input.relationship.trim(),
      phone_number: input.phoneNumber.trim(),
    }, { onConflict: 'student_id' })
    .select(TRUSTED_CONTACT_COLUMNS)
    .single();
  if (error || !data) throw error ?? new Error('Trusted contact was not saved.');
  return normalizeTrustedContact(data as TrustedContactRow);
}

export async function deleteTrustedContact(studentId: string): Promise<void> {
  const { error } = await supabase
    .from('student_trusted_contacts')
    .delete()
    .eq('student_id', studentId);
  if (error) throw error;
}

export interface ScheduleItemInput {
  activityName: string;
  activityCategory: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  remindersEnabled: boolean;
  active: boolean;
}

const SCHEDULE_COLUMNS = 'id, student_id, activity_name, activity_category, days_of_week, start_time, end_time, reminders_enabled, active, created_at, updated_at';

export async function fetchStudentScheduleItems(userId: string): Promise<StudentScheduleItemRow[]> {
  const { data, error } = await supabase
    .from('student_schedule_items')
    .select(SCHEDULE_COLUMNS)
    .eq('student_id', userId)
    .order('start_time');
  if (error) {
    console.error('fetchStudentScheduleItems failed', error);
    return [];
  }
  return data ?? [];
}

export async function insertStudentScheduleItem(userId: string, input: ScheduleItemInput): Promise<StudentScheduleItemRow> {
  const { data, error } = await supabase
    .from('student_schedule_items')
    .insert({
      student_id: userId,
      activity_name: input.activityName.trim(),
      activity_category: input.activityCategory,
      days_of_week: input.daysOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      reminders_enabled: input.remindersEnabled,
      active: input.active,
    })
    .select(SCHEDULE_COLUMNS)
    .single();
  if (error || !data) throw error ?? new Error('Schedule item was not created.');
  return data;
}

export async function updateStudentScheduleItem(userId: string, itemId: string, input: ScheduleItemInput): Promise<StudentScheduleItemRow> {
  const { data, error } = await supabase
    .from('student_schedule_items')
    .update({
      activity_name: input.activityName.trim(),
      activity_category: input.activityCategory,
      days_of_week: input.daysOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      reminders_enabled: input.remindersEnabled,
      active: input.active,
    })
    .eq('id', itemId)
    .eq('student_id', userId)
    .select(SCHEDULE_COLUMNS)
    .single();
  if (error || !data) throw error ?? new Error('Schedule item was not updated.');
  return data;
}

export async function deleteStudentScheduleItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('student_schedule_items')
    .delete()
    .eq('id', itemId)
    .eq('student_id', userId);
  if (error) throw error;
}

export async function fetchUserPreferences(
  userId: string,
): Promise<UserPreferencesRow | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('id, user_id, appearance, low_stimulation_enabled, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('fetchUserPreferences failed', error);
    return null;
  }

  return data;
}

export async function ensureUserPreferences(
  userId: string,
): Promise<UserPreferencesRow> {
  const existing = await fetchUserPreferences(userId);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .insert({
      user_id: userId,
      appearance: DEFAULT_APPEARANCE,
      low_stimulation_enabled: false,
    })
    .select('id, user_id, appearance, low_stimulation_enabled, updated_at')
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to create user preferences: ${error?.message ?? 'unknown'}`,
    );
  }

  return data;
}

export async function updateAppearance(
  userId: string,
  appearance: Appearance,
): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        appearance,
      },
      {
        onConflict: 'user_id',
      },
    );

  if (error) {
    console.error('updateAppearance failed', error);
    throw error;
  }
}

export async function updateLowStimulation(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        low_stimulation_enabled: enabled,
      },
      {
        onConflict: 'user_id',
      },
    );

  if (error) {
    console.error('updateLowStimulation failed', error);
    throw error;
  }
}

export async function fetchActivityLogs(
  userId: string,
): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      'id, student_id, activity_category, activity_name, duration_minutes, manageability, note, occurred_at, created_at',
    )
    .eq('student_id', userId)
    .order('occurred_at', {
      ascending: false,
    });

  if (error) {
    console.error('fetchActivityLogs failed', error);
    return [];
  }

  return data ?? [];
}

export async function fetchChallengeTags(
  userId: string,
): Promise<ChallengeTagRow[]> {
  const { data, error } = await supabase
    .from('challenge_tags')
    .select('id, activity_log_id, tag, activity_logs!inner(student_id)')
    .eq('activity_logs.student_id', userId);

  if (error) {
    console.error('fetchChallengeTags failed', error);
    return [];
  }

  return data ?? [];
}

export interface NewActivityInput {
  date: string;
  activityCategory: string;
  customLabel?: string;
  durationMinutes: number;
  toleranceRating: 1 | 2 | 3;
  notes: string;
  challengeTagIds: string[];
}

export async function updateActivityLog(
  userId: string,
  logId: string,
  input: NewActivityInput,
): Promise<{
  row: ActivityLogRow;
  tags: ChallengeTagRow[];
} | null> {
  const activityName =
    input.customLabel?.trim() || input.activityCategory;

  const occurredAt = input.date
    ? new Date(`${input.date}T00:00:00`).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase
    .from('activity_logs')
    .update({
      activity_category: input.activityCategory,
      activity_name: activityName,
      duration_minutes: input.durationMinutes,
      manageability: input.toleranceRating,
      note: input.notes.trim() || null,
      occurred_at: occurredAt,
    })
    .eq('id', logId)
    .eq('student_id', userId)
    .select(
      'id, student_id, activity_category, activity_name, duration_minutes, manageability, note, occurred_at, created_at',
    )
    .single();

  if (error || !data) {
    console.error('updateActivityLog failed', error);
    return null;
  }

  const { error: deleteError } = await supabase
    .from('challenge_tags')
    .delete()
    .eq('activity_log_id', logId);

  if (deleteError) {
    console.error('deleteChallengeTags failed', deleteError);
  }

  if (input.challengeTagIds.length > 0) {
    const tagLabels = input.challengeTagIds.map((id) => {
      const known = CHALLENGE_TAGS.find((tag) => tag.id === id);
      return known ? known.label : id;
    });

    const tagRows = tagLabels.map((tag) => ({
      activity_log_id: logId,
      tag,
    }));

    const { error: tagError } = await supabase
      .from('challenge_tags')
      .insert(tagRows);

    if (tagError) {
      console.error('updateActivityLog tags insert failed', tagError);
    }
  }

  const { data: tags } = await supabase
    .from('challenge_tags')
    .select('id, activity_log_id, tag')
    .eq('activity_log_id', logId);

  return {
    row: data,
    tags: tags ?? [],
  };
}

export async function deleteActivityLog(
  userId: string,
  logId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .eq('id', logId)
    .eq('student_id', userId);

  if (error) {
    console.error('deleteActivityLog failed', error);
    return false;
  }

  return true;
}

export async function fetchDailyCheckIns(
  userId: string,
): Promise<DailyCheckInRow[]> {
  const { data, error } = await supabase
    .from('daily_checkins')
    .select(
      'id, student_id, checkin_date, overall_manageability, attendance_context, note, created_at',
    )
    .eq('student_id', userId)
    .order('checkin_date', {
      ascending: false,
    });

  if (error) {
    console.error('fetchDailyCheckIns failed', error);
    return [];
  }

  return data ?? [];
}

export async function fetchAccommodationRecords(
  userId: string,
): Promise<AccommodationRecordRow[]> {
  const { data, error } = await supabase
    .from('accommodation_records')
    .select(
      'id, student_id, title, source_type, source_name, issued_date, valid_until, status, created_by, updated_at',
    )
    .eq('student_id', userId)
    .order('valid_until', {
      ascending: false,
    });

  if (error) {
    console.error('fetchAccommodationRecords failed', error);
    return [];
  }

  return data ?? [];
}

export async function addActivityLog(
  userId: string,
  input: NewActivityInput,
): Promise<{
  row: ActivityLogRow;
  tags: ChallengeTagRow[];
} | null> {
  const activityName =
    input.customLabel?.trim() || input.activityCategory;

  const occurredAt = input.date
    ? new Date(`${input.date}T00:00:00`).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      student_id: userId,
      activity_category: input.activityCategory,
      activity_name: activityName,
      duration_minutes: input.durationMinutes,
      manageability: input.toleranceRating,
      note: input.notes.trim() || null,
      occurred_at: occurredAt,
    })
    .select(
      'id, student_id, activity_category, activity_name, duration_minutes, manageability, note, occurred_at, created_at',
    )
    .single();

  if (error || !data) {
    console.error('addActivityLog failed', error);
    throw new Error('Your activity could not be saved. Please try again.');
  }

  if (input.challengeTagIds.length > 0) {
    const tagLabels = input.challengeTagIds.map((id) => {
      const known = CHALLENGE_TAGS.find((tag) => tag.id === id);
      return known ? known.label : id;
    });

    const tagRows = tagLabels.map((tag) => ({
      activity_log_id: data.id,
      tag,
    }));

    const { error: tagError } = await supabase
      .from('challenge_tags')
      .insert(tagRows);

    if (tagError) {
      console.error('addActivityLog tags failed', tagError);
    }
  }

  const { data: tags } = await supabase
    .from('challenge_tags')
    .select('id, activity_log_id, tag')
    .eq('activity_log_id', data.id);

  return {
    row: data,
    tags: tags ?? [],
  };
}

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  let code = '';

  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(
      Math.floor(Math.random() * chars.length),
    );
  }

  return code;
}

async function generateUniqueAccessCode(): Promise<string | null> {
  let attempts = 0;

  while (attempts < 10) {
    const code = generateAccessCode();

    const { data } = await supabase
      .from('student_access')
      .select('id')
      .eq('access_code', code)
      .maybeSingle();

    if (!data) {
      return code;
    }

    attempts += 1;
  }

  return null;
}

export async function getOrCreateStudentAccessCode(
  userId: string,
): Promise<StudentAccessRow | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('student_access')
    .select(
      'id, student_id, viewer_user_id, viewer_role, status, access_code, created_at',
    )
    .eq('student_id', userId)
    .eq('status', 'active')
    .is('viewer_user_id', null)
    .maybeSingle();

  if (fetchError) {
    console.error(
      'getOrCreateStudentAccessCode fetch failed',
      fetchError,
    );
    return null;
  }

  if (existing) {
    return existing;
  }

  const code = await generateUniqueAccessCode();

  if (!code) {
    console.error(
      'generateUniqueAccessCode failed after retries',
    );
    return null;
  }

  const { data, error } = await supabase
    .from('student_access')
    .insert({
      student_id: userId,
      viewer_role: 'pending',
      status: 'active',
      access_code: code,
    })
    .select(
      'id, student_id, viewer_user_id, viewer_role, status, access_code, created_at',
    )
    .single();

  if (error || !data) {
    console.error(
      'getOrCreateStudentAccessCode insert failed',
      error,
    );
    return null;
  }

  return data;
}

export async function regenerateStudentAccessCode(
  userId: string,
): Promise<StudentAccessRow | null> {
  const { data: existing } = await supabase
    .from('student_access')
    .select(
      'id, student_id, viewer_user_id, viewer_role, status, access_code, created_at',
    )
    .eq('student_id', userId)
    .eq('status', 'active')
    .is('viewer_user_id', null)
    .maybeSingle();

  const code = await generateUniqueAccessCode();

  if (!code) {
    console.error(
      'generateUniqueAccessCode failed after retries',
    );
    return null;
  }

  if (existing) {
    const { data, error } = await supabase
      .from('student_access')
      .update({
        access_code: code,
      })
      .eq('id', existing.id)
      .eq('student_id', userId)
      .select(
        'id, student_id, viewer_user_id, viewer_role, status, access_code, created_at',
      )
      .single();

    if (error || !data) {
      console.error(
        'regenerateStudentAccessCode update failed',
        error,
      );
      return null;
    }

    return data;
  }

  return getOrCreateStudentAccessCode(userId);
}

export async function fetchStudentAccessLinks(
  userId: string,
): Promise<StudentAccessRow[]> {
  const { data, error } = await supabase
    .from('student_access')
    .select(
      'id, student_id, viewer_user_id, viewer_role, status, access_code, created_at',
    )
    .eq('student_id', userId)
    .not('viewer_user_id', 'is', null)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    console.error('fetchStudentAccessLinks failed', error);
    return [];
  }

  return data ?? [];
}

export async function revokeStudentAccess(
  userId: string,
  accessId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('student_access')
    .update({
      status: 'revoked',
    })
    .eq('id', accessId)
    .eq('student_id', userId);

  if (error) {
    console.error('revokeStudentAccess failed', error);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// School Staff / Clinician Workspace
// ---------------------------------------------------------------------------

const SCHOOL_OBSERVATION_COLUMNS = 'id, student_id, created_by, occurred_at, context, observation_type, support_used, note, created_at, updated_at';

function normalizeSchoolObservation(row: SchoolObservationRow): SchoolObservation {
  return {
    id: row.id,
    studentId: row.student_id,
    createdBy: row.created_by,
    occurredAt: row.occurred_at,
    context: row.context,
    observationType: row.observation_type as SchoolObservationType,
    supportUsed: row.support_used as SchoolSupportType[],
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SchoolObservationInput {
  studentId: string;
  createdBy: string;
  context: string;
  observationType: SchoolObservationType;
  supportUsed: SchoolSupportType[];
  note?: string | null;
}

export async function getSchoolObservationsForStudent(studentId: string): Promise<SchoolObservation[]> {
  const { data, error } = await supabase
    .from('school_observations')
    .select(SCHOOL_OBSERVATION_COLUMNS)
    .eq('student_id', studentId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('getSchoolObservationsForStudent failed', error);
    return [];
  }

  return ((data ?? []) as SchoolObservationRow[]).map(normalizeSchoolObservation);
}

export async function insertSchoolObservation(input: SchoolObservationInput): Promise<SchoolObservation> {
  const { data, error } = await supabase
    .from('school_observations')
    .insert({
      student_id: input.studentId,
      created_by: input.createdBy,
      context: input.context.trim(),
      observation_type: input.observationType,
      support_used: input.supportUsed,
      note: input.note?.trim() || null,
    })
    .select(SCHOOL_OBSERVATION_COLUMNS)
    .single();

  if (error || !data) throw error ?? new Error('School observation was not recorded.');
  return normalizeSchoolObservation(data as SchoolObservationRow);
}

export async function updateSchoolObservation(
  observationId: string,
  input: Omit<SchoolObservationInput, 'studentId' | 'createdBy'>,
): Promise<SchoolObservation> {
  const { data, error } = await supabase
    .from('school_observations')
    .update({
      context: input.context.trim(),
      observation_type: input.observationType,
      support_used: input.supportUsed,
      note: input.note?.trim() || null,
    })
    .eq('id', observationId)
    .select(SCHOOL_OBSERVATION_COLUMNS)
    .single();

  if (error || !data) throw error ?? new Error('School observation was not updated.');
  return normalizeSchoolObservation(data as SchoolObservationRow);
}

export async function deleteSchoolObservation(observationId: string): Promise<void> {
  const { error } = await supabase
    .from('school_observations')
    .delete()
    .eq('id', observationId);
  if (error) throw error;
}

export interface SchoolStudent {
  accessId: string;
  studentId: string;
  displayName: string | null;
  returnToLearnStatus: string | null;
}

export interface SchoolAccommodation {
  id: string;
  studentId: string;
  title: string;
  source: string;
  issuedDate: string | null;
  updatedAt: string;
  validUntil: string | null;
  active: boolean;
}

export async function connectStudentByCode(
  accessCode: string,
  viewerRole: 'school_staff' | 'clinician' = 'school_staff',
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc(
      'connect_student_by_code',
      {
        access_code: accessCode.trim().toUpperCase(),
        requested_role: viewerRole,
      },
    );

    if (error) {
      console.error('connectStudentByCode failed', error);
      return null;
    }

    return data as string | null;
  } catch (error) {
    console.error('connectStudentByCode exception', error);
    return null;
  }
}

export async function fetchLinkedStudents(
  viewerId: string,
  viewerRole: 'school_staff' | 'clinician',
): Promise<SchoolStudent[]> {
  /*
   * Do not try to embed student_profiles inside student_access here.
   *
   * student_profiles is a view, so PostgREST does not have the foreign-key
   * relationship metadata required for:
   *
   * student_profiles(id, display_name, ...)
   *
   * Instead:
   * 1. Fetch the allowed student_access rows.
   * 2. Collect their student IDs.
   * 3. Query student_profiles separately.
   * 4. Merge the results client-side.
   */

  const { data: accessRows, error: accessError } = await supabase
    .from('student_access')
    .select('id, student_id, created_at')
    .eq('viewer_user_id', viewerId)
    .eq('viewer_role', viewerRole)
    .eq('status', 'active')
    .order('created_at', {
      ascending: false,
    });

  if (accessError) {
    console.error(
      'fetchLinkedStudents access failed',
      accessError,
    );
    return [];
  }

  if (!accessRows || accessRows.length === 0) {
    return [];
  }

  const studentIds = [
    ...new Set(
      accessRows
        .map((row) => row.student_id)
        .filter((studentId): studentId is string => Boolean(studentId)),
    ),
  ];

  if (studentIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('student_profiles')
    .select(
      'id, display_name, return_to_learn_status',
    )
    .in('id', studentIds);

  if (profilesError) {
    console.error(
      'fetchLinkedStudents profiles failed',
      profilesError,
    );
    return [];
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  return accessRows.map((row) => {
    const profile = profilesById.get(row.student_id);

    return {
      accessId: row.id,
      studentId: row.student_id,
      displayName: profile?.display_name ?? null,
      returnToLearnStatus:
        profile?.return_to_learn_status ?? null,
    };
  });
}

export async function fetchSchoolLinkedStudents(
  schoolStaffId: string,
): Promise<SchoolStudent[]> {
  return fetchLinkedStudents(
    schoolStaffId,
    'school_staff',
  );
}

export async function fetchSchoolAccommodations(
  studentIds: string[],
): Promise<SchoolAccommodation[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('accommodation_records')
    .select(
      'id, student_id, title, source_name, source_type, issued_date, updated_at, valid_until, status',
    )
    .in('student_id', studentIds)
    .eq('status', 'active')
    .order('updated_at', {
      ascending: false,
    });

  if (error) {
    console.error(
      'fetchSchoolAccommodations failed',
      error,
    );
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    source: row.source_name ?? row.source_type,
    issuedDate: row.issued_date,
    updatedAt: row.updated_at,
    validUntil: row.valid_until,
    active: row.status === 'active',
  }));
}

export interface ClinicianActivityLog {
  id: string;
  studentId: string;
  date: string;
  activityCategory: string;
  activityName: string;
  durationMinutes: number;
  manageability: number;
  note: string | null;
}

export interface ClinicianDailyCheckIn {
  id: string;
  studentId: string;
  date: string;
  overallManageability: number;
  attendanceContext: string | null;
  note: string | null;
}

export interface ClinicianChallengeTag {
  id: string;
  activityLogId: string;
  tag: string;
}

export async function fetchClinicianLinkedStudents(
  clinicianId: string,
): Promise<SchoolStudent[]> {
  return fetchLinkedStudents(
    clinicianId,
    'clinician',
  );
}

export async function fetchClinicianActivityLogs(
  studentIds: string[],
): Promise<ClinicianActivityLog[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      'id, student_id, occurred_at, activity_category, activity_name, duration_minutes, manageability, note',
    )
    .in('student_id', studentIds)
    .order('occurred_at', {
      ascending: false,
    });

  if (error) {
    console.error(
      'fetchClinicianActivityLogs failed',
      error,
    );
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    date: row.occurred_at.slice(0, 10),
    activityCategory: row.activity_category,
    activityName: row.activity_name,
    durationMinutes: row.duration_minutes,
    manageability: row.manageability,
    note: row.note,
  }));
}

export async function fetchClinicianChallengeTags(
  logIds: string[],
): Promise<ClinicianChallengeTag[]> {
  if (logIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('challenge_tags')
    .select('id, activity_log_id, tag')
    .in('activity_log_id', logIds);

  if (error) {
    console.error(
      'fetchClinicianChallengeTags failed',
      error,
    );
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    activityLogId: row.activity_log_id,
    tag: row.tag,
  }));
}

export async function fetchClinicianDailyCheckIns(
  studentIds: string[],
): Promise<ClinicianDailyCheckIn[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('daily_checkins')
    .select(
      'id, student_id, checkin_date, overall_manageability, attendance_context, note',
    )
    .in('student_id', studentIds)
    .order('checkin_date', {
      ascending: false,
    });

  if (error) {
    console.error(
      'fetchClinicianDailyCheckIns failed',
      error,
    );
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    date: row.checkin_date,
    overallManageability:
      row.overall_manageability,
    attendanceContext:
      row.attendance_context,
    note: row.note,
  }));
}

export async function fetchClinicianAccommodations(
  studentIds: string[],
): Promise<SchoolAccommodation[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('accommodation_records')
    .select(
      'id, student_id, title, source_name, source_type, issued_date, updated_at, valid_until, status',
    )
    .in('student_id', studentIds)
    .order('updated_at', {
      ascending: false,
    });

  if (error) {
    console.error(
      'fetchClinicianAccommodations failed',
      error,
    );
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    source: row.source_name ?? row.source_type,
    issuedDate: row.issued_date,
    updatedAt: row.updated_at,
    validUntil: row.valid_until,
    active: row.status === 'active',
  }));
}

export interface InsertAccommodationInput {
  studentId: string;
  title: string;
  sourceName: string | null;
  issuedDate?: string | null;
  validUntil?: string | null;
  status: 'active' | 'inactive';
}

export async function insertAccommodation(
  input: InsertAccommodationInput,
): Promise<SchoolAccommodation | null> {
  const { data, error } = await supabase
    .from('accommodation_records')
    .insert({
      student_id: input.studentId,
      title: input.title,
      source_name: input.sourceName,
      source_type: 'clinician',
      issued_date: input.issuedDate ?? null,
      valid_until: input.validUntil ?? null,
      status: input.status,
    })
    .select(
      'id, student_id, title, source_name, source_type, issued_date, updated_at, valid_until, status',
    )
    .single();

  if (error || !data) {
    console.error(
      'insertAccommodation failed',
      error,
    );
    return null;
  }

  return {
    id: data.id,
    studentId: data.student_id,
    title: data.title,
    source: data.source_name ?? data.source_type,
    issuedDate: data.issued_date,
    updatedAt: data.updated_at,
    validUntil: data.valid_until,
    active: data.status === 'active',
  };
}

export async function updateAccommodation(
  accommodationId: string,
  updates: Partial<InsertAccommodationInput>,
): Promise<SchoolAccommodation | null> {
  const { data, error } = await supabase
    .from('accommodation_records')
    .update({
      title: updates.title,
      source_name: updates.sourceName,
      issued_date: updates.issuedDate ?? null,
      valid_until: updates.validUntil ?? null,
      status: updates.status,
    })
    .eq('id', accommodationId)
    .select(
      'id, student_id, title, source_name, source_type, issued_date, updated_at, valid_until, status',
    )
    .single();

  if (error || !data) {
    console.error(
      'updateAccommodation failed',
      error,
    );
    return null;
  }

  return {
    id: data.id,
    studentId: data.student_id,
    title: data.title,
    source: data.source_name ?? data.source_type,
    issuedDate: data.issued_date,
    updatedAt: data.updated_at,
    validUntil: data.valid_until,
    active: data.status === 'active',
  };
}
