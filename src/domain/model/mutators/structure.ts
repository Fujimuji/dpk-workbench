import { createEmptyDraftVec3 } from '@/domain/model/draftVectors';
import type { CheckpointConfig, CheckpointMarker, DraftVec3, MomentumMapModel, Vec3 } from '@/domain/model/types';
import { getDefaultLevelColor, getNextAuthoredLevelName } from '@/shared/workshop/colors';

export interface StructuralIndexRemap {
  levelIndexMap: Array<number | null>;
  checkpointIndexMapByLevel: Record<number, Array<number | null>>;
}

export type StructuralSelectionTarget =
  | { kind: 'start' }
  | { kind: 'level'; levelIndex: number }
  | { kind: 'checkpoint'; levelIndex: number; checkpointIndex: number }
  | { kind: 'touchOrb'; levelIndex: number; checkpointIndex: number; orbIndex: number }
  | { kind: 'abilityOrb'; levelIndex: number; checkpointIndex: number; orbIndex: number }
  | { kind: 'lavaOrb'; levelIndex: number; checkpointIndex: number; orbIndex: number }
  | { kind: 'bot'; levelIndex: number; checkpointIndex: number }
  | { kind: 'impulse'; levelIndex: number; checkpointIndex: number; impulseIndex: number }
  | { kind: 'portal'; levelIndex: number; checkpointIndex: number; portalIndex: number };

export interface StructuralEditResult {
  map: MomentumMapModel;
  remap: StructuralIndexRemap;
  nextSelection: StructuralSelectionTarget | null;
}

export const NEW_CHECKPOINT_VECTOR_OFFSET: Vec3 = {
  x: 128,
  y: 0,
  z: 0
};

function createDefaultCheckpointConfig(): CheckpointConfig {
  return {
    liquid: false,
    timeLimit: null,
    minimumSpeed: null,
    heightGoal: null,
    disableAbilities: null,
    touchOrbs: null,
    abilityOrbs: null,
    lava: null,
    bot: null,
    impulses: null,
    portals: null
  };
}

function createCheckpoint(position: DraftVec3, radius = 2): CheckpointMarker {
  return { position: { ...position }, radius };
}

function normalizeCheckpointMarker(checkpoint: CheckpointMarker | Vec3): CheckpointMarker {
  return 'position' in checkpoint ? checkpoint : createCheckpoint(checkpoint);
}

function createBlankCheckpoint(radius = 2): CheckpointMarker {
  return createCheckpoint(createEmptyDraftVec3(), radius);
}

function identityCheckpointMap(count: number): Array<number | null> {
  return Array.from({ length: count }, (_, index) => index);
}

function createBaseRemap(map: MomentumMapModel): StructuralIndexRemap {
  return {
    levelIndexMap: map.levels.map((_, index) => index),
    checkpointIndexMapByLevel: Object.fromEntries(
      map.levels.map((level, levelIndex) => [levelIndex, identityCheckpointMap(level.checkpoints.length)])
    )
  };
}

function createEmptyLevel(map: MomentumMapModel, levelIndex: number) {
  return {
    name: getNextAuthoredLevelName(map.levels.map((level) => level.name)),
    color: getDefaultLevelColor(levelIndex),
    checkpoints: [] as CheckpointMarker[],
    checkpointConfigs: [] as CheckpointConfig[]
  };
}

function createResult(
  map: MomentumMapModel,
  remap: StructuralIndexRemap,
  nextSelection: StructuralSelectionTarget | null
): StructuralEditResult {
  return {
    map,
    remap,
    nextSelection
  };
}

function insertLevelAtIndex(map: MomentumMapModel, targetIndex: number): StructuralEditResult {
  const insertIndex = Math.max(0, Math.min(targetIndex, map.levels.length));
  const nextLevels = [...map.levels];
  nextLevels.splice(insertIndex, 0, createEmptyLevel(map, insertIndex));

  const remap: StructuralIndexRemap = {
    levelIndexMap: map.levels.map((_, index) => (index >= insertIndex ? index + 1 : index)),
    checkpointIndexMapByLevel: Object.fromEntries(
      map.levels.map((level, levelIndex) => [levelIndex, identityCheckpointMap(level.checkpoints.length)])
    )
  };

  return createResult(
    {
      ...map,
      levels: nextLevels
    },
    remap,
    { kind: 'level', levelIndex: insertIndex }
  );
}

export function createEmptyMap(): MomentumMapModel {
  return {
    start: { x: 0, y: 0, z: 0 },
    levels: []
  };
}

