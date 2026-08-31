import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import { createClient } from '@supabase/supabase-js';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !specifier.match(/\.[cm]?[jt]s$/)) {
      try { return nextResolve(`${specifier}.ts`, context); } catch { /* use normal resolution */ }
    }
    return nextResolve(specifier, context);
  },
});

const { ACCOMMODATION_RECORDS, ACTIVITY_LOGS, DAILY_CHECKINS, CHALLENGE_TAGS } =
  await import('../src/data/mayaDataset.ts');

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error('Provide SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const password = 'Pass123';
const mayaSchedule = [
  ['chemistry', 'Chemistry', 'Class', '09:00', '09:50'],
  ['english', 'English', 'Class', '10:00', '10:50'],
  ['math', 'Math', 'Class', '11:00', '11:50'],
  ['lunch', 'Lunch', 'Social activity', '12:00', '12:30'],
  ['study-hall', 'Study Hall', 'Class', '13:15', '14:00'],
];
const mayaSchoolObservations = [
  { key: 'chemistry-aug-25', occurredAt: '2026-08-25T14:52:00.000Z', context: 'Chemistry', observationType: 'completed_with_support', supportUsed: ['quiet_environment', 'short_break'], note: 'Used a quieter workspace and returned after a short break.' },
  { key: 'english-aug-26', occurredAt: '2026-08-26T15:50:00.000Z', context: 'English', observationType: 'completed_as_planned', supportUsed: [], note: 'Completed the scheduled reading and written response.' },
  { key: 'lunch-aug-27', occurredAt: '2026-08-27T17:15:00.000Z', context: 'Lunch', observationType: 'took_break', supportUsed: ['alternate_workspace'], note: 'Moved to an alternate workspace for part of lunch.' },
  { key: 'math-aug-28', occurredAt: '2026-08-28T16:52:00.000Z', context: 'Math', observationType: 'completed_with_support', supportUsed: ['extra_time'], note: 'Used additional time to finish the assigned problems.' },
  { key: 'study-hall-aug-29', occurredAt: '2026-08-29T19:00:00.000Z', context: 'Study hall', observationType: 'reduced_or_stopped', supportUsed: ['reduced_workload'], note: 'Completed a reduced set of assigned work.' },
];
const accounts = [
  { key: 'maya', username: 'maya.demo', role: 'student', displayName: 'Maya', age: 16 },
  { key: 'clinician', username: 'clinician.demo', role: 'clinician', displayName: 'Dr. Jordan Lee' },
  { key: 'school', username: 'school.demo', role: 'school_staff', displayName: 'Alex Rivera' },
];

function stableUuid(key) {
  const bytes = Buffer.from(createHash('sha256').update(`reentry-demo:${key}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function findDemoUsers() {
  const wanted = new Set(accounts.map(({ username }) => `${username}@miaoda.com`));
  const found = new Map();
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const user of data.users) if (user.email && wanted.has(user.email)) found.set(user.email, user);
    if (data.users.length < 200) break;
  }
  return found;
}

async function ensureAccounts() {
  const existing = await findDemoUsers();
  const users = {};
  for (const account of accounts) {
    const email = `${account.username}@miaoda.com`;
    const metadata = { role: account.role, display_name: account.displayName, ...(account.age ? { age: account.age } : {}) };
    let user = existing.get(email);
    if (user) {
      const updated = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true, user_metadata: metadata });
      if (updated.error) throw updated.error;
      user = updated.data.user;
    } else {
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
      if (created.error) throw created.error;
      user = created.data.user;
    }
    users[account.key] = user;
    const profile = await admin.from('profiles').upsert({ id: user.id, email, role: account.role, display_name: account.displayName }, { onConflict: 'id' });
    if (profile.error) throw profile.error;
  }
  return users;
}

async function seedMaya(users) {
  const schedule = await admin.from('student_schedule_items').upsert(mayaSchedule.map(([key, activityName, activityCategory, startTime, endTime]) => ({
    id: stableUuid(`maya:schedule:${key}`), student_id: users.maya.id,
    activity_name: activityName, activity_category: activityCategory,
    days_of_week: [1, 2, 3, 4, 5], start_time: startTime, end_time: endTime,
    reminders_enabled: true, active: true,
  })), { onConflict: 'id' });
  if (schedule.error) throw schedule.error;

  const activityRows = ACTIVITY_LOGS.map((entry) => ({
    id: stableUuid(`maya:activity:${entry.id}`), student_id: users.maya.id,
    activity_category: entry.activityCategory, activity_name: entry.customLabel ?? entry.activityCategory,
    duration_minutes: entry.durationMinutes, manageability: entry.toleranceRating,
    note: entry.notes, occurred_at: `${entry.date}T12:00:00.000Z`,
  }));
  const activities = await admin.from('activity_logs').upsert(activityRows, { onConflict: 'id' });
  if (activities.error) throw activities.error;

  const tagRows = ACTIVITY_LOGS.flatMap((entry) => entry.challengeTagIds.map((tagId) => {
    const tag = CHALLENGE_TAGS.find((candidate) => candidate.id === tagId);
    if (!tag) throw new Error(`Unknown challenge tag: ${tagId}`);
    return { id: stableUuid(`maya:tag:${entry.id}:${tagId}`), activity_log_id: stableUuid(`maya:activity:${entry.id}`), tag: tag.label };
  }));
  const tags = await admin.from('challenge_tags').upsert(tagRows, { onConflict: 'id' });
  if (tags.error) throw tags.error;

  const checkIns = await admin.from('daily_checkins').upsert(DAILY_CHECKINS.map((entry) => ({
    id: stableUuid(`maya:checkin:${entry.id}`), student_id: users.maya.id,
    checkin_date: entry.date, overall_manageability: entry.overallFeeling,
    attendance_context: null, note: entry.freeNote,
  })), { onConflict: 'id' });
  if (checkIns.error) throw checkIns.error;

  const links = await admin.from('student_access').upsert([
    { id: stableUuid('maya:link:clinician'), student_id: users.maya.id, viewer_user_id: users.clinician.id, viewer_role: 'clinician', status: 'active', access_code: null },
    { id: stableUuid('maya:link:school'), student_id: users.maya.id, viewer_user_id: users.school.id, viewer_role: 'school_staff', status: 'active', access_code: null },
  ], { onConflict: 'id' });
  if (links.error) throw links.error;

  const supports = await admin.from('accommodation_records').upsert(ACCOMMODATION_RECORDS.map((entry) => ({
    id: stableUuid(`maya:accommodation:${entry.id}`), student_id: users.maya.id,
    title: entry.accommodationType, source_type: entry.issuedBy,
    source_name: entry.sourceName ?? null, issued_date: entry.dateIssued,
    valid_until: entry.activeUntil, status: entry.status ?? 'active', created_by: users.clinician.id,
  })), { onConflict: 'id' });
  if (supports.error) throw supports.error;

  const observations = await admin.from('school_observations').upsert(mayaSchoolObservations.map((entry) => ({
    id: stableUuid(`maya:school-observation:${entry.key}`),
    student_id: users.maya.id,
    created_by: users.school.id,
    occurred_at: entry.occurredAt,
    context: entry.context,
    observation_type: entry.observationType,
    support_used: entry.supportUsed,
    note: entry.note,
  })), { onConflict: 'id' });
  if (observations.error) throw observations.error;
}

async function countFixture(table, ids) {
  const result = await admin.from(table).select('id', { count: 'exact', head: true }).in('id', ids);
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function verify(users) {
  const expectedTagCount = ACTIVITY_LOGS.reduce((count, entry) => count + entry.challengeTagIds.length, 0);
  const checks = await Promise.all([
    countFixture('activity_logs', ACTIVITY_LOGS.map((entry) => stableUuid(`maya:activity:${entry.id}`))),
    countFixture('daily_checkins', DAILY_CHECKINS.map((entry) => stableUuid(`maya:checkin:${entry.id}`))),
    countFixture('accommodation_records', ACCOMMODATION_RECORDS.map((entry) => stableUuid(`maya:accommodation:${entry.id}`))),
    countFixture('challenge_tags', ACTIVITY_LOGS.flatMap((entry) => entry.challengeTagIds.map((tag) => stableUuid(`maya:tag:${entry.id}:${tag}`)))),
    countFixture('student_access', [stableUuid('maya:link:clinician'), stableUuid('maya:link:school')]),
    countFixture('student_schedule_items', mayaSchedule.map(([key]) => stableUuid(`maya:schedule:${key}`))),
    countFixture('school_observations', mayaSchoolObservations.map((entry) => stableUuid(`maya:school-observation:${entry.key}`))),
  ]);
  if (checks[0] !== 35 || checks[1] !== 14 || checks[2] !== 3 || checks[3] !== expectedTagCount || checks[4] !== 2 || checks[5] !== 5 || checks[6] !== 5) throw new Error(`Demo fixture verification failed: ${checks.join('/')}`);

  const totalQueries = await Promise.all([
    admin.from('activity_logs').select('id', { count: 'exact', head: true }).eq('student_id', users.maya.id),
    admin.from('daily_checkins').select('id', { count: 'exact', head: true }).eq('student_id', users.maya.id),
    admin.from('accommodation_records').select('id', { count: 'exact', head: true }).eq('student_id', users.maya.id).eq('status', 'active'),
    admin.from('school_observations').select('id', { count: 'exact', head: true }).eq('student_id', users.maya.id),
  ]);
  for (const query of totalQueries) if (query.error) throw query.error;
  if (totalQueries[0].count !== 35 || totalQueries[1].count !== 14 || totalQueries[2].count !== 3 || totalQueries[3].count !== 5) {
    throw new Error('The reused Maya demo account contains non-fixture rows; no existing data was deleted.');
  }

  const profiles = await admin.from('profiles').select('id, role, display_name').in('id', [users.maya.id, users.clinician.id, users.school.id]);
  if (profiles.error || profiles.data?.length !== 3) throw profiles.error ?? new Error('Demo profile verification failed.');
  const expectedProfiles = new Map([
    [users.maya.id, ['student', 'Maya']],
    [users.clinician.id, ['clinician', 'Dr. Jordan Lee']],
    [users.school.id, ['school_staff', 'Alex Rivera']],
  ]);
  if (profiles.data.some((profile) => {
    const expected = expectedProfiles.get(profile.id);
    return !expected || profile.role !== expected[0] || profile.display_name !== expected[1];
  })) throw new Error('Demo profile roles or display names did not verify.');

  const links = await admin.from('student_access').select('viewer_user_id, viewer_role, status').in('id', [stableUuid('maya:link:clinician'), stableUuid('maya:link:school')]);
  if (links.error || links.data?.length !== 2 || !links.data.some((link) => link.viewer_user_id === users.clinician.id && link.viewer_role === 'clinician' && link.status === 'active') || !links.data.some((link) => link.viewer_user_id === users.school.id && link.viewer_role === 'school_staff' && link.status === 'active')) {
    throw links.error ?? new Error('Demo relationship verification failed.');
  }
  return { activities: checks[0], checkIns: checks[1], accommodations: checks[2], schoolObservations: checks[6] };
}

const users = await ensureAccounts();
await seedMaya(users);
const totals = await verify(users);

console.log(`ReEntry demo setup complete

Student:
  maya.demo / Pass123

Clinician:
  clinician.demo / Pass123

School:
  school.demo / Pass123

Maya activities: ${totals.activities}
Maya check-ins: ${totals.checkIns}
Maya accommodations: ${totals.accommodations}
Maya school observations: ${totals.schoolObservations}
Clinician link: ready
School link: ready`);
