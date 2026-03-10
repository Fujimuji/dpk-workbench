import { describe, expect, it } from 'vitest';
import { convertHaxToMomentum } from '../domain/import/hax/convertHaxToMomentum';
import type { HaxDocument, HaxSourceData } from '../domain/import/hax/types';
import { checkpoint } from './model-helpers';

function vector(seed: number) {
  return { x: seed, y: seed + 0.5, z: seed + 1 };
}

function createHaxDocument(): HaxDocument {
  return {
    format: 'hax',
    spawn: {
      position: vector(0),
      radius: 1,
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
        position: vector(1),
        radius: 1,
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
        timeTrialMinimum: 12.5,
        effects: [],
        fakeUpper: false
      },
      {
        position: vector(2),
        radius: 1,
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
      }
    ]
  };
}

describe('convertHaxToMomentum', () => {
  it('falls back to a single level when there are no level markers', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2)],
      checkpointPrimes: [11, null, null],
      checkpointEffects: [[], [], []]
    };

    const result = convertHaxToMomentum(source);

    expect(result.model.start).toEqual(vector(0));
    expect(result.model.levels).toHaveLength(1);
    expect(result.model.levels[0].checkpoints).toEqual([checkpoint(vector(1)), checkpoint(vector(2))]);
    expect(result.model.levels[0].checkpointConfigs).toHaveLength(1);
  });

  it('splits multiple levels and injects a missing first marker', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2), vector(3), vector(4)],
      checkpointPrimes: [11, null, null, 13, null],
      checkpointEffects: [[], [], [], [], []]
    };

    const result = convertHaxToMomentum(source);

    expect(result.model.levels).toHaveLength(2);
    expect(result.warnings.some((warning) => warning.code === 'missing_first_level_marker')).toBe(true);
    expect(result.model.levels[0].checkpoints).toEqual([checkpoint(vector(1)), checkpoint(vector(2))]);
    expect(result.model.levels[1].checkpoints).toEqual([checkpoint(vector(3)), checkpoint(vector(4))]);
  });

  it('initializes PM-only checkpoint fields with editable defaults', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2)],
      checkpointPrimes: [11, null, null],
      checkpointEffects: [[], [], []]
    };

    const result = convertHaxToMomentum(source);
    const config = result.model.levels[0].checkpointConfigs[0];

    expect(config.liquid).toBe(false);
    expect(config.timeLimit).toBeNull();
    expect(config.minimumSpeed).toBeNull();
    expect(config.heightGoal).toBeNull();
  });

  it('maps Hax time trial minimum to PM time limit when converting a Hax document', () => {
    const result = convertHaxToMomentum(createHaxDocument());

    expect(result.model.levels[0].checkpoints).toEqual([checkpoint(vector(1), 1), checkpoint(vector(2), 1)]);
    expect(result.model.levels[0].checkpointConfigs[0]?.timeLimit).toBe(12.5);
  });

  it('converts paired Hax portals into PM portal pairs without unsupported warnings', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2)],
      checkpointPrimes: [11, null, null],
      checkpointEffects: [
        [],
        [
          { position: vector(10), radius: 1.1, type: 5, payload: 0 },
          { position: vector(11), radius: 1.1, type: 6, payload: 0 }
        ],
        []
      ]
    };

    const result = convertHaxToMomentum(source);

    expect(result.model.levels[0].checkpointConfigs[0].portals).toEqual([
      {
        entry: vector(10),
        exit: vector(11)
      }
    ]);
    expect(result.warnings.map((warning) => warning.code)).not.toContain('unsupported_effect_removed');
  });

  it('converts Hax impulse bounces and warns on unsupported bounce variants', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2), vector(3)],
      checkpointPrimes: [11, null, null, null],
      checkpointEffects: [
        [],
        [
          {
            position: vector(10),
            radius: 2,
            type: 11,
            payload: { direction: { x: 0, y: 1, z: 0 }, power: 15 }
          }
        ],
        [
          {
            position: vector(20),
            radius: 2,
            type: 11,
            payload: { direction: { x: 0, y: 1, z: 0 }, power: 0.016 }
          },
          {
            position: vector(21),
            radius: 2,
            type: 11,
            payload: { direction: { x: 0, y: 1, z: 0 }, power: 0 }
          }
        ],
        []
      ]
    };

    const result = convertHaxToMomentum(source);

    expect(result.model.levels[0].checkpointConfigs[0].impulses).toEqual([
      {
        position: vector(10),
        direction: { x: 0, y: 1, z: 0 },
        speed: 15
      }
    ]);
    expect(result.model.levels[0].checkpointConfigs[1].impulses).toBeNull();
    expect(result.warnings.filter((warning) => warning.code === 'unsupported_bounce_variant')).toHaveLength(2);
  });

  it('maps supported effects and drops unsupported ones with warnings', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2), vector(3)],
      checkpointPrimes: [11, 30, null, null],
      checkpointEffects: [
        [],
        [
          { position: vector(10), radius: -1.5, type: 2, payload: -6 },
          { position: vector(20), radius: 2, type: 1, payload: 1 },
          { position: vector(30), radius: 0, type: 10, payload: 2 },
          { position: vector(40), radius: 3, type: 7, payload: 0 }
        ],
        [],
        []
      ]
    };

    const result = convertHaxToMomentum(source);
    const config = result.model.levels[0].checkpointConfigs[0];

    expect(config.disableAbilities).toEqual({
      seismicSlam: true,
      powerblock: true,
      rocketPunch: true
    });
    expect(config.abilityOrbs?.[0].abilities).toEqual({
      seismicSlam: true,
      powerblock: false,
      rocketPunch: false
    });
    expect(config.lava?.[0]).toEqual({
      position: vector(20),
      radius: 2
    });
    expect(config.bot?.validAbilities).toEqual({
      primaryFire: true,
      seismicSlam: true,
      rocketPunch: false
    });
    expect(result.warnings.map((warning) => warning.code)).toContain('unsupported_effect_removed');
    expect(result.warnings.map((warning) => warning.code)).toContain('lightshaft_lost');
    expect(result.warnings.find((warning) => warning.code === 'unsupported_effect_removed')?.targetKind).toBe(
      'checkpoint'
    );
    expect(result.warnings.find((warning) => warning.code === 'lightshaft_lost')?.targetKind).toBe('abilityOrb');
  });

  it('converts ability effects with prime 11 into touch orbs', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2)],
      checkpointPrimes: [11, null, null],
      checkpointEffects: [
        [],
        [{ position: vector(10), radius: -2, type: 2, payload: 11 }],
        []
      ]
    };

    const result = convertHaxToMomentum(source);
    const config = result.model.levels[0].checkpointConfigs[0];

    expect(config.touchOrbs).toEqual([{ position: vector(10), radius: 2 }]);
    expect(config.abilityOrbs).toBeNull();
    expect(result.warnings.filter((warning) => warning.code === 'lightshaft_lost')).toHaveLength(1);
    expect(result.warnings.find((warning) => warning.code === 'lightshaft_lost')?.targetKind).toBe('touchOrb');
  });

  it('converts all death effects on a checkpoint into lava orbs', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2)],
      checkpointPrimes: [11, null, null],
      checkpointEffects: [
        [],
        [
          { position: vector(10), radius: -2, type: 1, payload: 1 },
          { position: vector(20), radius: 3, type: 1, payload: 1 }
        ],
        []
      ]
    };

    const result = convertHaxToMomentum(source);
    const config = result.model.levels[0].checkpointConfigs[0];

    expect(config.lava).toEqual([
      { position: vector(10), radius: 2 },
      { position: vector(20), radius: 3 }
    ]);
    expect(result.warnings.filter((warning) => warning.code === 'lightshaft_lost')).toHaveLength(1);
    expect(result.warnings.find((warning) => warning.code === 'lightshaft_lost')?.targetKind).toBe('lavaOrb');
  });

  it('groups unique unsupported effect families on the same checkpoint into one warning', () => {
    const source: HaxSourceData = {
      checkpointPositions: [vector(0), vector(1), vector(2)],
      checkpointPrimes: [11, null, null],
      checkpointEffects: [
        [],
        [
          { position: vector(10), radius: 1, type: 3, payload: 0 },
          { position: vector(11), radius: 1, type: 8, payload: 0 },
          { position: vector(12), radius: 1, type: 9, payload: 0 },
          { position: vector(13), radius: 1, type: 11, payload: 0 }
        ],
        []
      ]
    };

    const result = convertHaxToMomentum(source);
    const unsupportedWarnings = result.warnings.filter((warning) => warning.code === 'unsupported_effect_removed');
    const payloadWarnings = result.warnings.filter((warning) => warning.code === 'unsupported_payload');

    expect(unsupportedWarnings).toHaveLength(1);
    expect(unsupportedWarnings[0].message).toBe(
      "This checkpoint had permeation and zipline effect(s), which aren't supported in Project Momentum and were removed."
    );
    expect(payloadWarnings).toHaveLength(1);
  });
});
