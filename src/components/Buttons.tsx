/**
 * ReEntry button components.
 * Large comfortable touch targets (min 48pt height).
 * Explicit colors for both light and dark modes so enabled CTAs are never
 * faint/transparent floating text.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useReducedExperience } from '@/lib/accessibility';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  className?: string;
  style?: import('react-native').ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive';
  iconLeft?: ReactNode;
  accessibilityLabel?: string;
  /** Force a specific appearance regardless of the current theme. */
  appearance?: 'light' | 'dark';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function usePressScale(pressedOpacity: number) {
  const { reduced } = useReducedExperience();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: reduced ? [] : [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = () => {
    if (!reduced) scale.value = withTiming(0.98, { duration: 100 });
    opacity.value = withTiming(pressedOpacity, { duration: 100 });
  };
  const onPressOut = () => {
    if (!reduced) scale.value = withTiming(1, { duration: 120 });
    opacity.value = withTiming(1, { duration: 120 });
  };

  return { animatedStyle, onPressIn, onPressOut };
}

function BaseButton({
  label,
  onPress,
  className,
  style,
  disabled,
  loading,
  variant = 'primary',
  iconLeft,
  accessibilityLabel,
  appearance,
}: ButtonProps) {
  const { isDark } = useTheme();
  const isDarkMode = appearance === 'dark' ? true : appearance === 'light' ? false : isDark;

  const isPrimary = variant === 'primary';
  const isAccent = variant === 'accent';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isDestructive = variant === 'destructive';
  const isDisabled = disabled || loading;
  const pressedOpacity = isSecondary ? 0.9 : isPrimary ? 0.95 : 1;
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(pressedOpacity);

  const primaryBg = isDarkMode ? COLORS.brightYellow : COLORS.forest;
  const primaryText = isDarkMode ? COLORS.deepForest : COLORS.warmWhite;
  const accentBg = COLORS.brightYellow;
  const accentText = COLORS.deepForest;
  const destructiveBg = COLORS.rust;
  const destructiveText = COLORS.warmWhite;
  const disabledBg = COLORS.moon;
  const disabledText = COLORS.deepForest;
  const disabledBorder = COLORS.moss;

  const getBackgroundColor = () => {
    if (isDisabled) {
      if (isPrimary || isAccent || isDestructive) return disabledBg;
      return 'transparent';
    }
    if (isPrimary) return primaryBg;
    if (isAccent) return accentBg;
    if (isDestructive) return destructiveBg;
    return 'transparent';
  };

  const getTextColor = () => {
    if (isDisabled) {
      if (isPrimary || isAccent || isDestructive) return disabledText;
      return isDarkMode ? COLORS.moon : COLORS.moss;
    }
    if (isPrimary) return primaryText;
    if (isAccent) return accentText;
    if (isDestructive) return destructiveText;
    if (isSecondary || isGhost) return isDarkMode ? COLORS.warmWhite : COLORS.forest;
    return primaryText;
  };

  const getBorderColor = () => {
    if (isDisabled) {
      if (isSecondary || isGhost) return isDarkMode ? COLORS.moon : COLORS.moss;
      if (isPrimary || isAccent || isDestructive) return disabledBorder;
      return 'transparent';
    }
    if (isSecondary) return isDarkMode ? COLORS.warmWhite : COLORS.forest;
    if (isPrimary) return primaryBg;
    if (isAccent) return accentBg;
    if (isDestructive) return destructiveBg;
    return 'transparent';
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={cn(
        'flex-row items-center justify-center rounded-xl px-6 py-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
        className,
      )}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={[
        {
          minHeight: 52,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: isSecondary || isPrimary || isAccent ? 1 : 0,
        },
        animatedStyle,
        style,
      ]}
    >
      <View className="flex-row items-center gap-2">
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          iconLeft ?? null
        )}
        <Text
          className="font-semibold text-base"
          style={{ color: getTextColor() }}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

/** Primary — Forest fill (light) / warm turmeric-yellow fill (dark) */
export const PrimaryButton: React.FC<ButtonProps> = (props) => <BaseButton {...props} variant="primary" />;

/** Accent — Bright ReEntry Yellow, Forest text */
export const AccentButton: React.FC<ButtonProps> = (props) => <BaseButton {...props} variant="accent" />;

/** Secondary — Forest outline + Forest text */
export const SecondaryButton: React.FC<ButtonProps> = (props) => <BaseButton {...props} variant="secondary" />;

/** Ghost / text-only action */
export const GhostButton: React.FC<ButtonProps> = (props) => <BaseButton {...props} variant="ghost" />;

/** Destructive action — high-contrast rust fill */
export const DestructiveButton: React.FC<ButtonProps> = (props) => <BaseButton {...props} variant="destructive" />;

/** Convenience switch for components that want a single Button prop */
export const Button: React.FC<ButtonProps> = (props) => <BaseButton {...props} />;
