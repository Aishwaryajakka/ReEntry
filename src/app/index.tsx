import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useSession } from '@/ctx';

export default function Index() {
  const { session, role, isLoading, isLoadingRole } = useSession();

  if (isLoading || (session && isLoadingRole)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (role === 'student') {
    return <Redirect href="/(app)/(tabs)/today" />;
  }

  if (role === 'school_staff') {
    return <Redirect href="/(app)/school" />;
  }

  if (role === 'clinician') {
    return <Redirect href="/(app)/clinician" />;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ textAlign: 'center' }}>
        Your account role could not be determined. Please restart the app or contact support.
      </Text>
    </View>
  );
}
