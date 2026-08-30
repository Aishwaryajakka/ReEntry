import type { ActivityLog, ChallengeTag } from './types';

/** Runtime activity metadata shared by logging and observational summaries. */
export const CHALLENGE_TAGS: ChallengeTag[] = [
  { id: 'ct-headache', label: 'Headache', category: 'physical' },
  { id: 'ct-light', label: 'Light', category: 'environmental' },
  { id: 'ct-noise', label: 'Noise', category: 'environmental' },
  { id: 'ct-screen', label: 'Screen glare', category: 'environmental' },
  { id: 'ct-fatigue', label: 'Fatigue', category: 'physical' },
  { id: 'ct-conc', label: 'Concentration', category: 'cognitive' },
  { id: 'ct-memory', label: 'Memory', category: 'cognitive' },
  { id: 'ct-dizziness', label: 'Dizziness', category: 'physical' },
  { id: 'ct-emotional', label: 'Emotional stress', category: 'social' },
  {
    id: 'ct-crowded',
    label: 'Crowded environment',
    category: 'environmental',
  },
];

export const TOLERANCE_LABELS: Record<ActivityLog['toleranceRating'], string> = {
  1: 'Very difficult',
  2: 'Some difficulty',
  3: 'Manageable',
};
