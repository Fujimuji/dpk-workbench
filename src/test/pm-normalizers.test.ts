import { describe, expect, it } from 'vitest';
import {
  createDefaultCheckpointConfig,
  normalizeAbilityList,
  normalizeDisableAbilities,
  normalizeNumberList,
  normalizeVectorList
} from '../domain/import/pm/normalizers';

describe('PM import normalizers', () => {
  it('creates the default checkpoint config with null-backed optional fields', () => {
    expect(createDefaultCheckpointConfig()).toEqual({
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
    });
  });

  it('normalizes singleton and array slot values', () => {
    expect(normalizeVectorList({ x: 1, y: 2, z: 3 }, 'vector')).toEqual([{ x: 1, y: 2, z: 3 }]);
    expect(normalizeNumberList(4, 'number')).toEqual([4]);
    expect(
      normalizeAbilityList(
        [
          [true, false, true],
          [false, true, false]
        ],
        'abilities'
      )
    ).toEqual([
      { seismicSlam: true, powerblock: false, rocketPunch: true },
      { seismicSlam: false, powerblock: true, rocketPunch: false }
    ]);
  });

  it('collapses empty disable-ability flags back to null', () => {
    expect(normalizeDisableAbilities([false, false, false], 'flags')).toBeNull();
    expect(normalizeDisableAbilities([true, false, false], 'flags')).toEqual({
      seismicSlam: true,
      powerblock: false,
      rocketPunch: false
    });
  });
});
