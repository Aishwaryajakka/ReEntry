import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { AccentButton, GhostButton } from './Buttons';
import { MicroText, SubheadingText } from './Typography';
import { useReducedExperience } from '@/lib/accessibility';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ProfessionalFormSheet({
  visible,
  title,
  children,
  primaryLabel,
  onPrimaryPress,
  onClose,
  loading,
  primaryDisabled,
  error,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimaryPress: () => void;
  onClose: () => void;
  loading?: boolean;
  primaryDisabled?: boolean;
  error?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const { reduced } = useReducedExperience();
  const { isDark } = useTheme();
  const theme = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType={reduced ? 'fade' : 'slide'} onRequestClose={loading ? undefined : onClose} statusBarTranslucent>
      <View className={cn('flex-1 justify-end', isDark && 'dark')}>
        <Pressable className="absolute inset-0 bg-black/40" onPress={loading ? undefined : onClose} accessibilityRole="button" accessibilityLabel="Close form" />
        <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end" pointerEvents="box-none">
          <View className="max-h-[92%] w-full max-w-[680px] self-center rounded-t-3xl bg-card" style={{ paddingBottom: insets.bottom }}>
            <View className="flex-row items-center justify-between px-5 pt-5">
              <SubheadingText className="flex-1 pr-3">{title}</SubheadingText>
              <Pressable onPress={loading ? undefined : onClose} disabled={loading} className="min-h-11 min-w-11 items-center justify-center rounded-full active:bg-muted" accessibilityRole="button" accessibilityLabel="Close">
                <X size={20} color={theme.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerClassName="px-5 pb-5 pt-5" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
              {error ? <MicroText className="mt-3 text-destructive">{error}</MicroText> : null}
              <View className="mt-6">
                <AccentButton label={primaryLabel} onPress={onPrimaryPress} loading={loading} disabled={loading || primaryDisabled} className="w-full" />
                <GhostButton label="Cancel" onPress={onClose} disabled={loading} className="mt-3 w-full" />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
