import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

// ReEntry final visual system — hex values for inline style use
export const COLORS = {
  forest: '#344431',
  deepForest: '#263528',
  moss: '#71856A',
  brightYellow: '#F6C945',
  warmGold: '#F4B93F',
  rust: '#A5572F',
  turmeric: '#D29443',
  linen: '#DDD1BF',
  moon: '#E8E3D9',
  warmWhite: '#FFFDF7',
} as const;

// Colors mirror global.css variables exactly
export const THEME = {
  light: {
    background: 'hsl(48 100% 99%)',
    foreground: 'hsl(122 14% 23%)',
    card: 'hsl(44 33% 96%)',
    cardForeground: 'hsl(122 14% 23%)',
    popover: 'hsl(44 33% 96%)',
    popoverForeground: 'hsl(122 14% 23%)',
    primary: 'hsl(122 14% 23%)',
    primaryForeground: 'hsl(48 100% 99%)',
    secondary: 'hsl(111 10% 47%)',
    secondaryForeground: 'hsl(48 100% 99%)',
    muted: 'hsl(40 18% 87%)',
    mutedForeground: 'hsl(111 10% 40%)',
    accent: 'hsl(45 90% 62%)',
    accentForeground: 'hsl(122 14% 23%)',
    destructive: 'hsl(22 57% 40%)',
    destructiveForeground: 'hsl(48 100% 99%)',
    border: 'hsl(38 24% 82%)',
    input: 'hsl(38 24% 82%)',
    ring: 'hsl(122 14% 23%)',
    radius: '0.75rem',
  },
  dark: {
    background: 'hsl(122 14% 15%)',
    foreground: 'hsl(48 100% 99%)',
    card: 'hsl(122 14% 18%)',
    cardForeground: 'hsl(48 100% 99%)',
    popover: 'hsl(122 14% 18%)',
    popoverForeground: 'hsl(48 100% 99%)',
    primary: 'hsl(48 100% 99%)',
    primaryForeground: 'hsl(122 14% 23%)',
    secondary: 'hsl(111 10% 35%)',
    secondaryForeground: 'hsl(48 100% 99%)',
    muted: 'hsl(122 14% 22%)',
    mutedForeground: 'hsl(111 10% 60%)',
    accent: 'hsl(45 90% 62%)',
    accentForeground: 'hsl(122 14% 23%)',
    destructive: 'hsl(22 57% 45%)',
    destructiveForeground: 'hsl(48 100% 99%)',
    border: 'hsl(122 14% 26%)',
    input: 'hsl(122 14% 26%)',
    ring: 'hsl(48 100% 99%)',
    radius: '0.75rem',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};

import { useTheme } from '@/context/ThemeContext';

export interface ThemeColors {
  foreground: string;
  foregroundMuted: string;
  background: string;
  card: string;
  border: string;
  accent: string;
  accentForeground: string;
  moss: string;
  mossLight: string;
  mossDark: string;
  deepForest: string;
  linen: string;
  moon: string;
  warmWhite: string;
  rust: string;
  turmeric: string;
}

export function useThemeColors(): ThemeColors {
  const { isDark } = useTheme();
  return {
    foreground: isDark ? COLORS.warmWhite : COLORS.forest,
    foregroundMuted: isDark ? COLORS.linen : COLORS.moss,
    background: isDark ? COLORS.deepForest : COLORS.warmWhite,
    card: isDark ? COLORS.deepForest : COLORS.moon,
    border: isDark ? COLORS.forest : COLORS.linen,
    accent: COLORS.brightYellow,
    accentForeground: COLORS.forest,
    moss: isDark ? '#8A9E84' : COLORS.moss,
    mossLight: isDark ? '#2D3A2C' : COLORS.linen,
    mossDark: isDark ? COLORS.forest : COLORS.deepForest,
    deepForest: COLORS.deepForest,
    linen: COLORS.linen,
    moon: COLORS.moon,
    warmWhite: COLORS.warmWhite,
    rust: COLORS.rust,
    turmeric: COLORS.turmeric,
  };
}
