import type { CheckpointConfig, MomentumMapModel } from '@/domain/model/types';
import { updateLevel } from '@/domain/model/mutators/level';

export function updateCheckpointConfigEntry(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  update: (config: CheckpointConfig) => CheckpointConfig
): MomentumMapModel {
  return updateLevel(map, levelIndex, (level) => {
    if (checkpointIndex < 0 || checkpointIndex >= level.checkpointConfigs.length) {
      return level;
    }

    return {
      ...level,
      checkpointConfigs: level.checkpointConfigs.map((config, index) =>
        index === checkpointIndex ? update(config) : config
      )
    };
  });
}

export function updateCheckpointConfig(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  patch: Partial<CheckpointConfig>
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    ...patch
  }));
}
