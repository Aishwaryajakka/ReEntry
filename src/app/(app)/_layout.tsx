import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/ctx';

function RoleGuard({ children }: { children: React.ReactNode }) {
  const { role, isLoadingRole } = useSession();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (isLoadingRole || !role) return;

    const inTabs = segments.includes('(tabs)');
    const inSchool = segments.includes('school');
    const inClinician = segments.includes('clinician');

    if (role === 'student') {
      if (!inTabs) {
        router.replace('/(app)/(tabs)/today' as RelativePathString);
      }
    } else if (role === 'school_staff') {
      if (!inSchool) {
        router.replace('/(app)/school' as RelativePathString);
      }
    } else if (role === 'clinician') {
      if (!inClinician) {
        router.replace('/(app)/clinician' as RelativePathString);
      }
    }
  }, [role, isLoadingRole, segments, router]);

  if (isLoadingRole) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function AppLayout() {
  return (
    <RoleGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="school" />
        <Stack.Screen name="clinician" />
      </Stack>
    </RoleGuard>
  );
}
