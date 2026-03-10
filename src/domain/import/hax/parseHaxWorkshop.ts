import {
  createHaxDocumentFromSlots,
  decodeCheckpointState
} from '@/domain/import/hax/documentModel';
import { normalizeHaxEffect } from '@/domain/import/hax/effectRules';
import type { HaxDocument, HaxEffect, HaxEffectType, Vec3Payload } from '@/domain/import/hax/types';
import type { Vec3 } from '@/domain/model/types';
import { ParseError } from '@/shared/errors/AppError';
import {
  extractActionsBlock,
  extractAssignment,
  parseWorkshopValue,
  type WorkshopValue
} from '@/domain/import/shared/workshopExpressions';

const HAX_EFFECT_TYPES = new Set<HaxEffectType>([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

function isVec3(value: WorkshopValue): value is Vec3 {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Vec3).x === 'number' &&
    typeof (value as Vec3).y === 'number' &&
    typeof (value as Vec3).z === 'number'
  );
}

function coercePositions(value: WorkshopValue): Vec3[] {
  if (!Array.isArray(value) || value.some((entry) => !isVec3(entry))) {
    throw new ParseError('invalid_checkpoint_shape', 'Global.CPposition must be an Array of Vector values.');
  }

  if (value.length < 2) {
    throw new ParseError('invalid_checkpoint_shape', 'At least two checkpoints are required for conversion.');
  }

  return value as Vec3[];
}

function coercePrimes(value: WorkshopValue): Array<number | null> {
  if (!Array.isArray(value)) {
    throw new ParseError('invalid_checkpoint_shape', 'Global.Prime must be an Array.');
  }

  return value.map((entry) => (typeof entry === 'number' ? entry : null));
}

function coerceEffectPayload(value: WorkshopValue, effectType: HaxEffectType): number | Vec3Payload {
  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value) && value.length === 2 && isVec3(value[0]) && typeof value[1] === 'number') {
    return {
      direction: value[0],
      power: value[1]
    };
  }

  if (effectType !== 2 && effectType !== 10 && effectType !== 11) {
    return 0;
  }

  throw new ParseError('unsupported_payload', 'Encountered an effect payload shape that is not supported.');
}

function isHaxEffectType(value: number): value is HaxEffectType {
  return HAX_EFFECT_TYPES.has(value as HaxEffectType);
}

function coerceEffect(value: WorkshopValue): HaxEffect {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new ParseError('invalid_checkpoint_shape', 'Each Hax effect must be Array(Vector, radius, type, payload).');
  }

  const [position, radius, type, payload] = value;

  if (!isVec3(position) || typeof radius !== 'number' || typeof type !== 'number' || !isHaxEffectType(type)) {
    throw new ParseError('invalid_checkpoint_shape', 'Each Hax effect must use valid position, radius, and type values.');
  }

  return normalizeHaxEffect({
    position,
    radius,
    type,
    payload: coerceEffectPayload(payload, type)
  });
}

function coerceEffectSlots(value: WorkshopValue): HaxEffect[][] {
  if (!Array.isArray(value)) {
    throw new ParseError('invalid_checkpoint_shape', 'Global.Effect must be an Array.');
  }

  return value.map((slot) => {
    if (slot === false || slot === null || slot === 0) {
      return [];
    }

    if (!Array.isArray(slot)) {
      throw new ParseError('invalid_checkpoint_shape', 'Each Global.Effect slot must be empty or an Array of effects.');
    }

    return slot.map((effect) => coerceEffect(effect));
  });
}

function extractPreciseAssignment(actionsBlock: string, identifier: string): string {
  const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const assignmentPattern = new RegExp(`${escapedIdentifier}\\s*=`, 'g');
  const matches = Array.from(actionsBlock.matchAll(assignmentPattern));
  if (matches.length === 0) {
    throw new ParseError('missing_assignment', `Missing assignment for ${identifier}.`);
  }

  const startIndex = matches[matches.length - 1].index ?? -1;
  if (startIndex === -1) {
    throw new ParseError('missing_assignment', `Missing assignment for ${identifier}.`);
  }

  return extractAssignment(actionsBlock.slice(startIndex), identifier);
}

function parseRequiredAssignment(actionsBlock: string, identifier: string): WorkshopValue {
  return parseWorkshopValue(extractPreciseAssignment(actionsBlock, identifier));
}

function parseOptionalAssignment(actionsBlock: string, identifier: string, fallback: WorkshopValue): WorkshopValue {
  try {
    return parseWorkshopValue(extractPreciseAssignment(actionsBlock, identifier));
  } catch (error) {
    if (error instanceof ParseError && error.code === 'missing_assignment') {
      return fallback;
    }

    throw error;
  }
}

