import { X } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { useThemeColors } from '@/lib/theme';

export function CloseButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="min-h-11 min-w-11 items-center justify-center rounded-full bg-transparent p-0 active:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      accessibilityRole="button"
      accessibilityLabel="Close"
      accessibilityState={{ disabled }}
      hitSlop={4}
    >
      <X size={20} color={theme.foreground} />
    </Pressable>
  );
}
