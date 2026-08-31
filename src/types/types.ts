/**
 * ReEntry database row types — match the Supabase SQL schema.
 * App-facing consumer types live in src/data/types.ts.
 */

export type Appearance = 'light' | 'dark';

export interface UserPreferencesRow {
  id: string;
  user_id: string;
  appearance: Appearance;
  low_stimulation_enabled: boolean;
  updated_at: string;
}

export interface ActivityLogRow {
  id: string;
  student_id: string;
  activity_category: string;
  activity_name: string;
  duration_minutes: number;
  manageability: number;
  note: string | null;
  occurred_at: string;
  created_at: string;
}

export interface ChallengeTagRow {
  id: string;
  activity_log_id: string;
  tag: string;
}

export interface DailyCheckInRow {
  id: string;
  student_id: string;
  checkin_date: string;
  overall_manageability: number;
  attendance_context: string | null;
  note: string | null;
  created_at: string;
}

export interface AccommodationRecordRow {
  id: string;
  student_id: string;
  title: string;
  source_type: string;
  source_name: string | null;
  issued_date: string | null;
  valid_until: string | null;
  status: string;
  created_by: string;
  updated_at: string;
}

export interface StudentAccessRow {
  id: string;
  student_id: string;
  viewer_user_id: string | null;
  viewer_role: string;
  status: string;
  access_code: string | null;
  created_at: string;
}

export interface StudentScheduleItemRow {
  id: string;
  student_id: string;
  activity_name: string;
  activity_category: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  reminders_enabled: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolObservationRow {
  id: string;
  student_id: string;
  created_by: string;
  occurred_at: string;
  context: string;
  observation_type: string;
  support_used: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustedContactRow {
  student_id: string;
  name: string;
  relationship: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

export interface SharedSupportContactRow {
  user_id: string;
  role: 'school_staff' | 'clinician';
  display_name: string;
  support_phone: string | null;
  support_email: string | null;
  created_at: string;
  updated_at: string;
}
