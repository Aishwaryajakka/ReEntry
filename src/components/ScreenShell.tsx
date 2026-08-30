/**
 * ScreenShell — safe-area-aware screen container.
 * Compact mobile density: 16-20px gutters, moderate top padding.
 * Light variant: Warm White background.
 * Dark variant: Deep Forest background for Journey.
 */

import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import React from 'react';
import { cn } from '@/lib/utils';

interface ScreenShellProps {
  children: React.ReactNode;
  /** Disable scroll for screens that manage their own scroll */
  noScroll?: boolean;
  className?: string;
  /** Use Deep Forest dark theme (Journey) */
  dark?: boolean;
  /** Force the light palette on this screen (e.g., auth screens) */
  light?: boolean;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({ children, noScroll, className, dark, light }) => {
  const bg = dark ? 'bg-deepForest' : light ? 'bg-warmWhite' : 'bg-background';

  if (noScroll) {
    return (
      <SafeAreaView className={cn('flex-1', bg, dark && 'dark', light && 'light')} edges={['top', 'left', 'right']}>
        <View className={cn('flex-1 w-full max-w-[960px] self-center', className)}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={cn('flex-1', bg, dark && 'dark', light && 'light')} edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName={cn('w-full max-w-[960px] self-center px-5 pt-6 pb-24', className)}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};
