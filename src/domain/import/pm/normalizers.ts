import type {
  AbilityFlags,
  BotAbilityFlags,
  CheckpointMarker,
  CheckpointConfig,
  ImpulseEffect,
  PortalPair,
  Vec3,
  WorkshopColor
} from '@/domain/model/types';
import { WORKSHOP_COLORS } from '@/shared/workshop/colors';
import { ParseError } from '@/shared/errors/AppError';
import type { WorkshopValue } from '@/shared/workshop/workshopValues';

export function isArrayValue(value: WorkshopValue): value is WorkshopValue[] {
  return Array.isArray(value);
}

export function isVec3(value: WorkshopValue): value is Vec3 {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Vec3).x === 'number' &&
    typeof (value as Vec3).y === 'number' &&
    typeof (value as Vec3).z === 'number'
  );
}

export function isWorkshopColor(value: string): value is WorkshopColor {
  return WORKSHOP_COLORS.includes(value as WorkshopColor);
}

export function createDefaultCheckpointConfig(): CheckpointConfig {
  return {
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
    portal: null
  };
}

export function createCheckpointMarker(position: Vec3, radius = 2): CheckpointMarker {
  return {
    position,
    radius
  };
}

export function parseBooleanTriplet(value: WorkshopValue, label: string): [boolean, boolean, boolean] {
  if (
    !isArrayValue(value) ||
    value.length < 3 ||
    typeof value[0] !== 'boolean' ||
    typeof value[1] !== 'boolean' ||
    typeof value[2] !== 'boolean'
  ) {
    throw new ParseError('invalid_syntax', `${label} must be Array(Boolean, Boolean, Boolean).`);
  }

  return [value[0], value[1], value[2]];
}

export function parseAbilityFlags(value: WorkshopValue, label: string): AbilityFlags {
  const [seismicSlam, powerblock, rocketPunch] = parseBooleanTriplet(value, label);
  return { seismicSlam, powerblock, rocketPunch };
}

export function parseBotAbilityFlags(value: WorkshopValue, label: string): BotAbilityFlags {
  const [primaryFire, seismicSlam, rocketPunch] = parseBooleanTriplet(value, label);
  return { primaryFire, seismicSlam, rocketPunch };
}

export function normalizeDisableAbilities(value: WorkshopValue, label: string): AbilityFlags | null {
  const flags = parseAbilityFlags(value, label);
  return flags.seismicSlam || flags.powerblock || flags.rocketPunch ? flags : null;
}

export function normalizeVectorList(value: WorkshopValue, label: string): Vec3[] {
  if (isVec3(value)) {
    return [value];
  }

  if (!isArrayValue(value)) {
    throw new ParseError('invalid_syntax', `${label} must contain Vector values.`);
  }

  if (value.some((entry) => !isVec3(entry))) {
    throw new ParseError('invalid_syntax', `${label} must contain only Vector values.`);
  }

  return value as Vec3[];
}

export function normalizeNumberList(value: WorkshopValue, label: string): number[] {
  if (typeof value === 'number') {
    return [value];
  }

  if (!isArrayValue(value)) {
    throw new ParseError('invalid_syntax', `${label} must contain numeric values.`);
  }

  if (value.some((entry) => typeof entry !== 'number')) {
    throw new ParseError('invalid_syntax', `${label} must contain only numeric values.`);
  }

  return value as number[];
}

export function normalizeAbilityList(value: WorkshopValue, label: string): AbilityFlags[] {
  if (!isArrayValue(value)) {
    throw new ParseError('invalid_syntax', `${label} must contain ability entries.`);
  }

  if (value.length === 0) {
    return [];
  }

  if (typeof value[0] === 'boolean') {
    return [parseAbilityFlags(value, label)];
  }

  return value.map((entry, index) => parseAbilityFlags(entry, `${label} #${index + 1}`));
}

export function normalizeDirectionList(value: WorkshopValue, label: string): Vec3[] {
  return normalizeVectorList(value, label);
}

export function normalizePortalPair(value: WorkshopValue, label: string): PortalPair {
  if (!isArrayValue(value) || value.length < 2 || !isVec3(value[0]) || !isVec3(value[1])) {
    throw new ParseError('invalid_syntax', `${label} must be Array(Vector, Vector).`);
  }

  return {
    entry: value[0],
    exit: value[1]
  };
}

export function normalizePortalSlot(value: WorkshopValue, label: string): PortalPair | null {
  if (!isArrayValue(value)) {
    throw new ParseError('invalid_syntax', `${label} must contain a portal pair.`);
  }

  if (value.length === 0) {
    return null;
  }

  if (isVec3(value[0])) {
    return normalizePortalPair(value, label);
  }

  return normalizePortalPair(value[0], `${label} #1`);
}
