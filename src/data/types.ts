// ReEntry shared data types — all self-reported functional tolerance, never clinical scores

export interface DemoUser {
  id: string;
  firstName: string;
  age: number;
}

export const ACTIVITY_CATEGORIES = [
  'Reading',
  'Screens',
  'Class',
  'Homework',
  'Noise/busy environment',
  'Physical activity',
  'Social activity',
  'Transportation',
  'Other',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/**
 * toleranceRating: self-reported functional tolerance
 * 3 = Manageable   2 = Some difficulty   1 = Very difficult
 */
export interface ActivityLog {
  id: string;
  date: string; // ISO YYYY-MM-DD
  activityCategory: ActivityCategory;
  customLabel?: string;
  durationMinutes: number;
  toleranceRating: 1 | 2 | 3;
  notes: string;
  challengeTagIds: string[];
}

export interface ChallengeTag {
  id: string;
  label: string;
  category?: 'environmental' | 'cognitive' | 'social' | 'physical';
}

export interface StudentScheduleItem {
  id: string;
  activityName: string;
  activityCategory: ActivityCategory;
  /** ISO weekday numbers: Monday=1 through Sunday=7. */
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  remindersEnabled: boolean;
  active: boolean;
}

/**
 * overallFeeling: 1=Very difficult day … 5=Manageable day
 * Optional fields are retained for demo-seed material but are unavailable in
 * the current Supabase daily_checkins table.
 */
export interface DailyCheckIn {
  id: string;
  date: string;
  overallFeeling: 1 | 2 | 3 | 4 | 5;
  energyLevel?: 1 | 2 | 3 | 4 | 5;
  headachePresent?: boolean;
  headacheIntensity?: 1 | 2 | 3 | 4 | 5 | null;
  activeChallengeTagIds?: string[];
  freeNote: string;
}

export interface AccommodationRecord {
  id: string;
  dateIssued: string | null;
  accommodationType: string;
  issuedBy: string; // role label only
  activeUntil: string | null;
  visibleToSchool: boolean;
  status?: 'active' | 'inactive';
  sourceName?: string;
}

export const SCHOOL_OBSERVATION_TYPES = [
  'completed_as_planned',
  'completed_with_support',
  'took_break',
  'reduced_or_stopped',
] as const;

export type SchoolObservationType = (typeof SCHOOL_OBSERVATION_TYPES)[number];

export const SCHOOL_SUPPORT_TYPES = [
  'quiet_environment',
  'extra_time',
  'reduced_screen_exposure',
  'printed_materials',
  'short_break',
  'reduced_workload',
  'alternate_workspace',
] as const;

export type SchoolSupportType = (typeof SCHOOL_SUPPORT_TYPES)[number];

export const SCHOOL_OBSERVATION_LABELS: Record<SchoolObservationType, string> = {
  completed_as_planned: 'Completed as planned',
  completed_with_support: 'Completed with support',
  took_break: 'Took a break',
  reduced_or_stopped: 'Reduced or stopped',
};

export const SCHOOL_SUPPORT_LABELS: Record<SchoolSupportType, string> = {
  quiet_environment: 'Quiet environment',
  extra_time: 'Extra time',
  reduced_screen_exposure: 'Reduced screen exposure',
  printed_materials: 'Printed materials',
  short_break: 'Short break',
  reduced_workload: 'Reduced workload',
  alternate_workspace: 'Alternate workspace',
};

export interface SchoolObservation {
  id: string;
  studentId: string;
  createdBy: string;
  occurredAt: string;
  context: string;
  observationType: SchoolObservationType;
  supportUsed: SchoolSupportType[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsightEvidence {
  id: string;
  insightId: string;
  insightText: string;
  supportingActivityLogIds: string[];
  supportingCheckInIds: string[];
  generatedOn: string;
}
