import { requireCompleteDraftVec3 } from '@/domain/model/draftVectors';
import type { DraftVec3, Vec3 } from '@/domain/model/types';
import { ParseError } from '@/shared/errors/AppError';
import {
  decodeMissionData,
  encodeMissionData,
  type HaxMission
} from '@/domain/import/hax/missionRules';
import type {
  HaxCheckpoint,
  HaxDocument,
  HaxEffect,
  HaxPrimeSwitches,
  HaxSourceData,
  PrimeFactorFlag
} from '@/domain/import/hax/types';

type TogglePrimeKey = Exclude<keyof HaxPrimeSwitches, 'extraFactors'>;

const PRIME_FACTOR_FLAGS: Array<{ factor: PrimeFactorFlag; key: TogglePrimeKey }> = [
  { factor: 2, key: 'rocketPunchDisabled' },
  { factor: 3, key: 'powerblockDisabled' },
  { factor: 5, key: 'seismicSlamDisabled' },
  { factor: 7, key: 'centerlessCheckpoint' },
  { factor: 17, key: 'effectLock' }
];

export function createEmptyPrimeSwitches(): HaxPrimeSwitches {
  return {
    rocketPunchDisabled: false,
    powerblockDisabled: false,
    seismicSlamDisabled: false,
    centerlessCheckpoint: false,
    effectLock: false,
    extraFactors: []
  };
}

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

export function decodePrimeSwitches(value: number | null): HaxPrimeSwitches {
  const decoded = createEmptyPrimeSwitches();
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
    return decoded;
  }

  const remainingFactors = getPrimeFactors(value);
  PRIME_FACTOR_FLAGS.forEach(({ factor, key }) => {
    const factorIndex = remainingFactors.indexOf(factor);
    if (factorIndex === -1) {
      return;
    }

    decoded[key] = true;
    remainingFactors.splice(factorIndex, 1);
  });
  decoded.extraFactors = remainingFactors;
  return decoded;
}

export function encodePrimeSwitches(
  value: HaxPrimeSwitches,
  options: { isSpawn: boolean; isLevelStart: boolean }
): number | null {
  const enabledFactors: number[] = PRIME_FACTOR_FLAGS
    .filter(({ key }) => value[key])
    .map(({ factor }) => factor);
  if (options.isSpawn) {
    enabledFactors.push(11);
  }
  if (options.isLevelStart) {
    enabledFactors.push(13);
  }
  enabledFactors.push(...value.extraFactors);

  if (enabledFactors.length === 0) {
    return null;
  }

  return enabledFactors.reduce((product, factor) => product * factor, 1);
}

function decodeCheckpointMission(value: unknown): HaxMission[] {
  if (value === false || value === true || value === null || value === 0) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ParseError('invalid_checkpoint_shape', 'Global.Mission entries must be empty or mission arrays.');
  }

  if (value.some((entry) => typeof entry !== 'number')) {
    throw new ParseError('invalid_checkpoint_shape', 'Mission arrays may only contain numbers.');
  }

  return decodeMissionData(value as number[]);
}

function encodeCheckpointMission(value: HaxMission[]): true | number[] {
  return value.length === 0 ? true : encodeMissionData(value);
}

function decodeAbilityCount(value: unknown): HaxCheckpoint['abilityCount'] {
  if (value === false || value === true || value === null || value === 0) {
    return null;
  }

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    typeof (value as Vec3).x !== 'number' ||
    typeof (value as Vec3).y !== 'number' ||
    typeof (value as Vec3).z !== 'number'
  ) {
    throw new ParseError('invalid_checkpoint_shape', 'Global.AbilityCount entries must be empty or Vector values.');
  }

  return {
    rocketPunch: (value as Vec3).x,
    powerblock: (value as Vec3).y,
    seismicSlam: (value as Vec3).z
  };
}

function encodeAbilityCount(value: HaxCheckpoint['abilityCount']): false | Vec3 {
  if (!value) {
    return false;
  }

  return {
    x: value.rocketPunch,
    y: value.powerblock,
    z: value.seismicSlam
  };
}

function decodeTeleportSettings(
  hiddenTeleportTimeTrial: unknown,
  teleportValue: unknown
): Pick<HaxCheckpoint, 'teleport' | 'timeTrialMinimum'> {
  let teleport: HaxCheckpoint['teleport'] = null;
  let timeTrialMinimum: number | null = null;

  if (
    hiddenTeleportTimeTrial !== false &&
    hiddenTeleportTimeTrial !== true &&
    hiddenTeleportTimeTrial !== null &&
    hiddenTeleportTimeTrial !== 0
  ) {
    if (
      typeof hiddenTeleportTimeTrial !== 'object' ||
      Array.isArray(hiddenTeleportTimeTrial) ||
      typeof (hiddenTeleportTimeTrial as Vec3).x !== 'number' ||
      typeof (hiddenTeleportTimeTrial as Vec3).y !== 'number' ||
      typeof (hiddenTeleportTimeTrial as Vec3).z !== 'number'
    ) {
      throw new ParseError('invalid_checkpoint_shape', 'Global.HiddenCP_TpRad_TT entries must be empty or Vector values.');
    }

    const vector = hiddenTeleportTimeTrial as Vec3;
    timeTrialMinimum = vector.z > 0 ? vector.z : null;
    teleport = vector.y > 0 ? { destination: { x: 0, y: 0, z: 0 }, radius: vector.y } : null;
  }

  if (teleportValue !== false && teleportValue !== true && teleportValue !== null && teleportValue !== 0) {
    if (
      typeof teleportValue !== 'object' ||
      Array.isArray(teleportValue) ||
      typeof (teleportValue as Vec3).x !== 'number' ||
      typeof (teleportValue as Vec3).y !== 'number' ||
      typeof (teleportValue as Vec3).z !== 'number'
    ) {
      throw new ParseError('invalid_checkpoint_shape', 'Global.TP entries must be empty or Vector values.');
    }

    teleport = {
      destination: teleportValue as Vec3,
      radius: teleport?.radius ?? 0
    };
  }

  return {
    teleport,
    timeTrialMinimum
  };
}

