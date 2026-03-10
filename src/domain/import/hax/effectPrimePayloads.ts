import type { HaxEffectType } from '@/domain/import/hax/types';

export type HaxEffectPrimeFieldKey =
  | 'rocketPunchDisabled'
  | 'powerblockDisabled'
  | 'seismicSlamDisabled'
  | 'forceStall'
  | 'noAbilityChange'
  | 'empoweredPunch'
  | 'collisionUnchanged'
  | 'centerlessCheckpoint';

export interface HaxEffectPrimeField {
  factor: number;
  key: HaxEffectPrimeFieldKey;
  label: string;
}

export interface HaxEffectPrimeState {
  extraFactors: number[];
  flags: Record<HaxEffectPrimeFieldKey, boolean>;
  preserveUnit: boolean;
  resetCooldowns: boolean;
}

const ABILITY_DISABLE_KEYS: HaxEffectPrimeFieldKey[] = [
  'rocketPunchDisabled',
  'powerblockDisabled',
  'seismicSlamDisabled'
];

const EMPTY_FLAGS: Record<HaxEffectPrimeFieldKey, boolean> = {
  rocketPunchDisabled: false,
  powerblockDisabled: false,
  seismicSlamDisabled: false,
  forceStall: false,
  noAbilityChange: false,
  empoweredPunch: false,
  collisionUnchanged: false,
  centerlessCheckpoint: false
};

function getPrimeFactors(value: number): number[] {
  const normalized = Math.abs(Math.trunc(value));
  const factors: number[] = [];
  let remaining = normalized;
  let divisor = 2;

  while (divisor * divisor <= remaining) {
    while (remaining % divisor === 0) {
      factors.push(divisor);
      remaining /= divisor;
    }

    divisor += divisor === 2 ? 1 : 2;
  }

  if (remaining > 1) {
    factors.push(remaining);
  }

  return factors;
}

function supportsNoAbilityChange(effectType: HaxEffectType): boolean {
  return getHaxEffectPrimeFields(effectType).some((field) => field.key === 'noAbilityChange');
}

function supportsAbilityDisableFlags(effectType: HaxEffectType): boolean {
  const supportedKeys = new Set(getHaxEffectPrimeFields(effectType).map((field) => field.key));
  return ABILITY_DISABLE_KEYS.some((key) => supportedKeys.has(key));
}

export function normalizeHaxEffectPrimeFlags(
  effectType: HaxEffectType,
  flags: Record<HaxEffectPrimeFieldKey, boolean>
): Record<HaxEffectPrimeFieldKey, boolean> {
  const nextFlags = { ...flags };

  if (!supportsNoAbilityChange(effectType) || !supportsAbilityDisableFlags(effectType)) {
    return nextFlags;
  }

  if (nextFlags.noAbilityChange) {
    ABILITY_DISABLE_KEYS.forEach((key) => {
      nextFlags[key] = false;
    });
  }

  return nextFlags;
}

export function updateHaxEffectPrimeFlag(
  effectType: HaxEffectType,
  flags: Record<HaxEffectPrimeFieldKey, boolean>,
  changedKey: HaxEffectPrimeFieldKey,
  value: boolean
): Record<HaxEffectPrimeFieldKey, boolean> {
  const nextFlags = { ...flags, [changedKey]: value };

  if (!supportsNoAbilityChange(effectType) || !supportsAbilityDisableFlags(effectType)) {
    return nextFlags;
  }

  if (changedKey === 'noAbilityChange' && value) {
    ABILITY_DISABLE_KEYS.forEach((key) => {
      nextFlags[key] = false;
    });
    return nextFlags;
  }

  if (ABILITY_DISABLE_KEYS.includes(changedKey) && value) {
    nextFlags.noAbilityChange = false;
  }

  return nextFlags;
}

