import { CHALLENGE_TAGS } from '@/data/activityCatalog';
import type { ActivityCategory, ActivityLog } from '@/data/types';

export interface VoiceActivityDraft {
  activityCategory: ActivityCategory | null;
  customLabel: string | null;
  durationMinutes: number | null;
  toleranceRating: ActivityLog['toleranceRating'] | null;
  challengeTagIds: string[];
  notes: string;
}

export interface VoiceActivityContext {
  activityCategory?: ActivityCategory;
  customLabel?: string;
  durationMinutes?: number;
}

const ACTIVITY_MAPPINGS: Array<{
  pattern: RegExp;
  category: ActivityCategory;
  label: string;
}> = [
  { pattern: /\bchem(?:istry)?\b/i, category: 'Class', label: 'Chemistry' },
  { pattern: /\benglish\b/i, category: 'Class', label: 'English' },
  { pattern: /\bmath(?:ematics)?\b/i, category: 'Class', label: 'Math' },
  { pattern: /\bhistory\b/i, category: 'Class', label: 'History' },
  { pattern: /\bstudy hall\b/i, category: 'Class', label: 'Study Hall' },
  { pattern: /\bhomework\b/i, category: 'Homework', label: 'Homework' },
  { pattern: /\b(?:read|reading)\b/i, category: 'Reading', label: 'Reading' },
  { pattern: /\b(?:screens?|computer|laptop)\b/i, category: 'Screens', label: 'Screen work' },
  { pattern: /\b(?:lunch|cafeteria)\b/i, category: 'Social activity', label: 'Lunch' },
  { pattern: /\b(?:walk|walking|walked)\b/i, category: 'Physical activity', label: 'Walking' },
  { pattern: /\b(?:bus|car ride|ride home|transportation)\b/i, category: 'Transportation', label: 'Transportation' },
  { pattern: /\b(?:crowded|busy environment|noisy environment)\b/i, category: 'Noise/busy environment', label: 'Busy environment' },
  { pattern: /\bclass\b/i, category: 'Class', label: 'Class' },
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
};

const TAG_PATTERNS: Record<string, RegExp[]> = {
  'ct-headache': [
    /\bheadache\b/g,
    /\bhead (?:hurts?|pain)\b/g,
    /\bpounding head\b/g,
  ],
  'ct-light': [
    /\blights?\b/g,
    /\b(?:too )?bright\b/g,
    /\bfluorescent lights?\b/g,
    /\blighting bothered me\b/g,
  ],
  'ct-noise': [
    /\bnoise\b/g,
    /\bnoisy\b/g,
    /\b(?:too )?loud\b/g,
    /\bloud (?:room|class)\b/g,
    /\bsounds? bothered me\b/g,
  ],
  'ct-screen': [
    /\bscreen glare\b/g,
    /\bglare\b/g,
    /\bscreen was bright\b/g,
    /\bbright screen\b/g,
  ],
  'ct-fatigue': [
    /\bfatigue\b/g,
    /\bfatigued\b/g,
    /\btired\b/g,
    /\bexhausted\b/g,
    /\bdrained\b/g,
    /\bworn out\b/g,
  ],
  'ct-conc': [
    /\bconcentration\b/g,
    /\bconcentrating\b/g,
    /\bfocus(?:ing)?\b/g,
    /\bcould(?:n t| not) focus\b/g,
    /\bhard to focus\b/g,
    /\btrouble concentrating\b/g,
  ],
  'ct-memory': [
    /\bmemory\b/g,
    /\bremembering\b/g,
    /\bforgot\b/g,
    /\bforgetful\b/g,
    /\btrouble remembering\b/g,
  ],
  'ct-dizziness': [
    /\bdizziness\b/g,
    /\bdizzy\b/g,
    /\blight ?headed\b/g,
    /\bwoozy\b/g,
  ],
  'ct-emotional': [
    /\bemotional stress\b/g,
    /\bstressed\b/g,
    /\boverwhelmed\b/g,
    /\banxious\b/g,
    /\bfrustrated\b/g,
  ],
  'ct-crowded': [
    /\bcrowded\b/g,
    /\bcrowd\b/g,
    /\bbusy (?:hallway|room)\b/g,
    /\blots of people\b/g,
  ],
};

function normalizeForMatching(text: string): string {
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNegated(text: string, matchIndex: number): boolean {
  const prefix = text.slice(0, matchIndex).trimEnd();
  return /\b(?:no|not|wasn t|were not|without)(?:\s+\w+){0,2}\s*$/.test(prefix);
}

function hasNonNegatedMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      if (!isNegated(text, match.index)) return true;
      match = pattern.exec(text);
    }
    return false;
  });
}

function parseExplicitNote(text: string): string {
  const match = text.match(/\b(?:add a note|my note is|note)\b\s*:?\s*(.+)$/i);
  return match?.[1].trim() ?? '';
}

function parseDuration(text: string): number | null {
  if (/\b(?:an? )?hour and a half\b/i.test(text)) return 90;
  if (/\b(?:half an hour|half hour)\b/i.test(text)) return 30;
  if (/\ban hour\b/i.test(text)) return 60;

  const numeric = text.match(/\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (numeric) {
    const value = Number(numeric[1]);
    return Math.round(/h(?:ou)?rs?/i.test(numeric[2]) ? value * 60 : value);
  }

  const word = text.match(/\b(one|two|three|four)\s+(minutes?|hours?)\b/i);
  if (word) {
    const value = NUMBER_WORDS[word[1].toLowerCase()];
    return /hour/i.test(word[2]) ? value * 60 : value;
  }

  return null;
}

function parseManageability(text: string): ActivityLog['toleranceRating'] | null {
  if (/\b(?:very|really|extremely) (?:difficult|hard)\b|\bcould(?:n't| not) manage(?: it)? well\b|\bcould barely manage\b/i.test(text)) return 1;
  if (/\bmanageable\b|\b(?:went|felt) (?:fine|okay|ok|well)\b|\b(?:pretty )?(?:good|easy)\b/i.test(text)) return 3;
  if (/\b(?:some difficulty|somewhat difficult|a little difficult|pretty difficult|kind of hard|some trouble|difficult|hard|challenging)\b/i.test(text)) return 2;
  return null;
}

/**
 * Converts a transcript into a conservative activity draft. Missing or
 * ambiguous details stay unset so the student can supply them during review.
 */
export function parseVoiceActivity(
  transcript: string,
  context: VoiceActivityContext = {},
): VoiceActivityDraft {
  const normalizedTranscript = normalizeForMatching(transcript);
  const activity = ACTIVITY_MAPPINGS.find(({ pattern }) => pattern.test(normalizedTranscript));
  const challengeTagIds = CHALLENGE_TAGS
    .filter((tag) => {
      const patterns = TAG_PATTERNS[tag.id];
      return patterns ? hasNonNegatedMatch(normalizedTranscript, patterns) : false;
    })
    .map((tag) => tag.id);

  return {
    activityCategory: context.activityCategory ?? activity?.category ?? null,
    customLabel: context.customLabel ?? activity?.label ?? null,
    durationMinutes: context.durationMinutes ?? parseDuration(transcript),
    toleranceRating: parseManageability(transcript),
    challengeTagIds,
    notes: parseExplicitNote(transcript),
  };
}
