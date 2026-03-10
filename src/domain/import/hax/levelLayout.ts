import type { HaxDocument } from '@/domain/import/hax/types';

export function formatHaxCheckpointReference(levelIndex: number, checkpointIndex: number): string {
  return `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1}`;
}

export function getHaxLevelStartIndexes(document: HaxDocument): number[] {
  if (document.checkpoints.length === 0) {
    return [];
  }

  const starts = document.checkpoints
    .map((checkpoint, checkpointIndex) => ({ checkpoint, checkpointIndex }))
    .filter(({ checkpoint, checkpointIndex }) => checkpointIndex === 0 || checkpoint.isLevelStart)
    .map(({ checkpointIndex }) => checkpointIndex);

  return starts.length === 0 || starts[0] !== 0 ? [0, ...starts] : starts;
}

export function getHaxAbsoluteCheckpointIndex(
  document: HaxDocument,
  levelIndex: number,
  checkpointIndex: number
): number | null {
  const starts = getHaxLevelStartIndexes(document);
  const levelStart = starts[levelIndex];
  if (levelStart === undefined) {
    return null;
  }

  const absoluteCheckpointIndex = levelStart + checkpointIndex;
  return absoluteCheckpointIndex < document.checkpoints.length ? absoluteCheckpointIndex + 1 : null;
}
