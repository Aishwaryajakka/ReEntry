import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { AppProvider } from '@/context/AppContext';
import {
  ThemeProvider,
  useTheme as useReEntryTheme,
} from '../context/ThemeContext';
import { SessionProvider, useSession } from '@/ctx';
import '../global.css';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

function RootLayoutNav() {
  const { session, isLoading } = useSession();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="index" />

        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>

      {isLoading ? (
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

function ThemedLayout() {
  const { theme } = useReEntryTheme();
  const isDark = theme === 'dark';

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={isDark ? '#263528' : '#E8E3D9'}
      />

      <RootLayoutNav />
      <PortalHost />
    </View>
  );
}

const RootLayout: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <ThemeProvider>
          <AppProvider>
            <ThemedLayout />
          </AppProvider>
        </ThemeProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(RootLayout);