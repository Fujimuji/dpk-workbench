import type { CheckpointConfig } from '@/domain/model/types';
import { normalizeDisableAbilities, isArrayValue } from '@/domain/import/pm/normalizers';
import { readParsedIndexedValue } from '@/domain/import/pm/readers/assignments';
import { ParseError } from '@/shared/errors/AppError';

export function readLiquidSlots(
  assignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[]
): void {
  const parsed = readParsedIndexedValue(assignments, levelKey);
  if (parsed === null || parsed === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsed)) {
    throw new ParseError('invalid_syntax', `Global.c_checkpointsLiquid[${levelKey}] must be Null or an Array.`);
  }

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const slot = parsed[index];
    checkpointConfigs[index].liquid = slot === true;
  }
}

export function readNullableSlotNumbers(
  assignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[],
  property: 'timeLimit' | 'minimumSpeed' | 'heightGoal'
): void {
  const parsed = readParsedIndexedValue(assignments, levelKey);
  if (parsed === null || parsed === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsed)) {
    throw new ParseError('invalid_syntax', `Global value for ${property} at level ${levelKey} must be Null or an Array.`);
  }

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const slot = parsed[index];
    if (slot === null || slot === false || slot === undefined) {
      checkpointConfigs[index][property] = null;
      continue;
    }

    if (typeof slot !== 'number') {
      throw new ParseError('invalid_syntax', `Checkpoint ${index + 1} ${property} must be a number or Null.`);
    }

    let nextValue = slot;
    if (property === 'minimumSpeed') {
      nextValue = Math.max(0, nextValue);
    } else if (property === 'heightGoal') {
      nextValue = Math.max(1, nextValue);
    }

    checkpointConfigs[index][property] = nextValue;
  }
}

export function readDisableAbilities(
  assignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[]
): void {
  const parsed = readParsedIndexedValue(assignments, levelKey);
  if (parsed === null || parsed === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsed)) {
    throw new ParseError('invalid_syntax', `Global.c_checkpointDisableAbilities[${levelKey}] must be Null or an Array.`);
  }

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const slot = parsed[index];
    if (slot === null || slot === false || slot === undefined) {
      checkpointConfigs[index].disableAbilities = null;
      continue;
    }

    checkpointConfigs[index].disableAbilities = normalizeDisableAbilities(
      slot,
      `Global.c_checkpointDisableAbilities[${levelKey}][${index}]`
    );
  }
}