function encodeHiddenTeleportTimeTrial(value: HaxCheckpoint): false | Vec3 {
  if (!value.teleport && value.timeTrialMinimum === null) {
    return false;
  }

  return {
    x: 0,
    y: value.teleport?.radius ?? 0,
    z: value.timeTrialMinimum ?? 0
  };
}

function encodeTeleport(value: HaxCheckpoint): false | Vec3 {
  return value.teleport?.destination ?? false;
}

export function createHaxCheckpoint(
  position: DraftVec3,
  radius: number,
  viewAngle: number,
  isLevelStart: boolean,
  prime: HaxPrimeSwitches,
  missions: HaxMission[],
  abilityCount: HaxCheckpoint['abilityCount'],
  teleport: HaxCheckpoint['teleport'],
  timeTrialMinimum: number | null,
  effects: HaxEffect[],
  fakeUpper: boolean
): HaxCheckpoint {
  return {
    position,
    radius,
    viewAngle,
    isLevelStart,
    prime,
    missions,
    abilityCount,
    teleport,
    timeTrialMinimum,
    effects,
    fakeUpper
  };
}

export interface HaxWireData extends HaxSourceData {
  abilityCounts: Array<false | Vec3>;
  connections: Array<number | false>;
  fakeUpperCheckpointStates: boolean[];
  hiddenTeleportTimeTrial: Array<false | Vec3>;
  missions: Array<true | number[]>;
  radiusViewAngleGoBack: Vec3[];
  teleports: Array<false | Vec3>;
}

export function buildHaxWireData(document: HaxDocument): HaxWireData {
  const slots = [document.spawn, ...document.checkpoints];

  return {
    checkpointPositions: slots.map((slot, slotIndex) =>
      requireCompleteDraftVec3(slot.position, slotIndex === 0 ? 'Spawn position' : `Checkpoint ${slotIndex} position`)
    ),
    checkpointPrimes: slots.map((slot, slotIndex) =>
      encodePrimeSwitches(slot.prime, {
        isSpawn: slotIndex === 0,
        isLevelStart: slotIndex > 0 && (slotIndex === 1 || slot.isLevelStart)
      })
    ),
    checkpointEffects: slots.map((slot, slotIndex) =>
      slot.effects.map((effect, effectIndex) => ({
        ...effect,
        position: requireCompleteDraftVec3(
          effect.position,
          `${slotIndex === 0 ? 'Spawn' : `Checkpoint ${slotIndex}`} effect ${effectIndex + 1} position`
        )
      }))
    ),
    radiusViewAngleGoBack: slots.map((slot, slotIndex) => ({
      x: slot.radius,
      y: slot.viewAngle,
      z: slotIndex === 0 ? -1 : slot.isLevelStart || slotIndex === 1 ? 0 : slotIndex - 1
    })),
    connections: slots.map((slot, slotIndex) => {
      if (slotIndex === 0) {
        return 0;
      }

      const isLevelEnd =
        slotIndex === slots.length - 1 || Boolean(slots[slotIndex + 1]?.isLevelStart);
      return isLevelEnd ? false : slotIndex + 1;
    }),
    missions: slots.map((slot) => encodeCheckpointMission(slot.missions)),
    abilityCounts: slots.map((slot) => encodeAbilityCount(slot.abilityCount)),
    hiddenTeleportTimeTrial: slots.map((slot) => encodeHiddenTeleportTimeTrial(slot)),
    teleports: slots.map((slot) => encodeTeleport(slot)),
    fakeUpperCheckpointStates: slots.map((slot) => slot.fakeUpper)
  };
}

export function buildHaxSourceData(document: HaxDocument): HaxSourceData {
  const wire = buildHaxWireData(document);
  return {
    checkpointPositions: wire.checkpointPositions,
    checkpointPrimes: wire.checkpointPrimes,
    checkpointEffects: wire.checkpointEffects
  };
}

export function createHaxDocumentFromSlots(slots: HaxCheckpoint[]): HaxDocument {
  if (slots.length < 2) {
    throw new ParseError('invalid_checkpoint_shape', 'At least one spawn and one checkpoint are required.');
  }

  return {
    format: 'hax',
    spawn: slots[0],
    checkpoints: slots.slice(1)
  };
}

export function decodeCheckpointState(input: {
  abilityCount: unknown;
  effects: HaxEffect[];
  fakeUpper: boolean;
  hiddenTeleportTimeTrial: unknown;
  mission: unknown;
  position: Vec3;
  prime: number | null;
  radius: number;
  slotIndex: number;
  teleport: unknown;
  viewAngle: number;
}): HaxCheckpoint {
  const teleportState = decodeTeleportSettings(input.hiddenTeleportTimeTrial, input.teleport);
  const isLevelStart =
    input.slotIndex > 0 &&
    (input.slotIndex === 1 || (typeof input.prime === 'number' && Math.abs(Math.trunc(input.prime)) % 13 === 0));

  return createHaxCheckpoint(
    input.position,
    input.radius,
    input.viewAngle,
    isLevelStart,
    decodePrimeSwitches(input.prime),
    decodeCheckpointMission(input.mission),
    decodeAbilityCount(input.abilityCount),
    teleportState.teleport,
    teleportState.timeTrialMinimum,
    input.effects,
    input.fakeUpper
  );
}
