/**
 * Landing screen — the public entry point for ReEntry.
 * Auth screens are always light; this screen uses the same light treatment.
 */

import { View } from 'react-native';
import { useRouter, type RelativePathString } from 'expo-router';
import { useSession } from '@/ctx';
import { ScreenShell } from '@/components/ScreenShell';
import { ReEntryWordmark } from '@/components/ReEntryWordmark';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { BodyText } from '@/components/Typography';

export default function LandingScreen() {
  const { session } = useSession();
  const router = useRouter();

  // Signed-in users should never land here; the protected stack handles
  // routing, but this guard keeps the screen safe if it is ever reached.
  if (session) {
    return null;
  }

  return (
    <ScreenShell light>
      <View className="flex-1 justify-center px-6 py-8 gap-6">
        <ReEntryWordmark
          appearance="light"
          tagline="Return to school. Return to friends. Return to life."
        />

        <BodyText className="text-center leading-6 text-muted-foreground">
          ReEntry supports observational recovery tracking and communication.
          It does not diagnose, estimate severity, prescribe treatment, predict
          recovery time, or provide return-to-play clearance.
        </BodyText>

        <View className="gap-3 mt-4">
          <PrimaryButton
            label="Sign In"
            onPress={() => router.navigate('/(auth)/sign-in' as RelativePathString)}
            className="w-full"
          />
          <SecondaryButton
            label="Create Account"
            onPress={() => router.navigate('/(auth)/sign-up' as RelativePathString)}
            className="w-full"
          />
        </View>
      </View>
    </ScreenShell>
  );
}
