import { describe, expect, it } from 'vitest';
import {
  decodeHaxEffectPrimeState,
  encodeHaxEffectPrimeState,
  getHaxEffectPrimeFields,
  updateHaxEffectPrimeFlag
} from '../domain/import/hax/effectPrimePayloads';

describe('Hax effect prime payload helpers', () => {
  it('exposes named ability-effect switches instead of a raw payload value', () => {
    const state = decodeHaxEffectPrimeState(2, -66);

    expect(getHaxEffectPrimeFields(2).map((field) => field.label)).toEqual([
      'Disable Rocket Punch',
      'Disable Powerblock',
      'Disable Seismic Slam',
      'Force Stall',
      'No Ability Change',
      'Empowered Punch'
    ]);
    expect(state.flags.rocketPunchDisabled).toBe(false);
    expect(state.flags.powerblockDisabled).toBe(false);
    expect(state.flags.noAbilityChange).toBe(true);
    expect(state.resetCooldowns).toBe(true);
  });

  it('round-trips supported flags while preserving unknown extra factors', () => {
    const decoded = decodeHaxEffectPrimeState(3, -58);
    const reencoded = encodeHaxEffectPrimeState(3, {
      ...decoded,
      flags: {
        ...decoded.flags,
        seismicSlamDisabled: true
      }
    });

    expect(decoded.flags.rocketPunchDisabled).toBe(true);
    expect(decoded.flags.empoweredPunch).toBe(true);
    expect(decoded.extraFactors).toEqual([]);
    expect(reencoded).toBe(-290);
  });

  it('preserves unsupported factors when toggling documented flags', () => {
    const decoded = decodeHaxEffectPrimeState(10, 74);
    const reencoded = encodeHaxEffectPrimeState(10, {
      ...decoded,
      flags: {
        ...decoded.flags,
        noAbilityChange: true
      }
    });

    expect(decoded.extraFactors).toEqual([37]);
    expect(reencoded).toBe(407);
  });

  it('treats No Ability Change as mutually exclusive with explicit ability disables', () => {
    const noAbilityChangeWins = encodeHaxEffectPrimeState(2, {
      extraFactors: [],
      flags: {
        rocketPunchDisabled: true,
        powerblockDisabled: true,
        seismicSlamDisabled: false,
        forceStall: false,
        noAbilityChange: true,
        empoweredPunch: false,
        collisionUnchanged: false,
        centerlessCheckpoint: false
      },
      preserveUnit: false,
      resetCooldowns: false
    });

    expect(noAbilityChangeWins).toBe(11);
    expect(decodeHaxEffectPrimeState(2, 66).flags).toMatchObject({
      rocketPunchDisabled: false,
      powerblockDisabled: false,
      noAbilityChange: true
    });
  });

  it('lets the last changed toggle win when switching between No Ability Change and disable flags', () => {
    const fromNoAbilityChange = updateHaxEffectPrimeFlag(
      2,
      {
        rocketPunchDisabled: false,
        powerblockDisabled: false,
        seismicSlamDisabled: false,
        forceStall: false,
        noAbilityChange: true,
        empoweredPunch: false,
        collisionUnchanged: false,
        centerlessCheckpoint: false
      },
      'rocketPunchDisabled',
      true
    );
    const fromDisableFlag = updateHaxEffectPrimeFlag(
      2,
      {
        rocketPunchDisabled: true,
        powerblockDisabled: false,
        seismicSlamDisabled: false,
        forceStall: false,
        noAbilityChange: false,
        empoweredPunch: false,
        collisionUnchanged: false,
        centerlessCheckpoint: false
      },
      'noAbilityChange',
      true
    );

    expect(fromNoAbilityChange).toMatchObject({
      rocketPunchDisabled: true,
      noAbilityChange: false
    });
    expect(fromDisableFlag).toMatchObject({
      rocketPunchDisabled: false,
      noAbilityChange: true
    });
  });
});
