/** Stable, observational Maya demo fixture. */
import type { AccommodationRecord, ActivityLog, DailyCheckIn, DemoUser } from './types';
export { CHALLENGE_TAGS, TOLERANCE_LABELS } from './activityCatalog';

export const DEMO_USER: DemoUser = { id: 'user-maya', firstName: 'Maya', age: 16 };
export const MAYA_DEMO_START_DATE = '2026-08-16';
export const MAYA_DEMO_END_DATE = '2026-08-29';
export const TODAY = MAYA_DEMO_END_DATE;

const demoDate = (originalDay: string): string =>
  `2026-08-${String(Number(originalDay) + 13).padStart(2, '0')}`;

const checkIn = (day: string, overallFeeling: DailyCheckIn['overallFeeling'], freeNote: string, index: number): DailyCheckIn =>
  ({ id: `ci-${String(index).padStart(2, '0')}`, date: demoDate(day), overallFeeling, freeNote });

export const DAILY_CHECKINS: DailyCheckIn[] = [
  checkIn('03', 2, 'Reading and bright rooms felt difficult today.', 1),
  checkIn('04', 2, 'Needed a quieter place after screen work.', 2),
  checkIn('05', 3, 'A short walk and brief reading session felt manageable.', 3),
  checkIn('06', 2, 'Noise felt harder to manage by the end of class.', 4),
  checkIn('07', 3, 'Quiet classwork felt easier than hallway transitions.', 5),
  checkIn('08', 3, 'Short activities felt manageable with breaks between them.', 6),
  checkIn('09', 4, 'Reading felt more manageable than earlier this week.', 7),
  checkIn('10', 3, 'The cafeteria was difficult, while quiet class time felt manageable.', 8),
  checkIn('11', 2, 'Screen work and a busy hallway felt difficult today.', 9),
  checkIn('12', 3, 'A shorter school day felt more manageable.', 10),
  checkIn('13', 4, 'Printed homework and quiet reading both felt manageable.', 11),
  checkIn('14', 3, 'Bus noise was difficult, but later classwork felt manageable.', 12),
  checkIn('15', 4, 'Screen work felt more manageable than earlier this week.', 13),
  checkIn('16', 3, 'A busy social setting was difficult; quiet homework felt manageable.', 14),
];

type ActivityValues = Omit<ActivityLog, 'id' | 'date'>;
const activity = (day: string, values: ActivityValues, index: number): ActivityLog =>
  ({ id: `al-${String(index).padStart(2, '0')}`, date: demoDate(day), ...values });
const a = (activityCategory: ActivityLog['activityCategory'], customLabel: string, durationMinutes: number, toleranceRating: ActivityLog['toleranceRating'], notes: string, challengeTagIds: string[]): ActivityValues =>
  ({ activityCategory, customLabel, durationMinutes, toleranceRating, notes, challengeTagIds });

