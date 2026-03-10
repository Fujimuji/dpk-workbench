import { describe, expect, it } from 'vitest';
import { MOMENTUM_EXAMPLE_INPUT } from '../app/examples';
import { parseMomentumWorkshop } from '../domain/import/pm/parseMomentumWorkshop';
import { checkpointConfig } from './model-helpers';

describe('parseMomentumWorkshop', () => {
  it('imports the bundled PM example into a valid editable model', () => {
    const model = parseMomentumWorkshop(MOMENTUM_EXAMPLE_INPUT);

    expect(model.start).toEqual({ x: 48.391, y: 9.911, z: 41.151 });
    expect(model.levels).toHaveLength(3);
    expect(model.levels[0].name).toBe('Level 1');
    expect(model.levels[0].color).toBe('Aqua');
    expect(model.levels[1].name).toBe('Level 2');
    expect(model.levels[1].color).toBe('Purple');
    expect(model.levels[2].name).toBe('Level 3');
    expect(model.levels[2].color).toBe('Orange');
  });

  it('imports checkpoint vectors and aligned checkpoint configs', () => {
    const model = parseMomentumWorkshop(MOMENTUM_EXAMPLE_INPUT);

    expect(model.levels[0].checkpoints).toHaveLength(3);
    expect(model.levels[0].checkpoints[0]).toEqual({
      position: { x: 53.192, y: 3.626, z: 33.323 },
      radius: 2
    });
    expect(model.levels[0].checkpointConfigs).toHaveLength(2);
    expect(model.levels[1].checkpoints).toHaveLength(3);
    expect(model.levels[1].checkpointConfigs).toHaveLength(2);
    expect(model.levels[2].checkpoints).toHaveLength(2);
    expect(model.levels[2].checkpointConfigs).toHaveLength(1);
  });

  it('imports checkpoint sizes, impulses, portals, and direction aliases', () => {
    const model = parseMomentumWorkshop(MOMENTUM_EXAMPLE_INPUT);

    expect(model.levels[0].checkpoints.map((entry) => entry.radius)).toEqual([2, 2, 2.7]);
    expect(model.levels[0].checkpointConfigs[0].impulses).toEqual([
      {
        position: { x: 43.44, y: 4.88, z: 14.36 },
        direction: { x: 0, y: 1, z: 0 },
        speed: 16
      },
      {
        position: { x: 43.44, y: 4.88, z: 14.36 },
        direction: { x: 0, y: -1, z: 1 },
        speed: 25
      }
    ]);
    expect(model.levels[0].checkpointConfigs[1].impulses).toEqual([
      {
        position: { x: 50.11, y: 7.89, z: 10.2 },
        direction: { x: 0, y: 1, z: 0 },
        speed: 18
      }
    ]);
    expect(model.levels[0].checkpointConfigs[1].portals).toEqual([
      {
        entry: { x: 53.9, y: 10, z: 20.7 },
        exit: { x: 50.239, y: 12.502, z: 2.673 }
      },
      {
        entry: { x: 53.9, y: 10, z: 20.7 },
        exit: { x: 50.239, y: 12.502, z: 2.673 }
      }
    ]);
    expect(model.levels[2].checkpointConfigs[0].impulses).toBeNull();
    expect(model.levels[2].checkpointConfigs[0].portals).toBeNull();
  });

  it('imports PM-only checkpoint settings', () => {
    const model = parseMomentumWorkshop(MOMENTUM_EXAMPLE_INPUT);

    expect(model.levels[0].checkpointConfigs[0].liquid).toBe(false);
    expect(model.levels[0].checkpointConfigs[1].liquid).toBe(true);
    expect(model.levels[0].checkpointConfigs[1].minimumSpeed).toBe(6);
    expect(model.levels[1].checkpointConfigs[0].heightGoal).toBe(20);
    expect(model.levels[1].checkpointConfigs[1].timeLimit).toBe(6);
  });

  it('imports disable abilities using PM ordering', () => {
    const model = parseMomentumWorkshop(MOMENTUM_EXAMPLE_INPUT);

    expect(model.levels[1].checkpointConfigs[1].disableAbilities).toEqual({
      seismicSlam: false,
      powerblock: true,
      rocketPunch: true
    });
  });

  it('imports touch, ability, lava, and bot entities', () => {
    const model = parseMomentumWorkshop(MOMENTUM_EXAMPLE_INPUT);

    expect(model.levels[0].checkpointConfigs[0].touchOrbs).toEqual([
      {
        position: { x: 53.9, y: 10, z: 20.7 },
        radius: 0.5
      }
    ]);
    expect(model.levels[0].checkpointConfigs[1].touchOrbs).toEqual([
      {
        position: { x: 51.04, y: 7, z: -8.8 },
        radius: 1
      }
    ]);

    expect(model.levels[1].checkpointConfigs[1].abilityOrbs).toEqual([
      {
        position: { x: 53.23, y: 13, z: 9.7 },
        radius: 1,
        abilities: { seismicSlam: true, powerblock: true, rocketPunch: true }
      }
    ]);

    expect(model.levels[1].checkpointConfigs[1].lava).toEqual([
      {
        position: { x: 34.46, y: 4.8, z: 25.771 },
        radius: 2
      }
    ]);

    expect(model.levels[2].checkpointConfigs[0].bot).toEqual({
      position: { x: 42.577, y: 3.837, z: 31.078 },
      validAbilities: { primaryFire: true, seismicSlam: false, rocketPunch: true }
    });
  });

  it('fills defaults when optional PM fields are missing or Null', () => {
    const model = parseMomentumWorkshop(`actions{
      Global.start = Vector(0, 0, 0);
      Global.c_levelData[0] = Array(Custom String("Solo"), Color(Blue));
      Global.c_checkpointVectors[0] = Array(Vector(1, 2, 3), Vector(4, 5, 6));
      Global.c_checkpointTimeLimits[0] = Null;
      Global.c_checkpointTouchOrbLocations[0] = Null;
    }`);

    expect(model.levels[0].checkpointConfigs).toEqual([
      checkpointConfig()
    ]);
  });

  it('defaults checkpoint sizes to 2 when c_checkpointSizes is missing', () => {
    const model = parseMomentumWorkshop(`actions{
      Global.start = Vector(0, 0, 0);
      Global.c_levelData[0] = Array(Custom String("Solo"), Color(Blue));
      Global.c_checkpointVectors[0] = Array(Vector(1, 2, 3), Vector(4, 5, 6));
    }`);

    expect(model.levels[0].checkpoints).toEqual([
      { position: { x: 1, y: 2, z: 3 }, radius: 2 },
      { position: { x: 4, y: 5, z: 6 }, radius: 2 }
    ]);
  });

  it('clamps imported height goals below 1 and minimum speeds below 0', () => {
    const model = parseMomentumWorkshop(`actions{
      Global.start = Vector(0, 0, 0);
      Global.c_levelData[0] = Array(Custom String("Clamp"), Color(Green));
      Global.c_checkpointVectors[0] = Array(Vector(0, 0, 0), Vector(1, 1, 1));
      Global.c_checkpointHeightGoals[0] = Array(-4);
      Global.c_checkpointMinimumSpeeds[0] = Array(-2);
    }`);

    expect(model.levels[0].checkpointConfigs[0].heightGoal).toBe(1);
    expect(model.levels[0].checkpointConfigs[0].minimumSpeed).toBe(0);
  });

  it('ignores unrelated Workshop actions around the supported PM subset', () => {
    const model = parseMomentumWorkshop(`variables{global: 0:start} actions{
      Wait(1);
      Global.start = Vector(0, 0, 0);
      Create Effect(All Players(All Teams), Ring, Color(White), Global.start, 1, Visible To);
      Global.c_levelData[0] = Array(Custom String("Extra"), Color(Red));
      Global.c_checkpointVectors[0] = Array(Vector(0, 0, 0));
      Destroy Effect(Last Created Entity);
    }`);

    expect(model.levels).toHaveLength(1);
    expect(model.levels[0].name).toBe('Extra');
    expect(model.levels[0].color).toBe('Red');
  });
});
