/**
 * Landing screen — the public entry point for ReEntry.
 * Auth screens are always light; this screen uses the same light treatment.
 */

import { Pressable, Text, View } from 'react-native';
import { useRouter, type RelativePathString } from 'expo-router';
import { useSession } from '@/ctx';
import { ScreenShell } from '@/components/ScreenShell';
import { ReEntryWordmark } from '@/components/ReEntryWordmark';
import { PrimaryButton } from '@/components/Buttons';
import { BodyText, MicroText } from '@/components/Typography';

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
      <View className="flex-1 justify-center self-center w-full max-w-[520px] px-6 py-12 gap-6">
        <ReEntryWordmark appearance="light" />

        <BodyText className="text-center leading-6 text-muted-foreground">
          Track everyday function and share useful recovery context with your care and school teams.
        </BodyText>

        <MicroText className="text-center leading-5 text-muted-foreground">
          ReEntry supports recovery communication and does not provide medical diagnosis or clearance.
        </MicroText>

        <View className="mt-3 gap-3">
          <PrimaryButton
            label="Create account"
            onPress={() => router.navigate('/(auth)/sign-up' as RelativePathString)}
            className="w-full"
          />
          <View className="flex-row items-center justify-center gap-1">
            <MicroText className="text-muted-foreground">Already have an account?</MicroText>
            <Pressable
              onPress={() => router.navigate('/(auth)/sign-in' as RelativePathString)}
              accessibilityRole="link"
              className="min-h-11 justify-center py-3"
            >
              <Text className="font-semibold text-foreground">Sign in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}
