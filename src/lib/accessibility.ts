/**
 * Accessibility helpers
 *
 * Combines device-level reduced-motion preference with the app-level
 * Low-Stimulation Mode preference. Both may be active independently.
 */

import { useReducedMotion } from 'react-native-reanimated';
import { useAppContext } from '@/context/AppContext';

export function useReducedExperience() {
  const { lowStimulationMode } = useAppContext();
  const reducedMotion = useReducedMotion();

  return {
    lowStimulationMode,
    reducedMotion,
    reduced: lowStimulationMode || reducedMotion,
  };
}

export function getReducedDuration(isReduced: boolean, base: number): number {
  return isReduced ? 0 : base;
}
