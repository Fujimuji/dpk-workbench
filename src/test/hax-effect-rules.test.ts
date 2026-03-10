import { describe, expect, it } from 'vitest';
import {
  HAX_BOUNCE_DEFAULT_IMPULSE_POWER,
  HAX_BOUNCE_FIXED_DIRECTION,
  HAX_PORTAL_RADIUS,
  applyHaxRadiusMode,
  applyHaxTimeEffectMode,
  getHaxBounceVariant,
  getHaxRadiusMode,
  getHaxTimeEffectMode,
  normalizeHaxEffect
} from '../domain/import/hax/effectRules';
import { insertHaxCheckpointEffects, updateHaxCheckpointEffectAt } from '../domain/import/hax/mutators';
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
      }
    ]
  };
}

describe('hax effect rules', () => {
  it('normalizes portal radius to the framework constant', () => {
    expect(
      normalizeHaxEffect({ position: vector(1), radius: 4.5, type: 5, payload: 0 }).radius
    ).toBe(HAX_PORTAL_RADIUS);
    expect(
      normalizeHaxEffect({ position: vector(2), radius: -9, type: 6, payload: 0 }).radius
    ).toBe(HAX_PORTAL_RADIUS);
  });

  it('normalizes bounce kill-momentum variants to non-lightshaft radii', () => {
    const normalized = normalizeHaxEffect({
      position: vector(3),
      radius: -2,
      type: 11,
      payload: { direction: vector(4), power: 0 }
    });

    expect(typeof normalized.payload).not.toBe('number');
    expect(normalized.radius).toBe(2);
    expect(getHaxBounceVariant(normalized.payload as { direction: { x: number; y: number; z: number }; power: number })).toBe('killMomentum');
    expect((normalized.payload as { direction: { x: number; y: number; z: number } }).direction).toEqual(HAX_BOUNCE_FIXED_DIRECTION);
  });

  it('normalizes inserted and updated Hax effects through mutators', () => {
    const inserted = insertHaxCheckpointEffects(createDocument(), 1, [
      { position: vector(5), radius: 6, type: 5, payload: 0 },
      { position: vector(6), radius: -3, type: 11, payload: { direction: vector(7), power: HAX_BOUNCE_DEFAULT_IMPULSE_POWER } }
    ]);

    expect(inserted.checkpoints[0]?.effects[0]?.radius).toBe(HAX_PORTAL_RADIUS);

    const updated = updateHaxCheckpointEffectAt(inserted, 1, 1, (effect) =>
      typeof effect.payload === 'number'
        ? effect
        : { ...effect, radius: -4, payload: { ...effect.payload, power: 0 } }
    );

    expect(updated.checkpoints[0]?.effects[1]?.radius).toBe(4);
    expect(
      typeof updated.checkpoints[0]?.effects[1]?.payload === 'number'
        ? null
        : updated.checkpoints[0]?.effects[1]?.payload.direction
    ).toEqual(HAX_BOUNCE_FIXED_DIRECTION);
  });

  it('maps time and light-shaft effect radius sign to semantic modes', () => {
    expect(getHaxTimeEffectMode(3)).toBe('normal');
    expect(getHaxTimeEffectMode(-3)).toBe('shootable');
    expect(applyHaxTimeEffectMode(3, 'shootable')).toBe(-3);
    expect(applyHaxTimeEffectMode(-3, 'normal')).toBe(3);

    expect(getHaxRadiusMode(4)).toBe('sphere');
    expect(getHaxRadiusMode(-4)).toBe('lightShaft');
    expect(applyHaxRadiusMode(4, 'lightShaft')).toBe(-4);
    expect(applyHaxRadiusMode(-4, 'sphere')).toBe(4);
  });

  it('auto-enables effect lock the first time ability or shootable-orb effects are added', () => {
    const withAbilityEffect = insertHaxCheckpointEffects(createDocument(), 1, [
      { position: vector(8), radius: 2, type: 2, payload: 0 }
    ]);
    expect(withAbilityEffect.checkpoints[0]?.prime.effectLock).toBe(true);

    const withShootableOrb = insertHaxCheckpointEffects(createDocument(), 1, [
      { position: vector(9), radius: 2, type: 10, payload: 0 }
    ]);
    expect(withShootableOrb.checkpoints[0]?.prime.effectLock).toBe(true);

    const onceOnly = insertHaxCheckpointEffects(withAbilityEffect, 1, [
      { position: vector(10), radius: 2, type: 2, payload: 0 }
    ]);
    expect(onceOnly.checkpoints[0]?.prime.effectLock).toBe(true);

    const withTimeEffect = insertHaxCheckpointEffects(createDocument(), 1, [
      { position: vector(11), radius: 2, type: 0, payload: 0 }
    ]);
    expect(withTimeEffect.checkpoints[0]?.prime.effectLock).toBe(false);
  });
});
