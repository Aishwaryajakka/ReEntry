import type { StudentScheduleItem } from '@/data/types';

export type ReminderSyncResult = 'scheduled' | 'denied' | 'unavailable';

export async function syncScheduleNotifications(
  _items: StudentScheduleItem[],
  _requestPermission: boolean,
): Promise<ReminderSyncResult> {
  return 'unavailable';
}

export function subscribeToScheduleNotificationResponses(
  _listener: (scheduleItemId: string) => void,
): () => void {
  return () => undefined;
}

export async function getLastScheduleNotificationItemId(): Promise<string | null> {
  return null;
}
