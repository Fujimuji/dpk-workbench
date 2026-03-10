import type { DraftVec3, Vec3 } from '@/domain/model/types';
import { AppError } from '@/shared/errors/AppError';

export function createEmptyDraftVec3(): DraftVec3 {
  return {
    x: null,
    y: null,
    z: null
  };
}

export function isDraftVec3(value: unknown): value is DraftVec3 {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    ('x' in value) &&
    ('y' in value) &&
    ('z' in value)
  );
}

export function isCompleteDraftVec3(vector: DraftVec3): vector is Vec3 {
  return vector.x !== null && vector.y !== null && vector.z !== null;
}

export function getMissingDraftVec3Axes(vector: DraftVec3): Array<keyof DraftVec3> {
  return (['x', 'y', 'z'] as const).filter((axis) => vector[axis] === null);
}

export function formatMissingDraftVec3Axes(vector: DraftVec3): string {
  const missingAxes = getMissingDraftVec3Axes(vector);
  return missingAxes.map((axis) => axis.toUpperCase()).join(', ');
}

export function formatMissingDraftVec3Coordinates(vector: DraftVec3): string {
  const missingAxes = getMissingDraftVec3Axes(vector).map((axis) => axis.toUpperCase());
  if (missingAxes.length === 0) {
    return 'position coordinates';
  }

  if (missingAxes.length === 1) {
    return `${missingAxes[0]} coordinate`;
  }

  if (missingAxes.length === 2) {
    return `${missingAxes[0]} and ${missingAxes[1]} coordinates`;
  }

  return `${missingAxes.slice(0, -1).join(', ')}, and ${missingAxes[missingAxes.length - 1]} coordinates`;
}

export function formatIncompleteDraftVec3Message(subject: string, vector: DraftVec3): string {
  return `${subject} needs ${formatMissingDraftVec3Coordinates(vector)}.`;
}

export function requireCompleteDraftVec3(vector: DraftVec3, label: string): Vec3 {
  if (isCompleteDraftVec3(vector)) {
    return vector;
  }

  throw new AppError(
    'incomplete_position',
    `${label} is missing ${formatMissingDraftVec3Axes(vector)}.`
  );
}
