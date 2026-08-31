import { View } from 'react-native';
import { ReEntryWordmark } from './ReEntryWordmark';
import { cn } from '@/lib/utils';

/** Shared, centered brand header for authenticated student screens. */
export function StudentPageHeader({ className }: { className?: string }) {
  return (
    <View className={cn('mb-5 min-h-[72px] items-center justify-center', className)}>
      <ReEntryWordmark />
    </View>
  );
}
