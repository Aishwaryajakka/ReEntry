/** ReEntry full logo with tagline for large introductory surfaces. */

import { View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

import { cn } from '@/lib/utils';

// eslint-disable-next-line image-import/no-missing-image-import
import LogoImage from '../../assets/logo.png';

export function ReEntryFullLogo({ className }: { className?: string }) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.75, 320);

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
