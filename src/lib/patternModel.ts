import { ACTIVITY_CATEGORIES, type ActivityLog } from '@/data/types';
import { CHALLENGE_TAGS } from '@/data/activityCatalog';

export type PatternDirection = 'higher-manageability' | 'lower-manageability';
export type PatternStrength = 'Limited' | 'Moderate' | 'Recurring';
export type PatternModelStatus =
  | 'ready'
  | 'insufficient-data'
  | 'insufficient-variability'
  | 'low-quality'
  | 'no-interpretable-patterns';

export interface PersonalizedPattern {
  id: string;
  title: string;
  description: string;
  direction: PatternDirection;
  feature: string;
  strength: PatternStrength;
  supportingActivityIds: string[];
  supportCount: number;
  coefficient: number;
}

export interface PatternModelMetadata {
  trainingRecords: number;
  validationRecords: number;
  distinctRatings: number;
  ratingStandardDeviation: number;
  validationMae: number | null;
  baselineMae: number | null;
  ridgeLambda: number;
}

export interface PatternModelResult {
  status: PatternModelStatus;
  patterns: PersonalizedPattern[];
  metadata: PatternModelMetadata;
}

interface FeatureDefinition {
  key: string;
  kind: 'intercept' | 'category' | 'tag' | 'duration' | 'order' | 'prior';
  label: string;
}

interface PreparedRecord {
  log: ActivityLog;
  features: number[];
  target: number;
}

const MIN_RECORDS = 10;
const MIN_RATING_SD = 0.35;
const MIN_SUPPORT = 3;
const RIDGE_LAMBDA = 4;
const MAX_VALIDATION_MAE = 0.9;
const MIN_COEFFICIENT = 0.12;

const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { key: 'intercept', kind: 'intercept', label: 'Baseline' },
  ...ACTIVITY_CATEGORIES.map((category) => ({
    key: `category:${category}`,
    kind: 'category' as const,
    label: category,
  })),
  ...CHALLENGE_TAGS.map((tag) => ({
    key: `tag:${tag.id}`,
    kind: 'tag' as const,
    label: tag.label,
  })),
  { key: 'duration', kind: 'duration', label: 'Longer activities' },
  { key: 'order', kind: 'order', label: 'Time in observation window' },
  { key: 'prior', kind: 'prior', label: 'Recent prior manageability' },
];

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  const center = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - center) ** 2)));
}

function daysBetween(first: string, current: string): number {
  const start = Date.parse(`${first}T00:00:00Z`);
  const end = Date.parse(`${current}T00:00:00Z`);
  return Math.max(0, (end - start) / 86_400_000);
}

