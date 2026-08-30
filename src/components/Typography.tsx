/**
 * ReEntry typography components.
 * Final editorial hierarchy: bold compact headings, readable body, uppercase micro labels.
 */

import { Text, type TextStyle } from 'react-native';
import React from 'react';
import { cn } from '@/lib/utils';

interface TextProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

/** Screen/section title — compact editorial heading, bold but not oversized */
export const HeadingText: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-2xl font-bold text-foreground leading-[1.1]', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

/** Section header — secondary heading */
export const SubheadingText: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-lg font-semibold text-foreground leading-tight', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

/** Card title — headline level */
export const CardTitleText: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-base font-semibold text-foreground', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

/** Regular body copy */
export const BodyText: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-base text-foreground leading-relaxed', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

/** Muted secondary / caption text */
export const LabelText: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-sm text-muted-foreground leading-snug', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

/** Smallest hint / timestamp text */
export const MicroText: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-xs text-muted-foreground leading-snug', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

/** Observational insight text — italicised body */
export const InsightText: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-base text-foreground leading-relaxed italic', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

/** Editorial uppercase label — for Today/Aug 28 style header */
export const EditorialLabel: React.FC<TextProps> = ({ children, className, style, numberOfLines }) => (
  <Text className={cn('text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase', className)} style={style} numberOfLines={numberOfLines}>
    {children}
  </Text>
);
