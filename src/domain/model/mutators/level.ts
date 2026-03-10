import type { DraftVec3, MomentumMapModel, Vec3, WorkshopColor } from '@/domain/model/types';

export function updateLevel(
  map: MomentumMapModel,
  levelIndex: number,
  update: (level: MomentumMapModel['levels'][number]) => MomentumMapModel['levels'][number]
): MomentumMapModel {
  return {
    ...map,
    levels: map.levels.map((level, index) => (index === levelIndex ? update(level) : level))
  };
}

export function updateStartVector(map: MomentumMapModel, vector: Vec3): MomentumMapModel {
  return {
    ...map,
    start: vector
  };
}

export function updateLevelMetadata(
  map: MomentumMapModel,
  levelIndex: number,
  patch: { name?: string; color?: WorkshopColor }
): MomentumMapModel {
  return updateLevel(map, levelIndex, (level) => ({
    ...level,
    name: patch.name ?? level.name,
    color: patch.color ?? level.color
  }));
}

export function updateCheckpointVector(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  vector: DraftVec3
): MomentumMapModel {
  return updateLevel(map, levelIndex, (level) => ({
    ...level,
    checkpoints: level.checkpoints.map((checkpoint, index) =>
      index === checkpointIndex
        ? ('position' in checkpoint ? { ...checkpoint, position: vector } : { position: vector, radius: 2 })
        : checkpoint
    )
  }));
}

export function updateCheckpointRadius(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  radius: number
): MomentumMapModel {
  return updateLevel(map, levelIndex, (level) => ({
    ...level,
    checkpoints: level.checkpoints.map((checkpoint, index) =>
      index === checkpointIndex
        ? ('position' in checkpoint ? { ...checkpoint, radius } : { position: checkpoint, radius })
        : checkpoint
    )
  }));
}
