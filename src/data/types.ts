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

export interface InsightEvidence {
  id: string;
  insightId: string;
  insightText: string;
  supportingActivityLogIds: string[];
  supportingCheckInIds: string[];
  generatedOn: string;
}