export function addLevel(map: MomentumMapModel): StructuralEditResult {
  return insertLevelAtIndex(map, map.levels.length);
}

export function insertLevelAt(map: MomentumMapModel, levelIndex: number): StructuralEditResult {
  return insertLevelAtIndex(map, levelIndex);
}

export function removeLevel(map: MomentumMapModel, levelIndex: number): StructuralEditResult {
  if (levelIndex < 0 || levelIndex >= map.levels.length) {
    return createResult(map, createBaseRemap(map), map.levels.length > 0 ? { kind: 'level', levelIndex: 0 } : { kind: 'start' });
  }

  const nextLevels = map.levels.filter((_, index) => index !== levelIndex);
  const remap: StructuralIndexRemap = {
    levelIndexMap: map.levels.map((_, index) => {
      if (index === levelIndex) {
        return null;
      }

      return index > levelIndex ? index - 1 : index;
    }),
    checkpointIndexMapByLevel: Object.fromEntries(
      map.levels.map((level, oldLevelIndex) => [
        oldLevelIndex,
        identityCheckpointMap(level.checkpoints.length)
      ])
    )
  };
  const nextSelection =
    nextLevels.length === 0
      ? ({ kind: 'start' } as const)
      : ({
          kind: 'level',
          levelIndex: Math.min(levelIndex, nextLevels.length - 1)
        } as const);

  return createResult(
    {
      ...map,
      levels: nextLevels
    },
    remap,
    nextSelection
  );
}

export function moveLevel(
  map: MomentumMapModel,
  levelIndex: number,
  direction: 'up' | 'down'
): StructuralEditResult {
  const targetIndex = direction === 'up' ? levelIndex - 1 : levelIndex + 1;
  if (
    levelIndex < 0 ||
    levelIndex >= map.levels.length ||
    targetIndex < 0 ||
    targetIndex >= map.levels.length
  ) {
    return createResult(
      map,
      createBaseRemap(map),
      levelIndex >= 0 && levelIndex < map.levels.length ? { kind: 'level', levelIndex } : null
    );
  }

  const nextLevels = [...map.levels];
  [nextLevels[levelIndex], nextLevels[targetIndex]] = [nextLevels[targetIndex], nextLevels[levelIndex]];

  const remap = createBaseRemap(map);
  remap.levelIndexMap[levelIndex] = targetIndex;
  remap.levelIndexMap[targetIndex] = levelIndex;

  return createResult(
    {
      ...map,
      levels: nextLevels
    },
    remap,
    { kind: 'level', levelIndex: targetIndex }
  );
}

export function addCheckpointAt(
  map: MomentumMapModel,
  levelIndex: number,
  anchorCheckpointIndex: number | null,
  placement: 'above' | 'below'
): StructuralEditResult {
  const level = map.levels[levelIndex];
  if (!level) {
    return createResult(map, createBaseRemap(map), null);
  }

  const remap = createBaseRemap(map);
  const nextLevels = [...map.levels];

  if (level.checkpoints.length === 0) {
    const firstCheckpoint = createBlankCheckpoint();
    const finishCheckpoint = createBlankCheckpoint(firstCheckpoint.radius);
    nextLevels[levelIndex] = {
      ...level,
      checkpoints: [firstCheckpoint, finishCheckpoint],
      checkpointConfigs: [createDefaultCheckpointConfig()]
    };
    remap.checkpointIndexMapByLevel[levelIndex] = [];

    return createResult(
      {
        ...map,
        levels: nextLevels
      },
      remap,
      { kind: 'checkpoint', levelIndex, checkpointIndex: 0 }
    );
  }

  const finishIndex = level.checkpoints.length - 1;
  const safeAnchorIndex =
    anchorCheckpointIndex === null
      ? finishIndex
      : Math.max(0, Math.min(anchorCheckpointIndex, finishIndex));

  if (placement === 'below' && safeAnchorIndex >= finishIndex) {
    const finishCheckpoint = normalizeCheckpointMarker(level.checkpoints[finishIndex]);
    nextLevels[levelIndex] = {
      ...level,
      checkpoints: [
        ...level.checkpoints,
        createBlankCheckpoint(finishCheckpoint.radius)
      ],
      checkpointConfigs: [...level.checkpointConfigs, createDefaultCheckpointConfig()]
    };
    remap.checkpointIndexMapByLevel[levelIndex] = identityCheckpointMap(level.checkpoints.length);

    return createResult(
      {
        ...map,
        levels: nextLevels
      },
      remap,
      { kind: 'checkpoint', levelIndex, checkpointIndex: finishIndex }
    );
  }

  const insertIndex = placement === 'above' ? safeAnchorIndex : safeAnchorIndex + 1;
  const anchorCheckpoint = normalizeCheckpointMarker(level.checkpoints[safeAnchorIndex]);
  const nextCheckpoints = [...level.checkpoints];
  nextCheckpoints.splice(insertIndex, 0, createBlankCheckpoint(anchorCheckpoint.radius));
  const nextConfigs = [...level.checkpointConfigs];
  nextConfigs.splice(insertIndex, 0, createDefaultCheckpointConfig());
  remap.checkpointIndexMapByLevel[levelIndex] = level.checkpoints.map((_, checkpointIndex) =>
    checkpointIndex >= insertIndex ? checkpointIndex + 1 : checkpointIndex
  );
  nextLevels[levelIndex] = {
    ...level,
    checkpoints: nextCheckpoints,
    checkpointConfigs: nextConfigs
  };

  return createResult(
    {
      ...map,
      levels: nextLevels
    },
    remap,
    { kind: 'checkpoint', levelIndex, checkpointIndex: insertIndex }
  );
}

