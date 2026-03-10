import { describe, expect, it } from 'vitest';
import {
  addCheckpointAt,
  addLevel,
  createEmptyMap,
  moveCheckpoint,
  moveLevel,
  removeCheckpoint,
  removeLevel
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
          checkpoint({ x: 0, y: 0, z: 0 }),
          checkpoint({ x: 128, y: 0, z: 0 }),
          checkpoint({ x: 256, y: 0, z: 0 })
        ],
        checkpointConfigs: [checkpointConfig(), checkpointConfig()]
      }
    ]
  };
}

describe('structure mutators', () => {
  it('creates an empty draft map', () => {
    expect(createEmptyMap()).toEqual({
      start: { x: 0, y: 0, z: 0 },
      levels: []
    });
  });

  it('adds an empty level', () => {
    const result = addLevel(createEmptyMap());

    expect(result.map.levels).toHaveLength(1);
    expect(result.map.levels[0]).toMatchObject({
      name: 'Warmup',
      color: 'Aqua',
      checkpoints: [],
      checkpointConfigs: []
    });
    expect(result.nextSelection).toEqual({ kind: 'level', levelIndex: 0 });
  });

  it('uses deterministic placeholder names for newly created authored levels', () => {
    const first = addLevel(createEmptyMap()).map;
    const second = addLevel(first).map;
    const third = addLevel(second).map;

    expect(third.levels.map((level) => level.name)).toEqual(['Warmup', 'Launch', 'Transfer']);
  });

  it('skips existing authored names and suffixes after the base pool is exhausted', () => {
    const seededMap: MomentumMapModel = {
      start: { x: 0, y: 0, z: 0 },
      levels: [
        { name: 'Warmup', color: 'Aqua', checkpoints: [], checkpointConfigs: [] },
        { name: 'Launch', color: 'Blue', checkpoints: [], checkpointConfigs: [] },
        { name: 'Transfer', color: 'Green', checkpoints: [], checkpointConfigs: [] },
        { name: 'Climb', color: 'Orange', checkpoints: [], checkpointConfigs: [] },
        { name: 'Control', color: 'Purple', checkpoints: [], checkpointConfigs: [] },
        { name: 'Precision', color: 'Red', checkpoints: [], checkpointConfigs: [] },
        { name: 'Traverse', color: 'Sky Blue', checkpoints: [], checkpointConfigs: [] },
        { name: 'Finale', color: 'Turquoise', checkpoints: [], checkpointConfigs: [] },
        { name: 'Warmup 2', color: 'White', checkpoints: [], checkpointConfigs: [] }
      ]
    };

    expect(addLevel(seededMap).map.levels.at(-1)?.name).toBe('Launch 2');
  });

  it('creates a playable checkpoint and finish in an empty level', () => {
    const base = addLevel(createEmptyMap()).map;
    const result = addCheckpointAt(base, 0, null, 'below');

    expect(result.map.levels[0].checkpoints).toHaveLength(2);
    expect(result.map.levels[0].checkpointConfigs).toHaveLength(1);
    expect(result.nextSelection).toEqual({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 });
  });

  it('turns the old finish into a playable checkpoint when adding below finish', () => {
    const result = addCheckpointAt(createMap(), 0, 2, 'below');

    expect(result.map.levels[0].checkpoints).toHaveLength(4);
    expect(result.map.levels[0].checkpointConfigs).toHaveLength(3);
    expect(result.nextSelection).toEqual({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 2 });
    expect(result.remap.checkpointIndexMapByLevel[0]).toEqual([0, 1, 2]);
  });

  it('does not move the finish checkpoint down', () => {
    const map = createMap();
    const result = moveCheckpoint(map, 0, 2, 'down');

    expect(result.map).toEqual(map);
    expect(result.nextSelection).toEqual({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 2 });
  });

  it('removes only non-finish checkpoints and keeps the finish', () => {
    const result = removeCheckpoint(createMap(), 0, 1);

    expect(result.map.levels[0].checkpoints).toHaveLength(2);
    expect(result.map.levels[0].checkpointConfigs).toHaveLength(1);
    expect(result.remap.checkpointIndexMapByLevel[0]).toEqual([0, null, 1]);
    expect(result.nextSelection).toEqual({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 1 });
  });

  it('can remove the final remaining level', () => {
    const result = removeLevel(createMap(), 0);

    expect(result.map.levels).toEqual([]);
    expect(result.nextSelection).toEqual({ kind: 'start' });
  });

  it('reorders levels and checkpoints', () => {
    const levelMoved = moveLevel(
      {
        ...createMap(),
        levels: [
          createMap().levels[0],
          {
            ...createMap().levels[0],
            name: 'Level 2',
            color: 'Blue'
          }
        ]
      },
      0,
      'down'
    );

    expect(levelMoved.map.levels[0].name).toBe('Level 2');
    expect(levelMoved.map.levels[1].name).toBe('Level 1');
    expect(levelMoved.remap.levelIndexMap).toEqual([1, 0]);

    const checkpointMoved = moveCheckpoint(createMap(), 0, 0, 'down');
    expect(checkpointMoved.remap.checkpointIndexMapByLevel[0]).toEqual([1, 0, 2]);
    expect(checkpointMoved.nextSelection).toEqual({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 1 });
  });
});
