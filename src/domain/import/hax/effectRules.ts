import type { HaxEffect, Vec3Payload } from '@/domain/import/hax/types';

export const HAX_PORTAL_RADIUS = 1.1;
export const HAX_BOUNCE_STALL_POWER = 0.016;
export const HAX_BOUNCE_KILL_MOMENTUM_POWER = 0;
export const HAX_BOUNCE_DEFAULT_IMPULSE_POWER = 10;
export const HAX_BOUNCE_FIXED_DIRECTION = { x: 0, y: 1, z: 0 } as const;

export type HaxBounceVariant = 'impulse' | 'stall' | 'killMomentum';
export type HaxTimeEffectMode = 'normal' | 'shootable';
export type HaxRadiusMode = 'sphere' | 'lightShaft';

function isVec3Payload(payload: number | Vec3Payload): payload is Vec3Payload {
  return typeof payload !== 'number';
}

export function getHaxBounceVariant(payload: Vec3Payload): HaxBounceVariant {
  if (payload.power === HAX_BOUNCE_KILL_MOMENTUM_POWER) {
    return 'killMomentum';
  }

  if (payload.power === HAX_BOUNCE_STALL_POWER) {
    return 'stall';
  }

  return 'impulse';
}

export function getHaxTimeEffectMode(radius: number): HaxTimeEffectMode {
  return radius < 0 ? 'shootable' : 'normal';
}

export function applyHaxTimeEffectMode(radius: number, mode: HaxTimeEffectMode): number {
  const magnitude = Math.abs(radius) || 1;
  return mode === 'shootable' ? -magnitude : magnitude;
}

export function getHaxRadiusMode(radius: number): HaxRadiusMode {
  return radius < 0 ? 'lightShaft' : 'sphere';
}

export function applyHaxRadiusMode(radius: number, mode: HaxRadiusMode): number {
  const magnitude = Math.abs(radius) || 1;
  return mode === 'lightShaft' ? -magnitude : magnitude;
}

export function supportsHaxLightShaftMode(effect: Pick<HaxEffect, 'type' | 'payload'>): boolean {
  return effect.type === 1 || effect.type === 2 || effect.type === 3 || (effect.type === 11 && isVec3Payload(effect.payload));
}

export function normalizeHaxEffect(effect: HaxEffect): HaxEffect {
  if (effect.type === 5 || effect.type === 6) {
    return {
      ...effect,
      radius: HAX_PORTAL_RADIUS
    };
  }

  if (effect.type === 11 && isVec3Payload(effect.payload)) {
    const variant = getHaxBounceVariant(effect.payload);
    return {
      ...effect,
      radius: variant === 'killMomentum' ? Math.abs(effect.radius) || 2 : effect.radius,
      payload: {
        ...effect.payload,
        direction:
          variant === 'impulse'
            ? effect.payload.direction
            : HAX_BOUNCE_FIXED_DIRECTION,
        power:
          variant === 'stall'
            ? HAX_BOUNCE_STALL_POWER
            : variant === 'killMomentum'
              ? HAX_BOUNCE_KILL_MOMENTUM_POWER
              : effect.payload.power
      }
    };
  }

  return effect;
}

export function normalizeHaxEffects(effects: HaxEffect[]): HaxEffect[] {
  return effects.map(normalizeHaxEffect);
}
