/**
 * Maya 14-day demo fixture retained for a future deterministic Supabase seed.
 *
 * All values are self-reported functional observations, not clinical scores.
 * This module is demo-only and is not loaded into authenticated runtime state.
 */

import type {
  AccommodationRecord,
  ActivityLog,
  DailyCheckIn,
  DemoUser,
  InsightEvidence,
} from './types';
export { CHALLENGE_TAGS, TOLERANCE_LABELS } from './activityCatalog';

// Demo date anchor: day 1 = 14 days before today
const anchor = new Date();
anchor.setHours(0, 0, 0, 0);
const d = (offsetFromDay1: number): string => {
  const date = new Date(anchor);
  date.setDate(date.getDate() - 13 + offsetFromDay1); // day 1 = 13 days ago
  return date.toISOString().split('T')[0];
};

/** Today's date string */
export const TODAY = d(14);

// ─────────────────────────────────────────────────────────────
// Demo user
// ─────────────────────────────────────────────────────────────
export const DEMO_USER: DemoUser = {
  id: 'user-maya',
  firstName: 'Maya',
  age: 16,
};

// ─────────────────────────────────────────────────────────────
// Daily check-ins  (14 days, non-linear recovery)
// ─────────────────────────────────────────────────────────────
export const DAILY_CHECKINS: DailyCheckIn[] = [
  // Day 1 — very rough start
  {
    id: 'ci-01', date: d(1),
    overallFeeling: 1, energyLevel: 1,
    headachePresent: true, headacheIntensity: 5,
    activeChallengeTagIds: ['ct-headache', 'ct-light', 'ct-noise', 'ct-fatigue', 'ct-dizziness'],
    freeNote: 'Could not get out of bed until noon. Room had to be dark.',
  },
  // Day 2
  {
    id: 'ci-02', date: d(2),
    overallFeeling: 1, energyLevel: 1,
    headachePresent: true, headacheIntensity: 4,
    activeChallengeTagIds: ['ct-headache', 'ct-light', 'ct-noise', 'ct-fatigue'],
    freeNote: 'Still very hard. Tried reading for 5 minutes — gave up.',
  },
  // Day 3
  {
    id: 'ci-03', date: d(3),
    overallFeeling: 2, energyLevel: 2,
    headachePresent: true, headacheIntensity: 3,
    activeChallengeTagIds: ['ct-headache', 'ct-screen', 'ct-conc', 'ct-fatigue'],
    freeNote: 'Managed a short walk. Phone still feels too bright.',
  },
  // Day 4
  {
    id: 'ci-04', date: d(4),
    overallFeeling: 2, energyLevel: 2,
    headachePresent: true, headacheIntensity: 3,
    activeChallengeTagIds: ['ct-headache', 'ct-noise', 'ct-conc'],
    freeNote: 'Noise from next room was too much. Reading still difficult.',
  },
  // Day 5 — slight lift
  {
    id: 'ci-05', date: d(5),
    overallFeeling: 3, energyLevel: 3,
    headachePresent: false, headacheIntensity: null,
    activeChallengeTagIds: ['ct-screen', 'ct-conc', 'ct-fatigue'],
    freeNote: 'First headache-free day. Reading easier for about 15 min.',
  },
  // Day 6
  {
    id: 'ci-06', date: d(6),
    overallFeeling: 3, energyLevel: 3,
    headachePresent: false, headacheIntensity: null,
    activeChallengeTagIds: ['ct-noise', 'ct-conc', 'ct-screen'],
    freeNote: 'Managed half a school day. Crowded hallway was overwhelming.',
  },
  // Day 7 — improving
  {
    id: 'ci-07', date: d(7),
    overallFeeling: 3, energyLevel: 3,
    headachePresent: false, headacheIntensity: null,
    activeChallengeTagIds: ['ct-conc', 'ct-noise'],
    freeNote: 'Full morning at school. Cafeteria still too loud.',
  },
  // Day 8 — better
  {
    id: 'ci-08', date: d(8),
    overallFeeling: 4, energyLevel: 4,
    headachePresent: false, headacheIntensity: null,
    activeChallengeTagIds: ['ct-noise', 'ct-screen'],
    freeNote: 'Reading felt mostly okay today. Screens still variable.',
  },
  // Day 9 — REGRESSION
  {
    id: 'ci-09', date: d(9),
    overallFeeling: 2, energyLevel: 2,
    headachePresent: true, headacheIntensity: 3,
    activeChallengeTagIds: ['ct-headache', 'ct-fatigue', 'ct-conc', 'ct-noise', 'ct-emotional'],
    freeNote: 'Overdid it yesterday. Back to rest. Headache returned.',
  },
  // Day 10 — recovering from regression
  {
    id: 'ci-10', date: d(10),
    overallFeeling: 3, energyLevel: 2,
    headachePresent: true, headacheIntensity: 2,
    activeChallengeTagIds: ['ct-headache', 'ct-fatigue', 'ct-noise'],
    freeNote: 'Taking it slow. Short reading session was okay.',
  },
  // Day 11 — back on track
  {
    id: 'ci-11', date: d(11),
    overallFeeling: 4, energyLevel: 3,
    headachePresent: false, headacheIntensity: null,
    activeChallengeTagIds: ['ct-noise', 'ct-screen'],
    freeNote: 'Two classes. Managed well. Noise still a factor.',
  },
  // Day 12 — second regression (mild)
  {
    id: 'ci-12', date: d(12),
    overallFeeling: 2, energyLevel: 2,
    headachePresent: true, headacheIntensity: 2,
    activeChallengeTagIds: ['ct-headache', 'ct-conc', 'ct-screen', 'ct-fatigue'],
    freeNote: 'Lots of screen use last night — paying for it today.',
  },
  // Day 13
  {
    id: 'ci-13', date: d(13),
    overallFeeling: 4, energyLevel: 4,
    headachePresent: false, headacheIntensity: null,
    activeChallengeTagIds: ['ct-noise'],
    freeNote: 'Really good day. Full school day felt manageable.',
  },
  // Day 14 — today
  {
    id: 'ci-14', date: d(14),
    overallFeeling: 4, energyLevel: 4,
    headachePresent: false, headacheIntensity: null,
    activeChallengeTagIds: ['ct-noise', 'ct-screen'],
    freeNote: 'Screens still variable but reading feels much better.',
  },
];