export const ACTIVITY_LOGS: ActivityLog[] = [
  activity('03', a('Reading', 'English reading', 10, 1, 'The text felt difficult to follow after several minutes.', ['ct-headache', 'ct-conc']), 1),
  activity('03', a('Screens', 'School portal', 12, 1, 'The bright screen felt difficult to manage.', ['ct-screen', 'ct-light']), 2),
  activity('04', a('Transportation', 'Car ride', 20, 2, 'Traffic movement felt uncomfortable at times.', ['ct-dizziness']), 3),
  activity('04', a('Screens', 'Phone messages', 15, 2, 'Lower brightness helped, though the screen still felt tiring.', ['ct-screen', 'ct-fatigue']), 4),
  activity('05', a('Physical activity', 'Short walk', 15, 3, 'The easy walk felt manageable.', []), 5),
  activity('05', a('Reading', 'Printed worksheet', 15, 2, 'Needed to reread a few sections.', ['ct-conc']), 6),
  activity('06', a('Class', 'Math class', 35, 2, 'Following the board work became harder near the end.', ['ct-conc', 'ct-light']), 7),
  activity('06', a('Noise/busy environment', 'School hallway', 10, 1, 'Noise felt harder to manage in the crowded hallway.', ['ct-noise', 'ct-crowded']), 8),
  activity('06', a('Homework', 'Math practice', 20, 2, 'A quiet workspace helped, with one short pause.', ['ct-conc', 'ct-fatigue']), 9),
  activity('07', a('Class', 'English class', 45, 3, 'Printed materials and a quiet seat felt manageable.', []), 10),
  activity('07', a('Social activity', 'Lunch with friends', 25, 2, 'Conversation was manageable until the room became busier.', ['ct-noise', 'ct-crowded']), 11),
  activity('08', a('Reading', 'Novel', 25, 3, 'Reading in a quiet room felt manageable.', []), 12),
  activity('08', a('Screens', 'Laptop assignment', 25, 2, 'Screen glare became noticeable near the end.', ['ct-screen', 'ct-fatigue']), 13),
  activity('09', a('Physical activity', 'Easy walk', 25, 3, 'The pace and duration felt manageable.', []), 14),
  activity('09', a('Social activity', 'Family dinner', 40, 3, 'A small group conversation felt manageable.', []), 15),
  activity('10', a('Class', 'Science class', 50, 3, 'Classwork felt manageable with a short break.', ['ct-fatigue']), 16),
  activity('10', a('Noise/busy environment', 'Cafeteria', 20, 1, 'The room became difficult to manage as it filled up.', ['ct-noise', 'ct-crowded', 'ct-headache']), 17),
  activity('10', a('Transportation', 'School bus', 30, 2, 'Engine and conversation noise felt tiring.', ['ct-noise', 'ct-fatigue']), 18),
  activity('11', a('Screens', 'Online quiz', 35, 1, 'Sustained screen focus felt difficult today.', ['ct-screen', 'ct-conc', 'ct-headache']), 19),
  activity('11', a('Noise/busy environment', 'Passing period', 8, 1, 'Crowding and overlapping voices felt difficult.', ['ct-noise', 'ct-crowded']), 20),
  activity('11', a('Other', 'Quiet break', 20, 3, 'A quiet space felt manageable afterward.', []), 21),
  activity('12', a('Class', 'History class', 40, 2, 'Listening was manageable, while note-taking took extra focus.', ['ct-conc', 'ct-fatigue']), 22),
  activity('12', a('Reading', 'History chapter', 20, 3, 'A short printed chapter felt manageable.', []), 23),
  activity('12', a('Homework', 'Printed assignment', 30, 3, 'The printed assignment felt manageable with one pause.', ['ct-fatigue']), 24),
  activity('13', a('Class', 'School morning', 150, 3, 'Three quieter classes felt manageable overall.', ['ct-fatigue']), 25),
  activity('13', a('Homework', 'English response', 35, 3, 'Writing from printed notes felt manageable.', []), 26),
  activity('14', a('Transportation', 'School bus', 35, 1, 'The louder bus ride felt difficult this morning.', ['ct-noise', 'ct-headache']), 27),
  activity('14', a('Class', 'Art class', 50, 3, 'The quieter class setting felt manageable.', []), 28),
  activity('14', a('Screens', 'Research task', 30, 2, 'Screen work was manageable in shorter sections.', ['ct-screen', 'ct-conc']), 29),
  activity('15', a('Reading', 'Novel', 40, 3, 'Reading felt more manageable than earlier in the fixture period.', []), 30),
  activity('15', a('Screens', 'Video call', 35, 3, 'The call felt manageable with reduced brightness.', ['ct-screen']), 31),
  activity('15', a('Physical activity', 'Easy walk', 30, 3, 'The easy pace felt manageable.', []), 32),
  activity('16', a('Social activity', 'Busy family gathering', 45, 1, 'Several conversations at once felt difficult to follow.', ['ct-noise', 'ct-crowded', 'ct-conc']), 33),
  activity('16', a('Homework', 'Math review', 30, 3, 'Quiet homework felt manageable after a break.', []), 34),
  activity('16', a('Other', 'Organizing school materials', 20, 2, 'Remembering the order of tasks took extra effort.', ['ct-memory', 'ct-fatigue']), 35),
];

export const ACCOMMODATION_RECORDS: AccommodationRecord[] = [
  { id: 'acc-01', dateIssued: '2026-08-18', accommodationType: 'Reduced screen brightness / printed materials when available', issuedBy: 'Healthcare provider', activeUntil: '2027-01-13', visibleToSchool: true, status: 'active', sourceName: 'Healthcare provider' },
  { id: 'acc-02', dateIssued: '2026-08-18', accommodationType: 'Quiet testing or work location', issuedBy: 'Healthcare provider', activeUntil: '2027-01-13', visibleToSchool: true, status: 'active', sourceName: 'Healthcare provider' },
  { id: 'acc-03', dateIssued: '2026-08-18', accommodationType: 'Short rest breaks during longer classes', issuedBy: 'Healthcare provider', activeUntil: '2027-01-13', visibleToSchool: true, status: 'active', sourceName: 'Healthcare provider' },
];

export const TODAY_SEED_EXAMPLES = ACTIVITY_LOGS.filter((entry) => entry.date === TODAY);
export const INSIGHT_EVIDENCE = [];
