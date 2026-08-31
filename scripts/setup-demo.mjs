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
const additionalDemoStudents = [
  {
    key: 'jordan', username: 'jordan.demo', displayName: 'Jordan Kim', age: 15,
    activities: [
      ['class-1', '2026-08-27', 'Class', 'Biology', 50, 2, ['Noise']],
      ['reading-1', '2026-08-27', 'Reading', 'History reading', 25, 2, ['Concentration']],
      ['screen-1', '2026-08-28', 'Screens', 'Online assignment', 30, 1, ['Screen glare', 'Fatigue']],
      ['class-2', '2026-08-28', 'Class', 'Algebra', 45, 3, []],
      ['social-1', '2026-08-29', 'Social activity', 'Lunch with friends', 30, 3, []],
      ['homework-1', '2026-08-29', 'Homework', 'Math homework', 35, 2, ['Concentration']],
    ],
    accommodation: 'Short rest breaks during longer classes',
    observations: [
      ['biology', '2026-08-28T15:00:00.000Z', 'Biology', 'completed_with_support', ['short_break'], 'Took a short break and then finished the class activity.'],
      ['algebra', '2026-08-29T16:00:00.000Z', 'Algebra', 'completed_as_planned', [], 'Completed the scheduled classwork.'],
    ],
  },
  {
    key: 'sofia', username: 'sofia.demo', displayName: 'Sofia Martinez', age: 17,
    activities: [
      ['class-1', '2026-08-26', 'Class', 'English', 55, 3, []],
      ['screen-1', '2026-08-26', 'Screens', 'Research project', 40, 2, ['Screen glare']],
      ['transport-1', '2026-08-27', 'Transportation', 'Bus ride', 25, 2, ['Crowded environment']],
      ['class-2', '2026-08-28', 'Class', 'Chemistry', 50, 2, ['Noise', 'Concentration']],
      ['physical-1', '2026-08-28', 'Physical activity', 'Walking between classes', 15, 3, []],
      ['reading-1', '2026-08-29', 'Reading', 'Novel reading', 30, 3, []],
    ],
    accommodation: 'Printed materials when available',
    observations: [
      ['english', '2026-08-27T15:30:00.000Z', 'English', 'completed_as_planned', [], 'Completed the planned discussion and written response.'],
      ['chemistry', '2026-08-28T16:30:00.000Z', 'Chemistry', 'completed_with_support', ['printed_materials'], 'Used printed instructions during the lab review.'],
    ],
  },
  {
    key: 'ethan', username: 'ethan.demo', displayName: 'Ethan Brooks', age: 14,
    activities: [
      ['class-1', '2026-08-27', 'Class', 'Social studies', 45, 2, ['Fatigue']],
      ['noise-1', '2026-08-27', 'Noise/busy environment', 'Cafeteria', 25, 1, ['Noise', 'Crowded environment']],
      ['homework-1', '2026-08-28', 'Homework', 'Science worksheet', 25, 3, []],
      ['class-2', '2026-08-28', 'Class', 'Math', 50, 2, ['Concentration']],
      ['screen-1', '2026-08-29', 'Screens', 'Class presentation', 20, 2, ['Screen glare']],
      ['social-1', '2026-08-29', 'Social activity', 'Club meeting', 30, 3, []],
    ],
    accommodation: 'Quiet testing or work location',
    observations: [
      ['lunch', '2026-08-27T17:30:00.000Z', 'Lunch', 'took_break', ['alternate_workspace'], 'Used an alternate workspace for part of lunch.'],
      ['math', '2026-08-28T16:15:00.000Z', 'Math', 'completed_with_support', ['quiet_environment'], 'Completed the assignment in a quieter work area.'],
    ],
  },
];
const accounts = [
  { key: 'maya', username: 'maya.demo', role: 'student', displayName: 'Maya', age: 16 },
  { key: 'clinician', username: 'clinician.demo', role: 'clinician', displayName: 'Dr. Jordan Lee' },
  { key: 'school', username: 'school.demo', role: 'school_staff', displayName: 'Alex Rivera' },
  ...additionalDemoStudents.map((student) => ({ ...student, role: 'student' })),
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

  const trustedContact = await admin.from('student_trusted_contacts').upsert({
    id: stableUuid('maya:trusted-contact'),
    student_id: users.maya.id,
    name: 'Taylor Morgan',
    relationship: 'Parent',
    phone_number: '+1 202-555-0147',
  }, { onConflict: 'student_id' });
  if (trustedContact.error) throw trustedContact.error;

  const sharedSupportContacts = await admin.from('shared_support_contacts').upsert([
    {
      user_id: users.school.id,
      role: 'school_staff',
      display_name: 'Alex Rivera',
      support_phone: '+1 202-555-0125',
      support_email: 'alex.rivera@example.com',
    },
    {
      user_id: users.clinician.id,
      role: 'clinician',
      display_name: 'Dr. Jordan Lee',
      support_phone: '+1 202-555-0168',
      support_email: 'jordan.lee@example.com',
    },
  ], { onConflict: 'user_id' });
  if (sharedSupportContacts.error) throw sharedSupportContacts.error;
}