export function getHaxEffectPrimeFields(effectType: HaxEffectType): HaxEffectPrimeField[] {
  switch (effectType) {
    case 2:
      return [
        { factor: 2, key: 'rocketPunchDisabled', label: 'Disable Rocket Punch' },
        { factor: 3, key: 'powerblockDisabled', label: 'Disable Powerblock' },
        { factor: 5, key: 'seismicSlamDisabled', label: 'Disable Seismic Slam' },
        { factor: 7, key: 'forceStall', label: 'Force Stall' },
        { factor: 11, key: 'noAbilityChange', label: 'No Ability Change' },
        { factor: 29, key: 'empoweredPunch', label: 'Empowered Punch' }
      ];
    case 3:
      return [
        { factor: 2, key: 'rocketPunchDisabled', label: 'Disable Rocket Punch' },
        { factor: 3, key: 'powerblockDisabled', label: 'Disable Powerblock' },
        { factor: 5, key: 'seismicSlamDisabled', label: 'Disable Seismic Slam' },
        { factor: 11, key: 'noAbilityChange', label: 'No Ability Change' },
        { factor: 29, key: 'empoweredPunch', label: 'Empowered Punch' },
        { factor: 31, key: 'collisionUnchanged', label: 'Collision Not Changed' }
      ];
    case 4:
      return [
        { factor: 2, key: 'rocketPunchDisabled', label: 'Disable Rocket Punch' },
        { factor: 3, key: 'powerblockDisabled', label: 'Disable Uppercut' },
        { factor: 5, key: 'seismicSlamDisabled', label: 'Disable Seismic Slam' },
        { factor: 7, key: 'centerlessCheckpoint', label: 'Centerless' },
        { factor: 11, key: 'noAbilityChange', label: 'No Ability Change' },
        { factor: 29, key: 'empoweredPunch', label: 'Empowered Punch' }
      ];
    case 5:
    case 6:
    case 10:
      return [
        { factor: 2, key: 'rocketPunchDisabled', label: 'Disable Rocket Punch' },
        { factor: 3, key: 'powerblockDisabled', label: 'Disable Powerblock' },
        { factor: 5, key: 'seismicSlamDisabled', label: 'Disable Seismic Slam' },
        { factor: 11, key: 'noAbilityChange', label: 'No Ability Change' },
        { factor: 29, key: 'empoweredPunch', label: 'Empowered Punch' }
      ];
    default:
      return [];
  }
}

export function decodeHaxEffectPrimeState(effectType: HaxEffectType, payload: number): HaxEffectPrimeState {
  const fields = getHaxEffectPrimeFields(effectType);
  const flags = { ...EMPTY_FLAGS };
  const normalized = Math.abs(Math.trunc(payload));
  const preserveUnit = normalized === 1;

  if (normalized === 0 || fields.length === 0) {
    return {
      extraFactors: [],
      flags,
      preserveUnit,
      resetCooldowns: payload < 0
    };
  }

  const remainingFactors = getPrimeFactors(payload);
  fields.forEach(({ factor, key }) => {
    const factorIndex = remainingFactors.indexOf(factor);
    if (factorIndex === -1) {
      return;
    }

    flags[key] = true;
    remainingFactors.splice(factorIndex, 1);
  });

  return {
    extraFactors: remainingFactors,
    flags: normalizeHaxEffectPrimeFlags(effectType, flags),
    preserveUnit,
    resetCooldowns: payload < 0
  };
}

export function encodeHaxEffectPrimeState(
  effectType: HaxEffectType,
  state: HaxEffectPrimeState
): number {
  const fields = getHaxEffectPrimeFields(effectType);
  const normalizedFlags = normalizeHaxEffectPrimeFlags(effectType, state.flags);
  const enabledFactors = fields
    .filter(({ key }) => normalizedFlags[key])
    .map(({ factor }) => factor);
  enabledFactors.push(...state.extraFactors);

  const magnitude =
    enabledFactors.length > 0
      ? enabledFactors.reduce((product, factor) => product * factor, 1)
      : state.preserveUnit || state.resetCooldowns
        ? 1
        : 0;

  return state.resetCooldowns ? -magnitude : magnitude;
}
