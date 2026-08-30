import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { PrimaryButton, GhostButton } from '@/components/Buttons';
import { ReEntryWordmark } from '@/components/ReEntryWordmark';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { BodyText, LabelText, MicroText } from '@/components/Typography';
import { supabase } from '@/client/supabase';
import { cn } from '@/lib/utils';
import { COLORS, useThemeColors } from '@/lib/theme';

const ROLES = [
  { key: 'student', label: 'Student' },
  { key: 'school_staff', label: 'School Staff' },
  { key: 'clinician', label: 'Clinician' },
] as const;

type RoleKey = (typeof ROLES)[number]['key'];

export default function SignUpScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const passwordRef = useRef<TextInput>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleKey>('student');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ username: false, password: false, agreed: false });

  const trimmedUsername = username.trim();
  const usernameValid = trimmedUsername.length > 0 && /^[a-zA-Z0-9_]+$/.test(trimmedUsername);
  const passwordValid = password.length >= 6;
  const isFormValid = usernameValid && passwordValid && agreed;

  const handleSignUp = async () => {
    setTouched({ username: true, password: true, agreed: true });

    if (!isFormValid) {
      if (!trimmedUsername) {
        setError('Please enter a username');
      } else if (!usernameValid) {
        setError('Username can only contain letters, numbers, and underscores');
      } else if (!passwordValid) {
        setError('Password must be at least 6 characters');
      } else if (!agreed) {
        setError('Please accept the User Agreement and Privacy Policy');
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('sign-up', {
        body: {
          email: `${username.trim()}@miaoda.com`,
          password,
          role: selectedRole,
        },
      });

      if (invokeError) {
        const errorText = await invokeError.context?.text?.();
        setError(errorText || invokeError.message);
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${username.trim()}@miaoda.com`,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        router.replace('/(app)/(tabs)/today' as RelativePathString);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account';
      setError(message);
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
              <ReEntryWordmark appearance="light" />
              <BodyText className="text-center">Create your account to get started.</BodyText>
            </View>

            <SectionCard className="gap-5">
              <View className="gap-2">
                <LabelText>Username</LabelText>
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (touched.username && text.trim().length > 0 && /^[a-zA-Z0-9_]+$/.test(text.trim())) {
                      setError(null);
                    }
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Choose a username"
                  placeholderTextColor="#71856A"
                  className="bg-background text-foreground rounded-xl px-4 py-3.5 text-base border border-border"
                  style={{ minHeight: 52 } as object}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <MicroText>Only letters, numbers, and underscores are allowed.</MicroText>
                {touched.username && !usernameValid && (
                  <MicroText className="text-destructive">
                    {!trimmedUsername
                      ? 'Username is required'
                      : 'Username can only contain letters, numbers, and underscores'}
                  </MicroText>
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
                      if (touched.password && text.length >= 6) {
                        setError(null);
                      }
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    secureTextEntry={!showPassword}
                    placeholder="Create password"
                    placeholderTextColor="#71856A"
                    className="bg-background text-foreground rounded-xl px-4 py-3.5 pr-20 text-base border border-border"
                    style={{ minHeight: 52 } as object}
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
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
              {touched.password && !passwordValid && (
                <MicroText className="text-destructive">Password must be at least 6 characters</MicroText>
              )}

              <View className="gap-3">
                <LabelText>I am a...</LabelText>
                {ROLES.map(({ key, label }) => (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedRole(key)}
                    className={cn(
                      'flex-row items-center justify-between rounded-xl border px-4 py-3.5 active:opacity-95',
                      selectedRole === key
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background'
                    )}
                    accessibilityLabel={label}
                    accessibilityState={{ selected: selectedRole === key }}
                    style={{ minHeight: 52 } as object}
                  >
                    <Text className="text-base font-medium text-foreground">{label}</Text>
                    <View
                      className={cn(
                        'w-5 h-5 rounded-full border-2 items-center justify-center',
                        selectedRole === key ? 'border-primary' : 'border-muted-foreground'
                      )}
                    >
                      {selectedRole === key && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </View>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  setAgreed((current) => {
                    const next = !current;
                    if (touched.agreed && next) setError(null);
                    return next;
                  });
                  setTouched((current) => ({ ...current, agreed: true }));
                }}
                className="flex-row items-start gap-3 rounded-xl border border-border bg-background p-3 active:opacity-80"
                accessibilityRole="checkbox"
                accessibilityLabel="I agree to the User Agreement and Privacy Policy"
                accessibilityState={{ checked: agreed }}
              >
                <View
                  className="h-6 w-6 shrink-0 items-center justify-center rounded-md border-2"
                  style={{
                    backgroundColor: agreed ? COLORS.forest : theme.background,
                    borderColor: agreed ? COLORS.forest : theme.foreground,
                  }}
                >
                  {agreed ? <Check size={17} strokeWidth={3.5} color={COLORS.warmWhite} /> : null}
                </View>
                <View className="flex-1">
                  <BodyText className="text-sm leading-snug">
                    I agree to the User Agreement and Privacy Policy.
                  </BodyText>
                  <MicroText className="text-xs">Recovery support only — not a diagnosis.</MicroText>
                </View>
              </Pressable>
              {touched.agreed && !agreed && (
                <MicroText className="text-destructive">Please accept the User Agreement and Privacy Policy</MicroText>
              )}

              {error && (
                <MicroText className="text-destructive">{error}</MicroText>
              )}

              <PrimaryButton
                label={loading ? 'Creating account…' : 'Create Account'}
                onPress={handleSignUp}
                disabled={!isFormValid}
                loading={loading}
                className="w-full"
                appearance="light"
              />
            </SectionCard>

            <View className="items-center">
              <GhostButton
                label="Already have an account? Sign in"
                onPress={() => router.replace('/(auth)/sign-in' as RelativePathString)}
                appearance="light"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