async function seedAdditionalStudents(users) {
  for (const student of additionalDemoStudents) {
    const studentId = users[student.key].id;
    const activityRows = student.activities.map(([key, date, category, name, duration, manageability]) => ({
      id: stableUuid(`${student.key}:activity:${key}`),
      student_id: studentId,
      activity_category: category,
      activity_name: name,
      duration_minutes: duration,
      manageability,
      note: null,
      occurred_at: `${date}T12:00:00.000Z`,
    }));
    const activities = await admin.from('activity_logs').upsert(activityRows, { onConflict: 'id' });
    if (activities.error) throw activities.error;

    const tagRows = student.activities.flatMap(([key, , , , , , tags]) => tags.map((tag) => ({
      id: stableUuid(`${student.key}:tag:${key}:${tag}`),
      activity_log_id: stableUuid(`${student.key}:activity:${key}`),
      tag,
    })));
    const tags = await admin.from('challenge_tags').upsert(tagRows, { onConflict: 'id' });
    if (tags.error) throw tags.error;

    const accommodation = await admin.from('accommodation_records').upsert({
      id: stableUuid(`${student.key}:accommodation`),
      student_id: studentId,
      title: student.accommodation,
      source_type: 'clinician',
      source_name: 'Dr. Jordan Lee',
      issued_date: '2026-08-26',
      valid_until: null,
      status: 'active',
      created_by: users.clinician.id,
    }, { onConflict: 'id' });
    if (accommodation.error) throw accommodation.error;

    const observations = await admin.from('school_observations').upsert(student.observations.map(([key, occurredAt, context, observationType, supportUsed, note]) => ({
      id: stableUuid(`${student.key}:school-observation:${key}`),
      student_id: studentId,
      created_by: users.school.id,
      occurred_at: occurredAt,
      context,
      observation_type: observationType,
      support_used: supportUsed,
      note,
    })), { onConflict: 'id' });
    if (observations.error) throw observations.error;

    const links = await admin.from('student_access').upsert([
      { id: stableUuid(`${student.key}:link:clinician`), student_id: studentId, viewer_user_id: users.clinician.id, viewer_role: 'clinician', status: 'active', access_code: null },
      { id: stableUuid(`${student.key}:link:school`), student_id: studentId, viewer_user_id: users.school.id, viewer_role: 'school_staff', status: 'active', access_code: null },
    ], { onConflict: 'id' });
    if (links.error) throw links.error;
  }
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
    countFixture('student_trusted_contacts', [stableUuid('maya:trusted-contact')]),
  ]);
  if (checks[0] !== 35 || checks[1] !== 14 || checks[2] !== 3 || checks[3] !== expectedTagCount || checks[4] !== 2 || checks[5] !== 5 || checks[6] !== 5 || checks[7] !== 1) throw new Error(`Demo fixture verification failed: ${checks.join('/')}`);

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

  const sharedContacts = await admin.from('shared_support_contacts').select('user_id, role, display_name, support_phone, support_email').in('user_id', [users.school.id, users.clinician.id]);
  if (sharedContacts.error || sharedContacts.data?.length !== 2) throw sharedContacts.error ?? new Error('Shared support contact verification failed.');

  const additional = [];
  for (const student of additionalDemoStudents) {
    const studentId = users[student.key].id;
    const [activities, observations, accommodations, links] = await Promise.all([
      admin.from('activity_logs').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      admin.from('school_observations').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      admin.from('accommodation_records').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      admin.from('student_access').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'active'),
    ]);
    for (const query of [activities, observations, accommodations, links]) if (query.error) throw query.error;
    if (activities.count !== student.activities.length || observations.count !== student.observations.length || accommodations.count !== 1 || links.count !== 2) {
      throw new Error(`Additional demo verification failed for ${student.displayName}.`);
    }
    additional.push({ name: student.displayName, activities: activities.count, observations: observations.count, accommodations: accommodations.count });
  }

  return { activities: checks[0], checkIns: checks[1], accommodations: checks[2], schoolObservations: checks[6], additional };
}

const users = await ensureAccounts();
await seedMaya(users);
await seedAdditionalStudents(users);
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
Additional students:
${totals.additional.map((student) => `  ${student.name}: ${student.activities} activities, ${student.observations} observations, ${student.accommodations} accommodation`).join('\n')}
Clinician link: ready
School link: ready`);
