import { createEmptyDraftVec3 } from '@/domain/model/draftVectors';
import { NEW_CHECKPOINT_VECTOR_OFFSET, type StructuralIndexRemap } from '@/domain/model/mutators/structure';
import type { DraftVec3, Vec3 } from '@/domain/model/types';
import { getHaxLevelStartIndexes } from '@/domain/import/hax/levelLayout';
import type { HaxCheckpoint, HaxDocument } from '@/domain/import/hax/types';
import type { EditorSelection } from '@/features/workspace/types';

interface IndexedHaxCheckpoint {
  checkpoint: HaxCheckpoint;
  oldCheckpointIndex: number | null;
  oldLevelIndex: number | null;
}

export interface HaxStructuralEditResult {
  document: HaxDocument;
  remap: StructuralIndexRemap;
  nextSelection: Extract<EditorSelection, { kind: 'start' | 'level' | 'checkpoint' }> | null;
}

function cloneVector(vector: DraftVec3): DraftVec3 {
  return { ...vector };
}

function splitDocument(document: HaxDocument): IndexedHaxCheckpoint[][] {
  const levelStarts = getHaxLevelStartIndexes(document);

  return levelStarts.map((startIndex, levelIndex) => {
    const nextStart = levelStarts[levelIndex + 1] ?? document.checkpoints.length;
    return document.checkpoints.slice(startIndex, nextStart).map((checkpoint, checkpointIndex) => ({
      checkpoint,
      oldCheckpointIndex: checkpointIndex,
      oldLevelIndex: levelIndex
    }));
  });
}

function createIdentityRemap(levels: IndexedHaxCheckpoint[][]): StructuralIndexRemap {
  return {
    levelIndexMap: levels.map((_, levelIndex) => levelIndex),
    checkpointIndexMapByLevel: Object.fromEntries(
      levels.map((level, levelIndex) => [levelIndex, level.map((_, checkpointIndex) => checkpointIndex)])
    )
  };
}

function createEditResult(
  spawn: HaxCheckpoint,
  levels: IndexedHaxCheckpoint[][],
  remap: StructuralIndexRemap,
  nextSelection: HaxStructuralEditResult['nextSelection']
): HaxStructuralEditResult {
  return {
    document: {
      format: 'hax',
      spawn,
      checkpoints: levels.flatMap((level) =>
        level.map((slot, checkpointIndex) => ({
          ...slot.checkpoint,
          isLevelStart: checkpointIndex === 0
        }))
      )
    },
    remap,
    nextSelection
  };
}

function buildRemap(oldLevels: IndexedHaxCheckpoint[][], nextLevels: IndexedHaxCheckpoint[][]): StructuralIndexRemap {
  const remap: StructuralIndexRemap = {
    levelIndexMap: oldLevels.map(() => null),
    checkpointIndexMapByLevel: Object.fromEntries(
      oldLevels.map((level, levelIndex) => [levelIndex, level.map(() => null)])
    )
  };

  nextLevels.forEach((level, nextLevelIndex) => {
    level.forEach((slot, nextCheckpointIndex) => {
      if (slot.oldLevelIndex === null || slot.oldCheckpointIndex === null) {
        return;
      }

      remap.levelIndexMap[slot.oldLevelIndex] = nextLevelIndex;
      remap.checkpointIndexMapByLevel[slot.oldLevelIndex][slot.oldCheckpointIndex] = nextCheckpointIndex;
    });
  });

  return remap;
}

function createInsertedCheckpoint(anchor: HaxCheckpoint): IndexedHaxCheckpoint {
  return {
    checkpoint: {
      ...anchor,
      position: createEmptyDraftVec3(),
      isLevelStart: false,
      prime: {
        rocketPunchDisabled: false,
        powerblockDisabled: false,
        seismicSlamDisabled: false,
        centerlessCheckpoint: false,
        effectLock: false,
        extraFactors: []
      },
      missions: [],
      abilityCount: null,
      teleport: null,
      timeTrialMinimum: null,
      effects: [],
      fakeUpper: false
    },
    oldCheckpointIndex: null,
    oldLevelIndex: null
  };
}

function getSelectionForCheckpoint(levelIndex: number, checkpointIndex: number): HaxStructuralEditResult['nextSelection'] {
  return { kind: 'checkpoint', levelIndex, checkpointIndex };
}

export function addHaxLevel(document: HaxDocument): HaxStructuralEditResult {
  return insertHaxLevelAt(document, getHaxLevelStartIndexes(document).length);
}

export function insertHaxLevelAt(document: HaxDocument, levelIndex: number): HaxStructuralEditResult {
  const oldLevels = splitDocument(document);
  const nextLevels = oldLevels.map((level) => [...level]);
  const insertIndex = Math.max(0, Math.min(levelIndex, nextLevels.length));
  const anchor =
    nextLevels.length === 0
      ? document.spawn
      : insertIndex < nextLevels.length
        ? nextLevels[insertIndex][0]?.checkpoint ?? document.spawn
        : nextLevels[insertIndex - 1]?.[nextLevels[insertIndex - 1].length - 1]?.checkpoint ?? document.spawn;

  nextLevels.splice(insertIndex, 0, [createInsertedCheckpoint(anchor)]);

  return createEditResult(document.spawn, nextLevels, buildRemap(oldLevels, nextLevels), { kind: 'level', levelIndex: insertIndex });
}

