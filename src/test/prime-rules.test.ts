import { describe, expect, it } from 'vitest';
import {
  hasFactor,
  toBotValidAbilities,
  toDisabledAbilities,
  toValidAbilities
} from '../domain/import/hax/primeRules';

describe('Hax prime rules', () => {
  it('detects prime factors on normalized numeric input', () => {
    expect(hasFactor(30, 2)).toBe(true);
    expect(hasFactor(-30, 3)).toBe(true);
    expect(hasFactor(30.9, 5)).toBe(true);
    expect(hasFactor(null, 5)).toBe(false);
    expect(hasFactor(0, 5)).toBe(false);
  });

  it('maps disabled abilities from Hax prime factors', () => {
    expect(toDisabledAbilities(30)).toEqual({
      seismicSlam: true,
      powerblock: true,
      rocketPunch: true
    });
    expect(toDisabledAbilities(7)).toBeNull();
  });

  it('inverts ability availability for PM ability orbs', () => {
    expect(toValidAbilities(30)).toEqual({
      seismicSlam: false,
      powerblock: false,
      rocketPunch: false
    });
    expect(toValidAbilities(7)).toEqual({
      seismicSlam: true,
      powerblock: true,
      rocketPunch: true
    });
  });

  it('uses bot ability ordering with primary fire first', () => {
    expect(toBotValidAbilities(30)).toEqual({
      primaryFire: false,
      seismicSlam: false,
      rocketPunch: false
    });
    expect(toBotValidAbilities(2)).toEqual({
      primaryFire: true,
      seismicSlam: true,
      rocketPunch: false
    });
  });
});
