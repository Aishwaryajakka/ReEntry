/** ReEntry full logo with tagline for large introductory surfaces. */

import { View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

// eslint-disable-next-line image-import/no-missing-image-import
import LogoImage from '../../assets/logo.png';
// eslint-disable-next-line image-import/no-missing-image-import
import LogoDarkImage from '../../assets/logo-dark.png';

export function ReEntryFullLogo({ className }: { className?: string }) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const logoWidth = Math.min(width * 0.75, 320);

  return (
    <View className={cn('items-center', className)}>
      <Image
        source={isDark ? LogoDarkImage : LogoImage}
        contentFit="contain"
        style={{ width: logoWidth, height: logoWidth / 2 }}
        accessibilityLabel="ReEntry logo"
      />
    </View>
  );
}
