/**
 * SectionCard — warm white surface card.
 * Uses card background from design tokens with a soft shadow.
 */

import { View } from 'react-native';
import React from 'react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  style?: object;
}

export const SectionCard: React.FC<SectionCardProps> = ({ children, className, style }) => {
  const { lowStimulationMode } = useAppContext();

  return (
    <View
      className={cn('bg-card rounded-2xl p-4 border border-border', className)}
      style={{
        borderCurve: 'continuous',
        shadowColor: lowStimulationMode ? 'transparent' : '#344431',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: lowStimulationMode ? 0 : 0.04,
        shadowRadius: lowStimulationMode ? 0 : 5,
        elevation: lowStimulationMode ? 0 : 1,
        ...style,
      } as object}
    >
      {children}
    </View>
  );
};
