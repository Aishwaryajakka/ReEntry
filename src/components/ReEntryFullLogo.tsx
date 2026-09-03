/** ReEntry full logo with tagline for large introductory surfaces. */

import { Image } from 'expo-image';
import { useWindowDimensions, View } from 'react-native';

import { cn } from '@/lib/utils';

// eslint-disable-next-line image-import/no-missing-image-import
import LogoImage from '../../assets/logo.png';

export function ReEntryFullLogo({ className, maxWidth = 320 }: { className?: string; maxWidth?: number }) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.75, maxWidth);

  return (
    <View className={cn('items-center', className)}>
      <Image
        source={LogoImage}
        contentFit="contain"
        style={{ width: logoWidth, height: logoWidth / 2 }}
        accessibilityLabel="ReEntry logo"
      />
    </View>
  );
}
