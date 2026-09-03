import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useReducedExperience } from '@/lib/accessibility';
import { cn } from '@/lib/utils';
import { AccentButton } from './Buttons';
import { CloseButton } from './CloseButton';
import { MicroText, SubheadingText } from './Typography';

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

  return (
    <Modal visible={visible} transparent animationType={reduced ? 'fade' : 'slide'} onRequestClose={loading ? undefined : onClose} statusBarTranslucent>
      <View className={cn('flex-1 justify-end', isDark && 'dark')}>
        <Pressable className="absolute inset-0 bg-black/40" onPress={loading ? undefined : onClose} accessibilityRole="button" accessibilityLabel="Close form" />
        <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end" pointerEvents="box-none">
          <View
            className="w-full max-w-[680px] self-center rounded-t-3xl bg-card"
            style={{ maxHeight: '86%', paddingBottom: insets.bottom }}
          >
            <View className="flex-row items-center justify-between px-5 pt-5">
              <SubheadingText className="flex-1 pr-3">{title}</SubheadingText>
              <CloseButton onPress={onClose} disabled={loading} />
            </View>
            <ScrollView className="flex-shrink" contentContainerClassName="px-5 pb-6 pt-5" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            <View className="border-t border-border px-5 py-3">
              {error ? <MicroText className="mb-3 text-destructive">{error}</MicroText> : null}
              <AccentButton label={primaryLabel} onPress={onPrimaryPress} loading={loading} disabled={loading || primaryDisabled} className="w-full" />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