function prepareRecords(logs: ActivityLog[]): PreparedRecord[] {
  const sorted = [...logs].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const firstDate = sorted[0]?.date ?? '1970-01-01';

  return sorted.map((log, index) => {
    const previousRating = index > 0 ? sorted[index - 1].toleranceRating : 2;
    const features = FEATURE_DEFINITIONS.map((definition) => {
      if (definition.kind === 'intercept') return 1;
      if (definition.kind === 'category') {
        return definition.label === log.activityCategory ? 1 : 0;
      }
      if (definition.kind === 'tag') {
        const tagId = definition.key.slice('tag:'.length);
        return log.challengeTagIds.includes(tagId) ? 1 : 0;
      }
      if (definition.kind === 'duration') {
        return (Math.min(Math.max(log.durationMinutes, 0), 240) - 30) / 60;
      }
      if (definition.kind === 'order') {
        return daysBetween(firstDate, log.date) / 14;
      }
      return previousRating - 2;
    });

    return { log, features, target: log.toleranceRating };
  });
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    for (let entry = column; entry <= size; entry += 1) augmented[column][entry] /= divisor;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let entry = column; entry <= size; entry += 1) {
        augmented[row][entry] -= factor * augmented[column][entry];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function fitRidge(records: PreparedRecord[], lambda: number): number[] | null {
  const featureCount = FEATURE_DEFINITIONS.length;
  const gram = Array.from({ length: featureCount }, () => Array(featureCount).fill(0) as number[]);
  const targetProjection = Array(featureCount).fill(0) as number[];

  for (const record of records) {
    for (let row = 0; row < featureCount; row += 1) {
      targetProjection[row] += record.features[row] * record.target;
      for (let column = 0; column < featureCount; column += 1) {
        gram[row][column] += record.features[row] * record.features[column];
      }
    }
  }
  for (let index = 1; index < featureCount; index += 1) gram[index][index] += lambda;
  return solveLinearSystem(gram, targetProjection);
}

function predict(features: number[], coefficients: number[]): number {
  const raw = features.reduce((sum, value, index) => sum + value * coefficients[index], 0);
  return Math.min(3, Math.max(1, raw));
}

function mae(records: PreparedRecord[], coefficients: number[]): number {
  return mean(records.map((record) => Math.abs(record.target - predict(record.features, coefficients))));
}

function supportsFeature(log: ActivityLog, definition: FeatureDefinition, medianDuration: number): boolean {
  if (definition.kind === 'category') return log.activityCategory === definition.label;
  if (definition.kind === 'tag') return log.challengeTagIds.includes(definition.key.slice('tag:'.length));
  if (definition.kind === 'duration') return log.durationMinutes >= medianDuration;
  return false;
}

function makePattern(
  definition: FeatureDefinition,
  coefficient: number,
  logs: ActivityLog[],
  overallMean: number,
  medianDuration: number,
): PersonalizedPattern | null {
  if (!['category', 'tag', 'duration'].includes(definition.kind)) return null;
  if (Math.abs(coefficient) < MIN_COEFFICIENT) return null;

  const direction: PatternDirection = coefficient > 0 ? 'higher-manageability' : 'lower-manageability';
  const featureLogs = logs.filter((log) => supportsFeature(log, definition, medianDuration));
  const supporting = featureLogs.filter((log) =>
    direction === 'higher-manageability'
      ? log.toleranceRating >= overallMean
      : log.toleranceRating <= overallMean,
  );
  if (featureLogs.length < MIN_SUPPORT || supporting.length < MIN_SUPPORT) return null;

  const association = direction === 'higher-manageability'
    ? 'higher reported manageability'
    : 'more reported difficulty';
  const subject = definition.kind === 'tag'
    ? `Activities tagged with ${definition.label}`
    : definition.kind === 'category'
      ? `${definition.label} activities`
      : 'Longer activities';
  const strength: PatternStrength = Math.abs(coefficient) >= 0.4
    ? 'Recurring'
    : Math.abs(coefficient) >= 0.22
      ? 'Moderate'
      : 'Limited';

  return {
    id: `ridge-${definition.key.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    title: `${subject} were associated with ${association} in your records.`,
    description: `This association was estimated from ${featureLogs.length} of your recorded activities while accounting for other recorded activity details.`,
    direction,
    feature: definition.key,
    strength,
    supportingActivityIds: supporting.map((log) => log.id),
    supportCount: supporting.length,
    coefficient,
  };
}

function metadata(
  records: number,
  distinctRatings: number,
  ratingSd: number,
  validationRecords = 0,
  validationMae: number | null = null,
  baselineMae: number | null = null,
): PatternModelMetadata {
  return { trainingRecords: records, validationRecords, distinctRatings, ratingStandardDeviation: ratingSd, validationMae, baselineMae, ridgeLambda: RIDGE_LAMBDA };
}

export function analyzePersonalizedPatterns(logs: ActivityLog[]): PatternModelResult {
  const records = prepareRecords(logs);
  const ratings = records.map((record) => record.target);
  const distinctRatings = new Set(ratings).size;
  const ratingSd = ratings.length > 0 ? standardDeviation(ratings) : 0;

  if (records.length < MIN_RECORDS) {
    return { status: 'insufficient-data', patterns: [], metadata: metadata(records.length, distinctRatings, ratingSd) };
  }
  if (distinctRatings < 2 || ratingSd < MIN_RATING_SD) {
    return { status: 'insufficient-variability', patterns: [], metadata: metadata(records.length, distinctRatings, ratingSd) };
  }

  const validationCount = Math.max(3, Math.ceil(records.length * 0.25));
  const training = records.slice(0, -validationCount);
  const validation = records.slice(-validationCount);
  const validationCoefficients = fitRidge(training, RIDGE_LAMBDA);
  if (!validationCoefficients) {
    return { status: 'low-quality', patterns: [], metadata: metadata(records.length, distinctRatings, ratingSd, validationCount) };
  }

  const validationMae = mae(validation, validationCoefficients);
  const trainingMean = mean(training.map((record) => record.target));
  const baselineMae = mean(validation.map((record) => Math.abs(record.target - trainingMean)));
  const qualityMetadata = metadata(records.length, distinctRatings, ratingSd, validationCount, validationMae, baselineMae);
  if (!Number.isFinite(validationMae) || validationMae > MAX_VALIDATION_MAE || validationMae > baselineMae + 0.15) {
    return { status: 'low-quality', patterns: [], metadata: qualityMetadata };
  }

  const coefficients = fitRidge(records, RIDGE_LAMBDA);
  if (!coefficients) return { status: 'low-quality', patterns: [], metadata: qualityMetadata };

  const sortedDurations = logs.map((log) => log.durationMinutes).sort((a, b) => a - b);
  const medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)];
  const overallMean = mean(ratings);
  const patterns = FEATURE_DEFINITIONS
    .map((definition, index) => makePattern(definition, coefficients[index], logs, overallMean, medianDuration))
    .filter((pattern): pattern is PersonalizedPattern => pattern !== null)
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
    .slice(0, 3);

  return {
    status: patterns.length > 0 ? 'ready' : 'no-interpretable-patterns',
    patterns,
    metadata: qualityMetadata,
  };
}
