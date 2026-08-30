/**
 * ReEntry wordmark — renders the provided typographic logo.
 * Falls back to a clean text wordmark on dark surfaces where the
 * forest-green logo would not be visible.
 */

import { View, Text, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/theme';
import { useTheme } from '@/context/ThemeContext';

// eslint-disable-next-line image-import/no-missing-image-import
import LogoImage from '../../assets/logo.png';

const LOGO_SOURCE = LogoImage;

interface ReEntryWordmarkProps {
  /** Brand text color when the text fallback is used. */
  color?: string;
  /** Accent color for the text fallback path detail. */
  accentColor?: string;
  className?: string;
  /** Optional tagline shown beneath the wordmark. */
  tagline?: string;
  /** Force a specific logo treatment. Auth screens should always pass "light". */
  appearance?: 'light' | 'dark';
}

export function ReEntryWordmark({
  color = COLORS.warmWhite,
  accentColor = COLORS.turmeric,
  className,
  tagline,
  appearance,
}: ReEntryWordmarkProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const isDarkMode = appearance === 'light' ? false : appearance === 'dark' ? true : isDark;
  const logoWidth = Math.min(width * 0.75, 320);

  return (
    <View className={cn('items-center', className)}>
      {!isDarkMode ? (
        <Image
          source={LOGO_SOURCE}
          contentFit="contain"
          style={{ width: logoWidth, height: logoWidth / 3.6 }}
          accessibilityLabel="ReEntry wordmark"
        />
      ) : (
        <View className="relative items-center">
          <Text className="text-3xl font-bold tracking-tight" style={{ color }}>
            ReEntry
          </Text>
          <View
            className="mt-1 rounded-full"
            style={{
              width: 56,
              height: 3,
              backgroundColor: accentColor,
              transform: [{ skewX: '-12deg' }],
            }}
          />
          <View
            className="absolute rounded-full"
            style={{
              right: -8,
              bottom: 2,
              width: 6,
              height: 6,
              backgroundColor: accentColor,
            }}
          />
        </View>
      )}
      {tagline ? (
        <Text className="text-sm text-center mt-3 text-muted-foreground leading-relaxed">
          {tagline}
        </Text>
      ) : null}
    </View>
  );
}