// Activity logs (distributed across 14 days)
// ─────────────────────────────────────────────────────────────
export const ACTIVITY_LOGS: ActivityLog[] = [
  // Day 2
  { id: 'al-01', date: d(2),  activityCategory: 'Reading',          durationMinutes: 5,  toleranceRating: 1, notes: 'Stopped immediately — too much strain.', challengeTagIds: ['ct-headache', 'ct-conc'] },
  // Day 3
  { id: 'al-02', date: d(3),  activityCategory: 'Physical activity',  customLabel: 'Short walk', durationMinutes: 10, toleranceRating: 2, notes: 'Outdoors helped a little.', challengeTagIds: ['ct-fatigue', 'ct-dizziness'] },
  // Day 4
  { id: 'al-03', date: d(4),  activityCategory: 'Reading',          durationMinutes: 10, toleranceRating: 2, notes: 'Managed a little more than before.', challengeTagIds: ['ct-headache', 'ct-conc'] },
  { id: 'al-04', date: d(4),  activityCategory: 'Screens',          customLabel: 'Phone', durationMinutes: 15, toleranceRating: 1, notes: 'Had to stop — glare too much.', challengeTagIds: ['ct-screen', 'ct-headache'] },
  // Day 5
  { id: 'al-05', date: d(5),  activityCategory: 'Reading',          durationMinutes: 15, toleranceRating: 3, notes: 'First time it felt somewhat okay.', challengeTagIds: ['ct-conc'] },
  { id: 'al-06', date: d(5),  activityCategory: 'Screens',          customLabel: 'Laptop', durationMinutes: 20, toleranceRating: 2, notes: 'Brightness lowered — still difficult.', challengeTagIds: ['ct-screen', 'ct-fatigue'] },
  // Day 6
  { id: 'al-07', date: d(6),  activityCategory: 'Class',            customLabel: 'School — partial', durationMinutes: 120, toleranceRating: 3, notes: 'Quiet classroom was manageable. Hallway hard.', challengeTagIds: ['ct-noise', 'ct-crowded', 'ct-conc'] },
  { id: 'al-08', date: d(6),  activityCategory: 'Reading',          durationMinutes: 20, toleranceRating: 3, notes: 'Concentration better in quiet setting.', challengeTagIds: ['ct-conc'] },
  // Day 7
  { id: 'al-09', date: d(7),  activityCategory: 'Class',            customLabel: 'School — morning', durationMinutes: 180, toleranceRating: 3, notes: 'Two classes felt okay. Noise in halls still hard.', challengeTagIds: ['ct-noise'] },
  { id: 'al-10', date: d(7),  activityCategory: 'Screens',          customLabel: 'Laptop', durationMinutes: 30, toleranceRating: 3, notes: 'Managed notes for class.', challengeTagIds: ['ct-screen'] },
  // Day 8
  { id: 'al-11', date: d(8),  activityCategory: 'Reading',          durationMinutes: 30, toleranceRating: 3, notes: 'Felt mostly manageable.', challengeTagIds: [] },
  { id: 'al-12', date: d(8),  activityCategory: 'Class',            customLabel: 'School — full day', durationMinutes: 360, toleranceRating: 3, notes: 'First full day — tired by end.', challengeTagIds: ['ct-fatigue', 'ct-noise'] },
  { id: 'al-13', date: d(8),  activityCategory: 'Screens',          customLabel: 'Phone', durationMinutes: 40, toleranceRating: 2, notes: 'Variable — bright environments worse.', challengeTagIds: ['ct-screen'] },
  // Day 9 — regression
  { id: 'al-14', date: d(9),  activityCategory: 'Physical activity',  customLabel: 'Rest', durationMinutes: 480, toleranceRating: 1, notes: 'Full rest day. Headache back after overdoing it.', challengeTagIds: ['ct-headache', 'ct-fatigue'] },
  // Day 10
  { id: 'al-15', date: d(10), activityCategory: 'Reading',          durationMinutes: 15, toleranceRating: 3, notes: 'Short session — okay.', challengeTagIds: ['ct-conc'] },
  // Day 11
  { id: 'al-16', date: d(11), activityCategory: 'Class',            customLabel: 'School — partial', durationMinutes: 240, toleranceRating: 3, notes: 'Two classes. Concentration better than last week.', challengeTagIds: ['ct-noise'] },
  { id: 'al-17', date: d(11), activityCategory: 'Reading',          durationMinutes: 25, toleranceRating: 3, notes: 'Chapters felt manageable.', challengeTagIds: [] },
  // Day 12 — regression
  { id: 'al-18', date: d(12), activityCategory: 'Screens',          customLabel: 'Phone', durationMinutes: 90, toleranceRating: 1, notes: 'Too much screen last night — headache returned.', challengeTagIds: ['ct-screen', 'ct-headache'] },
  { id: 'al-19', date: d(12), activityCategory: 'Physical activity',  customLabel: 'Rest', durationMinutes: 300, toleranceRating: 2, notes: 'Resting most of day.', challengeTagIds: ['ct-fatigue'] },
  // Day 13
  { id: 'al-20', date: d(13), activityCategory: 'Class',            customLabel: 'School — full day', durationMinutes: 360, toleranceRating: 3, notes: 'Really good day overall.', challengeTagIds: ['ct-noise'] },
  { id: 'al-21', date: d(13), activityCategory: 'Reading',          durationMinutes: 40, toleranceRating: 3, notes: 'Managed quite a bit.', challengeTagIds: [] },
  // Day 14 — today
  { id: 'al-22', date: d(14), activityCategory: 'Reading',          durationMinutes: 35, toleranceRating: 3, notes: 'Much better than two weeks ago.', challengeTagIds: [] },
  { id: 'al-23', date: d(14), activityCategory: 'Screens',          customLabel: 'Laptop', durationMinutes: 45, toleranceRating: 2, notes: 'Still variable depending on brightness.', challengeTagIds: ['ct-screen'] },
];

