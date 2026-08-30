/**
 * DividerLine — subtle token-driven horizontal separator.
 */

import { View } from 'react-native';
import React from 'react';
import { cn } from '@/lib/utils';

interface DividerLineProps {
  className?: string;
}

export const DividerLine: React.FC<DividerLineProps> = ({ className }) => (
  <View className={cn('h-px bg-border my-4', className)} />
);
