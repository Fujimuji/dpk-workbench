import { describe, expect, it } from 'vitest';
import {
  addHaxCheckpointAt,
  addHaxLevel,
  moveHaxLevel,
  removeHaxCheckpoint
} from '../domain/import/hax/structureMutators';
import type { HaxDocument } from '../domain/import/hax/types';

function vector(seed: number) {
  return { x: seed, y: seed + 1, z: seed + 2 };
}

function createDocument(): HaxDocument {
  return {
    format: 'hax',
    spawn: {
      position: vector(0),
      radius: 2,
      viewAngle: 0,
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
    checkpoints: [
      {
        position: vector(10),
        radius: 2,
        viewAngle: 0,
        isLevelStart: true,
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
      {
        position: vector(20),
        radius: 2,
        viewAngle: 0,
        isLevelStart: true,
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
      }
    ]
  };
}

describe('Hax structure mutators', () => {
  it('adds a first derived level to an empty document', () => {
    const result = addHaxLevel({
      ...createDocument(),
      checkpoints: []
    });

    expect(result.document.checkpoints).toHaveLength(1);
    expect(result.document.checkpoints[0]?.isLevelStart).toBe(true);
    expect(result.nextSelection).toEqual({ kind: 'level', levelIndex: 0 });
  });

  it('turns an inserted checkpoint above the first checkpoint into the level start', () => {
    const result = addHaxCheckpointAt(createDocument(), 0, 0, 'above');

    expect(result.document.checkpoints).toHaveLength(3);
    expect(result.document.checkpoints[0]?.isLevelStart).toBe(true);
    expect(result.document.checkpoints[1]?.isLevelStart).toBe(false);
    expect(result.nextSelection).toEqual({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 });
  });

  it('does not remove the final checkpoint in a Hax level', () => {
    const result = removeHaxCheckpoint(createDocument(), 0, 0);

    expect(result.document).toEqual(createDocument());
    expect(result.nextSelection).toEqual({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 });
  });

  it('swaps whole Hax levels and keeps level starts normalized', () => {
    const result = moveHaxLevel(createDocument(), 0, 'down');

    expect(result.document.checkpoints[0]?.position).toEqual(vector(20));
    expect(result.document.checkpoints[0]?.isLevelStart).toBe(true);
    expect(result.document.checkpoints[1]?.isLevelStart).toBe(true);
    expect(result.remap.levelIndexMap).toEqual([1, 0]);
  });
});
