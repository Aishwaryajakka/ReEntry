import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { StudentScheduleItem } from '@/data/types';
import type { ReminderSyncResult } from './scheduleNotifications';

const CHANNEL_ID = 'school-schedule-reminders';
const NOTIFICATION_KIND = 'reentry-school-schedule';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function reminderTime(endTime: string): { hour: number; minute: number } {
  const [hour, minute] = endTime.split(':').map(Number);
  const total = hour * 60 + minute + 5;
  return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
}

function expoWeekday(isoWeekday: number): number {
  return (isoWeekday % 7) + 1;
}

async function cancelExistingScheduleNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.kind === NOTIFICATION_KIND)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

export async function syncScheduleNotifications(
  items: StudentScheduleItem[],
  requestPermission: boolean,
): Promise<ReminderSyncResult> {
  await cancelExistingScheduleNotifications();
  const enabled = items.filter((item) => item.active && item.remindersEnabled);
  if (enabled.length === 0) return 'scheduled';

  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted && requestPermission) {
    permissions = await Notifications.requestPermissionsAsync();
  }
  if (!permissions.granted) return 'denied';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'School schedule check-ins',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  for (const item of enabled) {
    const time = reminderTime(item.endTime);
    for (const weekday of item.daysOfWeek) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `How did ${item.activityName} go?`,
          body: "Take a quick ReEntry check-in while it's fresh.",
          data: { kind: NOTIFICATION_KIND, scheduleItemId: item.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday(weekday),
          hour: time.hour,
          minute: time.minute,
          channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
        },
      });
    }
  }
  return 'scheduled';
}

function itemIdFromResponse(response: Notifications.NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data;
  return data?.kind === NOTIFICATION_KIND && typeof data.scheduleItemId === 'string'
    ? data.scheduleItemId
    : null;
}

export function subscribeToScheduleNotificationResponses(
  listener: (scheduleItemId: string) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const itemId = itemIdFromResponse(response);
    if (itemId) listener(itemId);
  });
  return () => subscription.remove();
}

export async function getLastScheduleNotificationItemId(): Promise<string | null> {
  const itemId = itemIdFromResponse(await Notifications.getLastNotificationResponseAsync());
  if (itemId) await Notifications.clearLastNotificationResponseAsync();
  return itemId;
}