export function addHaxCheckpointAt(
  document: HaxDocument,
  levelIndex: number,
  anchorCheckpointIndex: number | null,
  placement: 'above' | 'below'
): HaxStructuralEditResult {
  const oldLevels = splitDocument(document);
  const nextLevels = oldLevels.map((level) => [...level]);
  const level = nextLevels[levelIndex];
  if (!level || level.length === 0) {
    return createEditResult(document.spawn, nextLevels, createIdentityRemap(oldLevels), null);
  }

  const safeAnchorIndex =
    anchorCheckpointIndex === null
      ? Math.max(0, level.length - 1)
      : Math.max(0, Math.min(anchorCheckpointIndex, level.length - 1));
  const insertIndex = placement === 'above' ? safeAnchorIndex : safeAnchorIndex + 1;
  level.splice(insertIndex, 0, createInsertedCheckpoint(level[safeAnchorIndex].checkpoint));

  return createEditResult(
    document.spawn,
    nextLevels,
    buildRemap(oldLevels, nextLevels),
    getSelectionForCheckpoint(levelIndex, insertIndex)
  );
}

export function moveHaxCheckpoint(
  document: HaxDocument,
  levelIndex: number,
  checkpointIndex: number,
  direction: 'up' | 'down'
): HaxStructuralEditResult {
  const oldLevels = splitDocument(document);
  const nextLevels = oldLevels.map((level) => [...level]);
  const level = nextLevels[levelIndex];
  if (!level) {
    return createEditResult(document.spawn, nextLevels, createIdentityRemap(oldLevels), null);
  }

  const targetIndex = direction === 'up' ? checkpointIndex - 1 : checkpointIndex + 1;
  if (
    checkpointIndex < 0 ||
    checkpointIndex >= level.length ||
    targetIndex < 0 ||
    targetIndex >= level.length
  ) {
    return createEditResult(
      document.spawn,
      nextLevels,
      createIdentityRemap(oldLevels),
      getSelectionForCheckpoint(levelIndex, Math.max(0, Math.min(checkpointIndex, level.length - 1)))
    );
  }

  [level[checkpointIndex], level[targetIndex]] = [level[targetIndex], level[checkpointIndex]];

  return createEditResult(
    document.spawn,
    nextLevels,
    buildRemap(oldLevels, nextLevels),
    getSelectionForCheckpoint(levelIndex, targetIndex)
  );
}

export function removeHaxCheckpoint(
  document: HaxDocument,
  levelIndex: number,
  checkpointIndex: number
): HaxStructuralEditResult {
  const oldLevels = splitDocument(document);
  const nextLevels = oldLevels.map((level) => [...level]);
  const level = nextLevels[levelIndex];
  if (!level || checkpointIndex < 0 || checkpointIndex >= level.length || level.length <= 1) {
    return createEditResult(
      document.spawn,
      nextLevels,
      createIdentityRemap(oldLevels),
      level ? getSelectionForCheckpoint(levelIndex, Math.max(0, Math.min(checkpointIndex, level.length - 1))) : null
    );
  }

  level.splice(checkpointIndex, 1);
  const nextCheckpointIndex = Math.min(checkpointIndex, level.length - 1);

  return createEditResult(
    document.spawn,
    nextLevels,
    buildRemap(oldLevels, nextLevels),
    getSelectionForCheckpoint(levelIndex, nextCheckpointIndex)
  );
}

export function moveHaxLevel(
  document: HaxDocument,
  levelIndex: number,
  direction: 'up' | 'down'
): HaxStructuralEditResult {
  const oldLevels = splitDocument(document);
  const nextLevels = oldLevels.map((level) => [...level]);
  const targetIndex = direction === 'up' ? levelIndex - 1 : levelIndex + 1;
  if (
    levelIndex < 0 ||
    levelIndex >= nextLevels.length ||
    targetIndex < 0 ||
    targetIndex >= nextLevels.length
  ) {
    return createEditResult(
      document.spawn,
      nextLevels,
      createIdentityRemap(oldLevels),
      nextLevels[levelIndex] ? { kind: 'level', levelIndex } : null
    );
  }

  [nextLevels[levelIndex], nextLevels[targetIndex]] = [nextLevels[targetIndex], nextLevels[levelIndex]];

  return createEditResult(
    document.spawn,
    nextLevels,
    buildRemap(oldLevels, nextLevels),
    { kind: 'level', levelIndex: targetIndex }
  );
}

export function removeHaxLevel(document: HaxDocument, levelIndex: number): HaxStructuralEditResult {
  const oldLevels = splitDocument(document);
  const nextLevels = oldLevels.map((level) => [...level]);
  if (levelIndex < 0 || levelIndex >= nextLevels.length) {
    return createEditResult(
      document.spawn,
      nextLevels,
      createIdentityRemap(oldLevels),
      nextLevels.length > 0 ? { kind: 'level', levelIndex: 0 } : { kind: 'start' }
    );
  }

  nextLevels.splice(levelIndex, 1);
  const nextSelection =
    nextLevels.length === 0
      ? ({ kind: 'start' } as const)
      : ({ kind: 'level', levelIndex: Math.min(levelIndex, nextLevels.length - 1) } as const);

  return createEditResult(document.spawn, nextLevels, buildRemap(oldLevels, nextLevels), nextSelection);
}

export function updateHaxSpawnPosition(document: HaxDocument, position: Vec3): HaxDocument {
  return {
    ...document,
    spawn: {
      ...document.spawn,
      position: cloneVector(position)
    }
  };
}