// Additional examples retained as future seed material.
export const TODAY_SEED_EXAMPLES: ActivityLog[] = [
  { id: 'al-seed-01', date: TODAY, activityCategory: 'Class',     customLabel: 'Chemistry', durationMinutes: 45, toleranceRating: 2, notes: 'Board work bright.', challengeTagIds: ['ct-light', 'ct-conc'] },
  { id: 'al-seed-02', date: TODAY, activityCategory: 'Social activity', customLabel: 'Cafeteria', durationMinutes: 30, toleranceRating: 1, notes: 'Could not finish lunch.', challengeTagIds: ['ct-noise'] },
  { id: 'al-seed-03', date: TODAY, activityCategory: 'Transportation',  customLabel: 'Bus ride', durationMinutes: 35, toleranceRating: 3, notes: 'Sat in quiet seat.', challengeTagIds: ['ct-noise'] },
  { id: 'al-seed-04', date: TODAY, activityCategory: 'Homework',   customLabel: 'Homework', durationMinutes: 25, toleranceRating: 2, notes: 'Screen strain.', challengeTagIds: ['ct-screen', 'ct-conc'] },
];

// ─────────────────────────────────────────────────────────────
// Accommodation records
// ─────────────────────────────────────────────────────────────
export const ACCOMMODATION_RECORDS: AccommodationRecord[] = [
  {
    id: 'acc-01',
    dateIssued: d(3),
    accommodationType: 'Quiet testing environment',
    issuedBy: 'Healthcare provider',
    activeUntil: d(28),
    visibleToSchool: true,
    status: 'active',
    sourceName: 'Healthcare provider',
  },
  {
    id: 'acc-02',
    dateIssued: d(3),
    accommodationType: 'Reduced screen exposure',
    issuedBy: 'Healthcare provider',
    activeUntil: d(28),
    visibleToSchool: true,
    status: 'active',
    sourceName: 'Healthcare provider',
  },
  {
    id: 'acc-03',
    dateIssued: d(6),
    accommodationType: 'Additional assignment time',
    issuedBy: 'School counselor',
    activeUntil: d(28),
    visibleToSchool: true,
    status: 'active',
    sourceName: 'School counselor',
  },
  {
    id: 'acc-04',
    dateIssued: d(6),
    accommodationType: 'Rest breaks during class',
    issuedBy: 'Healthcare provider',
    activeUntil: d(28),
    visibleToSchool: true,
    status: 'active',
    sourceName: 'Healthcare provider',
  },
];

