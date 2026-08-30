import { supabase } from '@/client/supabase';
import { CHALLENGE_TAGS } from './activityCatalog';
import { ACCOMMODATION_RECORDS, ACTIVITY_LOGS, DAILY_CHECKINS } from './mayaDataset';

export interface MayaSeedResult {
  activitiesInserted: number;
  challengeTagsInserted: number;
  checkInsInserted: number;
  accommodationsInserted: number;
  limitations: string[];
}

const timestamp = (date: string): string => `${date}T12:00:00.000Z`;

/** Seeds through the normal authenticated client without changing existing rows. */
export async function seedMayaDemo(studentUserId: string): Promise<MayaSeedResult> {
  const result: MayaSeedResult = { activitiesInserted: 0, challengeTagsInserted: 0, checkInsInserted: 0, accommodationsInserted: 0, limitations: [] };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Maya demo seed requires an authenticated user.');

  if (data.user.id === studentUserId) await seedStudentRows(studentUserId, result);
  else result.limitations.push('Activity logs, challenge tags, and check-ins require the authenticated user to be Maya.');

  await seedSupports(studentUserId, data.user.id, result);
  return result;
}

async function seedStudentRows(studentUserId: string, result: MayaSeedResult): Promise<void> {
  const { data: rows, error } = await supabase.from('activity_logs')
    .select('id, activity_category, activity_name, duration_minutes, manageability, note, occurred_at')
    .eq('student_id', studentUserId).gte('occurred_at', timestamp('2026-08-03')).lte('occurred_at', timestamp('2026-08-16'));
  if (error) throw error;

  for (const fixture of ACTIVITY_LOGS) {
    const name = fixture.customLabel ?? fixture.activityCategory;
    const occurredAt = timestamp(fixture.date);
    let activityId = rows?.find((row) => row.activity_category === fixture.activityCategory && row.activity_name === name && row.duration_minutes === fixture.durationMinutes && row.manageability === fixture.toleranceRating && (row.note ?? '') === fixture.notes && row.occurred_at === occurredAt)?.id;

    if (!activityId) {
      const inserted = await supabase.from('activity_logs').insert({ student_id: studentUserId, activity_category: fixture.activityCategory, activity_name: name, duration_minutes: fixture.durationMinutes, manageability: fixture.toleranceRating, note: fixture.notes, occurred_at: occurredAt }).select('id').single();
      if (inserted.error || !inserted.data) throw inserted.error ?? new Error('Activity insert returned no row.');
      activityId = inserted.data.id;
      result.activitiesInserted += 1;
    }

    const existing = await supabase.from('challenge_tags').select('tag').eq('activity_log_id', activityId);
    if (existing.error) throw existing.error;
    const labels = new Set((existing.data ?? []).map((tag) => tag.tag));
    const missing = fixture.challengeTagIds.map((id) => CHALLENGE_TAGS.find((tag) => tag.id === id)?.label).filter((label): label is string => Boolean(label) && !labels.has(label));
    if (missing.length) {
      const tags = await supabase.from('challenge_tags').insert(missing.map((tag) => ({ activity_log_id: activityId, tag })));
      if (tags.error) throw tags.error;
      result.challengeTagsInserted += missing.length;
    }
  }

  const checkIns = await supabase.from('daily_checkins').select('checkin_date, overall_manageability, note').eq('student_id', studentUserId).gte('checkin_date', '2026-08-03').lte('checkin_date', '2026-08-16');
  if (checkIns.error) throw checkIns.error;
  const missing = DAILY_CHECKINS.filter((fixture) => !checkIns.data?.some((row) => row.checkin_date === fixture.date && row.overall_manageability === fixture.overallFeeling && (row.note ?? '') === fixture.freeNote)).map((fixture) => ({ student_id: studentUserId, checkin_date: fixture.date, overall_manageability: fixture.overallFeeling, attendance_context: null, note: fixture.freeNote }));
  if (missing.length) {
    const inserted = await supabase.from('daily_checkins').insert(missing);
    if (inserted.error) throw inserted.error;
    result.checkInsInserted = missing.length;
  }
}

async function seedSupports(studentUserId: string, currentUserId: string, result: MayaSeedResult): Promise<void> {
  if (currentUserId === studentUserId) {
    result.limitations.push('Accommodation seeding is blocked for the student client by current RLS; an authorized linked clinician or admin must create the recorded supports.');
    return;
  }
  const existing = await supabase.from('accommodation_records').select('title, source_type, source_name, issued_date, valid_until, status').eq('student_id', studentUserId);
  if (existing.error) { result.limitations.push(`Accommodation records were not seeded: ${existing.error.message}`); return; }
  const missing = ACCOMMODATION_RECORDS.filter((fixture) => !existing.data?.some((row) => row.title === fixture.accommodationType && row.source_type === fixture.issuedBy && row.source_name === fixture.sourceName && row.issued_date === fixture.dateIssued && row.valid_until === fixture.activeUntil && row.status === fixture.status)).map((fixture) => ({ student_id: studentUserId, title: fixture.accommodationType, source_type: fixture.issuedBy, source_name: fixture.sourceName ?? null, issued_date: fixture.dateIssued, valid_until: fixture.activeUntil, status: fixture.status ?? 'active', created_by: currentUserId }));
  if (!missing.length) return;
  const inserted = await supabase.from('accommodation_records').insert(missing);
  if (inserted.error) { result.limitations.push(`Accommodation records were not seeded: ${inserted.error.message}`); return; }
  result.accommodationsInserted = missing.length;
}
