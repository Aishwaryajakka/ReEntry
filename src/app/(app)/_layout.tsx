import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/ctx';
import { getLastScheduleNotificationItemId, subscribeToScheduleNotificationResponses } from '@/lib/scheduleNotifications';

export default function AppLayout() {
  const { role, isLoadingRole } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoadingRole || role !== 'student') return;

    const openScheduleCheckIn = (scheduleItemId: string) => {
      router.replace({ pathname: '/(app)/(tabs)/today', params: { scheduleItemId } });
    };
    const unsubscribe = subscribeToScheduleNotificationResponses(openScheduleCheckIn);
    getLastScheduleNotificationItemId().then((itemId) => {
      if (itemId) openScheduleCheckIn(itemId);
    }).catch(() => undefined);
    return unsubscribe;
  }, [isLoadingRole, role, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={role === 'student'}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'school_staff'}>
          <Stack.Screen name="school" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'clinician'}>
          <Stack.Screen name="clinician" />
        </Stack.Protected>
      </Stack>
      {isLoadingRole ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" />
        </View>
      ) : null}
    </>
  );
}
