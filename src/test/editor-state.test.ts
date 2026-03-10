import { describe, expect, it } from 'vitest';
import {
  addAbilityOrb,
  addLavaOrb,
  addTouchOrb,
  allAbilitiesEnabled,
  allBotAbilitiesEnabled,
  removeBot,
  setBot,
  updateCheckpointConfig,
  updateCheckpointVector,
  updateCheckpointRadius,
  updateLevelMetadata,
  updateStartVector
} from '../domain/model/mutators';
import type { MomentumMapModel } from '../domain/model/types';
import { checkpoint, checkpointConfig } from './model-helpers';

function createMap(): MomentumMapModel {
  return {
    start: { x: 0, y: 0, z: 0 },
    levels: [
      {
        name: 'Level 1',
        color: 'Aqua',
        checkpoints: [
          checkpoint({ x: 1, y: 1, z: 1 }),
          checkpoint({ x: 2, y: 2, z: 2 })
        ],
        checkpointConfigs: [checkpointConfig()]
      }
    ]
  };
}

describe('editor-state helpers', () => {
  it('updates the start vector immutably', () => {
    const map = createMap();
    const next = updateStartVector(map, { x: 9, y: 8, z: 7 });

    expect(next.start).toEqual({ x: 9, y: 8, z: 7 });
    expect(map.start).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('updates level metadata and checkpoint vectors', () => {
    const map = createMap();
    const withLevel = updateLevelMetadata(map, 0, { name: 'Edited', color: 'Blue' });
    const withVector = updateCheckpointVector(withLevel, 0, 0, { x: 4, y: 5, z: 6 });
    const withRadius = updateCheckpointRadius(withVector, 0, 0, 4);

    expect(withLevel.levels[0].name).toBe('Edited');
    expect(withLevel.levels[0].color).toBe('Blue');
    expect(withVector.levels[0].checkpoints[0]).toEqual(checkpoint({ x: 4, y: 5, z: 6 }));
    expect(withRadius.levels[0].checkpoints[0]).toEqual(checkpoint({ x: 4, y: 5, z: 6 }, 4));
    expect(map.levels[0].checkpoints[0]).toEqual(checkpoint({ x: 1, y: 1, z: 1 }));
  });

  it('updates PM-only checkpoint settings', () => {
    const map = createMap();
    const next = updateCheckpointConfig(map, 0, 0, {
      liquid: true,
      timeLimit: 5,
      minimumSpeed: 7,
      heightGoal: 9
    });

    expect(next.levels[0].checkpointConfigs[0]).toMatchObject({
      liquid: true,
      timeLimit: 5,
      minimumSpeed: 7,
      heightGoal: 9
    });
    expect(map.levels[0].checkpointConfigs[0].liquid).toBe(false);
  });

  it('adds checkpoint entities immutably', () => {
    const map = createMap();
    const withTouch = addTouchOrb(map, 0, 0, { position: { x: 3, y: 3, z: 3 }, radius: 1 });
    const withAbility = addAbilityOrb(withTouch, 0, 0, {
      position: { x: 4, y: 4, z: 4 },
      radius: 1.5,
      abilities: allAbilitiesEnabled()
    });
    const withLava = addLavaOrb(withAbility, 0, 0, { position: { x: 5, y: 5, z: 5 }, radius: 2 });

    expect(withTouch.levels[0].checkpointConfigs[0].touchOrbs).toHaveLength(1);
    expect(withAbility.levels[0].checkpointConfigs[0].abilityOrbs).toHaveLength(1);
    expect(withLava.levels[0].checkpointConfigs[0].lava).toHaveLength(1);
    expect(map.levels[0].checkpointConfigs[0].touchOrbs).toBeNull();
  });

  it('sets and removes the bot immutably', () => {
    const map = createMap();
    const withBot = setBot(map, 0, 0, {
      position: { x: 6, y: 6, z: 6 },
      validAbilities: allBotAbilitiesEnabled()
    });
    const withoutBot = removeBot(withBot, 0, 0);

    expect(withBot.levels[0].checkpointConfigs[0].bot?.position).toEqual({ x: 6, y: 6, z: 6 });
    expect(withoutBot.levels[0].checkpointConfigs[0].bot).toBeNull();
    expect(map.levels[0].checkpointConfigs[0].bot).toBeNull();
  });
});
