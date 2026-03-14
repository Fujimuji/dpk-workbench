import type { CheckpointConfig, CheckpointMarker, Vec3 } from '../domain/model/types';

export function checkpoint(position: Vec3, radius = 2): CheckpointMarker {
  return { position, radius };
}

export function checkpointConfig(overrides: Partial<CheckpointConfig> = {}): CheckpointConfig {
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
    portal: null,
    ...overrides
  };
}
