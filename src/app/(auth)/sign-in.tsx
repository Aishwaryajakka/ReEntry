import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton, GhostButton } from '@/components/Buttons';
import { ReEntryWordmark } from '@/components/ReEntryWordmark';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { BodyText, LabelText, MicroText } from '@/components/Typography';
import { supabase } from '@/client/supabase';

export default function SignInScreen() {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ username: false, password: false });

  const trimmedUsername = username.trim();
  const isFormValid = trimmedUsername.length > 0 && password.length > 0;

  const handleSignIn = async () => {
    setTouched({ username: true, password: true });

    if (!isFormValid) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${trimmedUsername}@miaoda.com`,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        router.replace('/(app)/(tabs)/today' as RelativePathString);
      }
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell noScroll light>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View className="gap-6">
            <View className="items-center gap-4">
              <ReEntryWordmark tagline="Return to school. Return to friends. Return to life." appearance="light" />
              <BodyText className="text-center">Sign in to continue your ReEntry journey.</BodyText>
            </View>

            <SectionCard className="gap-5">
              <View className="gap-2">
                <LabelText>Username</LabelText>
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (touched.username && text.trim().length > 0) {
                      setError(null);
                    }
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Enter username"
                  placeholderTextColor="#71856A"
                  className="bg-background text-foreground rounded-xl px-4 py-3.5 text-base border border-border"
                  style={{ minHeight: 52 } as object}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                {touched.username && trimmedUsername.length === 0 && (
                  <MicroText className="text-destructive">Username is required</MicroText>
                )}
              </View>

              <View className="gap-2">
                <LabelText>Password</LabelText>
                <View className="relative">
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (touched.password && text.length > 0) {
                        setError(null);
                      }
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    secureTextEntry={!showPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#71856A"
                    className="bg-background text-foreground rounded-xl px-4 py-3.5 pr-20 text-base border border-border"
                    style={{ minHeight: 52 } as object}
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    className="absolute right-0 top-0 bottom-0 px-4 justify-center active:opacity-70"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Text className="text-sm font-semibold text-primary">
                      {showPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              {touched.password && password.length === 0 && (
                <MicroText className="text-destructive">Password is required</MicroText>
              )}

              {error && (
                <MicroText className="text-destructive">{error}</MicroText>
              )}

              <PrimaryButton
                label={loading ? 'Signing in…' : 'Sign In'}
                onPress={handleSignIn}
                disabled={!isFormValid}
                loading={loading}
                className="w-full"
                appearance="light"
              />
            </SectionCard>

            <View className="items-center">
              <GhostButton
                label="Need an account? Sign up"
                onPress={() => router.replace('/(auth)/sign-up' as RelativePathString)}
                appearance="light"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