function coerceRadiusViewAngleGoBack(value: WorkshopValue): Vec3[] {
  if (!Array.isArray(value) || value.some((entry) => !isVec3(entry))) {
    throw new ParseError(
      'invalid_checkpoint_shape',
      'Global.Radius_VA_GoBackCP must be an Array of Vector values.'
    );
  }

  return value as Vec3[];
}

function coerceLooseArray(value: WorkshopValue, assignmentName: string): WorkshopValue[] {
  if (!Array.isArray(value)) {
    throw new ParseError('invalid_checkpoint_shape', `${assignmentName} must be an Array.`);
  }

  return value;
}

function coerceBooleans(value: WorkshopValue, assignmentName: string): boolean[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'boolean')) {
    throw new ParseError('invalid_checkpoint_shape', `${assignmentName} must be an Array of boolean values.`);
  }

  return value as boolean[];
}

function ensureMatchingLengths(lengths: Record<string, number>, expectedLength: number): void {
  Object.entries(lengths).forEach(([field, length]) => {
    if (length !== expectedLength) {
      throw new ParseError(
        'length_mismatch',
        `${field} must have the same number of entries as Global.CPposition.`
      );
    }
  });
}

export function parseHaxWorkshop(input: string): HaxDocument {
  const actionsBlock = extractActionsBlock(input);
  const checkpointPositions = coercePositions(parseRequiredAssignment(actionsBlock, 'Global.CPposition'));
  const radiusViewAngleGoBack = coerceRadiusViewAngleGoBack(
    parseOptionalAssignment(
      actionsBlock,
      'Global.Radius_VA_GoBackCP',
      checkpointPositions.map((_, slotIndex) => ({ x: 2, y: 0, z: slotIndex === 0 ? -1 : slotIndex - 1 }))
    )
  );
  const connections = coerceLooseArray(
    parseOptionalAssignment(
      actionsBlock,
      'Global.Connections',
      checkpointPositions.map((_, slotIndex) => (slotIndex === 0 ? 0 : false))
    ),
    'Global.Connections'
  );
  const missions = coerceLooseArray(
    parseOptionalAssignment(actionsBlock, 'Global.Mission', checkpointPositions.map(() => true)),
    'Global.Mission'
  );
  const checkpointPrimes = coercePrimes(parseRequiredAssignment(actionsBlock, 'Global.Prime'));
  const abilityCounts = coerceLooseArray(
    parseOptionalAssignment(actionsBlock, 'Global.AbilityCount', checkpointPositions.map(() => false)),
    'Global.AbilityCount'
  );
  const hiddenTeleportTimeTrial = coerceLooseArray(
    parseOptionalAssignment(actionsBlock, 'Global.HiddenCP_TpRad_TT', checkpointPositions.map(() => false)),
    'Global.HiddenCP_TpRad_TT'
  );
  const teleports = coerceLooseArray(
    parseOptionalAssignment(actionsBlock, 'Global.TP', checkpointPositions.map(() => false)),
    'Global.TP'
  );
  const checkpointEffects = coerceEffectSlots(parseRequiredAssignment(actionsBlock, 'Global.Effect'));
  const fakeUpperCheckpointStates = coerceBooleans(
    parseOptionalAssignment(actionsBlock, 'Global.FakeUpperCP', checkpointPositions.map(() => false)),
    'Global.FakeUpperCP'
  );

  ensureMatchingLengths(
    {
      'Global.Radius_VA_GoBackCP': radiusViewAngleGoBack.length,
      'Global.Connections': connections.length,
      'Global.Mission': missions.length,
      'Global.Prime': checkpointPrimes.length,
      'Global.AbilityCount': abilityCounts.length,
      'Global.HiddenCP_TpRad_TT': hiddenTeleportTimeTrial.length,
      'Global.TP': teleports.length,
      'Global.Effect': checkpointEffects.length,
      'Global.FakeUpperCP': fakeUpperCheckpointStates.length
    },
    checkpointPositions.length
  );

  return createHaxDocumentFromSlots(
    checkpointPositions.map((position, slotIndex) =>
      decodeCheckpointState({
        abilityCount: abilityCounts[slotIndex],
        effects: checkpointEffects[slotIndex],
        fakeUpper: fakeUpperCheckpointStates[slotIndex],
        hiddenTeleportTimeTrial: hiddenTeleportTimeTrial[slotIndex],
        mission: missions[slotIndex],
        position,
        prime: checkpointPrimes[slotIndex],
        radius: radiusViewAngleGoBack[slotIndex].x,
        slotIndex,
        teleport: teleports[slotIndex],
        viewAngle: radiusViewAngleGoBack[slotIndex].y
      })
    )
  );
}
