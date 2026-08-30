import { View } from 'react-native';

import { SecondaryButton } from '@/components/Buttons';
import { BodyText } from '@/components/Typography';
import { supabase } from '@/client/supabase';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background gap-4 px-6">
      <BodyText className="text-center">Open up app/index.tsx to start working on your app!</BodyText>
      <SecondaryButton label="Sign Out" onPress={() => { void supabase.auth.signOut(); }} className="w-full" />
    </View>
  );
}