// ─────────────────────────────────────────────────────────────
// Insight evidence (observational, no causality claims)
// ─────────────────────────────────────────────────────────────
export const INSIGHT_EVIDENCE: InsightEvidence[] = [
  {
    id: 'ie-01',
    insightId: 'insight-reading',
    insightText:
      "Your records show reading tolerance has shifted from very difficult (days 1–2) toward mostly manageable in recent entries, with some difficult sessions following higher-screen days.",
    supportingActivityLogIds: ['al-01', 'al-03', 'al-05', 'al-08', 'al-11', 'al-17', 'al-21', 'al-22'],
    supportingCheckInIds: ['ci-01', 'ci-02', 'ci-05', 'ci-08', 'ci-11', 'ci-13', 'ci-14'],
    generatedOn: d(14),
  },
  {
    id: 'ie-02',
    insightId: 'insight-noise',
    insightText:
      "Noise sensitivity appeared in your records on most days across the 14-day period. Your records show it remained a consistent challenge even on days when other difficulties eased.",
    supportingActivityLogIds: ['al-07', 'al-09', 'al-12', 'al-16', 'al-20'],
    supportingCheckInIds: ['ci-04', 'ci-06', 'ci-07', 'ci-08', 'ci-11', 'ci-13', 'ci-14'],
    generatedOn: d(14),
  },
  {
    id: 'ie-03',
    insightId: 'insight-screen',
    insightText:
      "Screen tolerance appeared in your records as variable — entries following extended screen use on days 4, 12 were rated more difficult. Consider discussing screen management strategies with your care team.",
    supportingActivityLogIds: ['al-04', 'al-06', 'al-10', 'al-13', 'al-18', 'al-23'],
    supportingCheckInIds: ['ci-03', 'ci-05', 'ci-08', 'ci-12', 'ci-14'],
    generatedOn: d(14),
  },
  {
    id: 'ie-04',
    insightId: 'insight-school',
    insightText:
      "Your records show school participation increasing from partial days in week one to full-day entries in week two, with rest days following harder periods.",
    supportingActivityLogIds: ['al-07', 'al-09', 'al-12', 'al-16', 'al-20'],
    supportingCheckInIds: ['ci-06', 'ci-07', 'ci-08', 'ci-09', 'ci-11', 'ci-13'],
    generatedOn: d(14),
  },
];