export function removeCheckpoint(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number
): StructuralEditResult {
  const level = map.levels[levelIndex];
  if (!level || checkpointIndex < 0 || checkpointIndex >= level.checkpoints.length) {
    return createResult(map, createBaseRemap(map), null);
  }

  const finishIndex = level.checkpoints.length - 1;
  if (checkpointIndex >= finishIndex) {
    return createResult(map, createBaseRemap(map), { kind: 'checkpoint', levelIndex, checkpointIndex: finishIndex });
  }

  const nextLevels = [...map.levels];
  nextLevels[levelIndex] = {
    ...level,
    checkpoints: level.checkpoints.filter((_, index) => index !== checkpointIndex),
    checkpointConfigs: level.checkpointConfigs.filter((_, index) => index !== checkpointIndex)
  };

  const remap = createBaseRemap(map);
  remap.checkpointIndexMapByLevel[levelIndex] = level.checkpoints.map((_, index) => {
    if (index === checkpointIndex) {
      return null;
    }

    return index > checkpointIndex ? index - 1 : index;
  });

  const nextCheckpointIndex = Math.min(checkpointIndex, nextLevels[levelIndex].checkpoints.length - 1);

  return createResult(
    {
      ...map,
      levels: nextLevels
    },
    remap,
    { kind: 'checkpoint', levelIndex, checkpointIndex: nextCheckpointIndex }
  );
}

export function moveCheckpoint(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  direction: 'up' | 'down'
): StructuralEditResult {
  const level = map.levels[levelIndex];
  if (!level) {
    return createResult(map, createBaseRemap(map), null);
  }

  const playableCount = level.checkpointConfigs.length;
  const targetIndex = direction === 'up' ? checkpointIndex - 1 : checkpointIndex + 1;
  if (
    checkpointIndex < 0 ||
    checkpointIndex >= playableCount ||
    targetIndex < 0 ||
    targetIndex >= playableCount
  ) {
    return createResult(map, createBaseRemap(map), { kind: 'checkpoint', levelIndex, checkpointIndex });
  }

  const nextCheckpoints = [...level.checkpoints];
  [nextCheckpoints[checkpointIndex], nextCheckpoints[targetIndex]] = [nextCheckpoints[targetIndex], nextCheckpoints[checkpointIndex]];
  const nextConfigs = [...level.checkpointConfigs];
  [nextConfigs[checkpointIndex], nextConfigs[targetIndex]] = [nextConfigs[targetIndex], nextConfigs[checkpointIndex]];

  const nextLevels = [...map.levels];
  nextLevels[levelIndex] = {
    ...level,
    checkpoints: nextCheckpoints,
    checkpointConfigs: nextConfigs
  };

  const remap = createBaseRemap(map);
  remap.checkpointIndexMapByLevel[levelIndex] = level.checkpoints.map((_, index) => {
    if (index === checkpointIndex) {
      return targetIndex;
    }
    if (index === targetIndex) {
      return checkpointIndex;
    }
    return index;
  });

  return createResult(
    {
      ...map,
      levels: nextLevels
    },
    remap,
    { kind: 'checkpoint', levelIndex, checkpointIndex: targetIndex }
  );
}
