import type { CheckpointConfig, ImpulseEffect } from '@/domain/model/types';
import type { WorkshopValue } from '@/shared/workshop/workshopValues';
import { isArrayValue, isVec3, normalizeDirectionList, normalizeNumberList } from '@/domain/import/pm/normalizers';
import { readParsedIndexedValue } from '@/domain/import/pm/readers/assignments';
import { ParseError } from '@/shared/errors/AppError';

function readGroupedImpulseDirections(
  locationSlot: WorkshopValue[],
  directionSlot: WorkshopValue[],
  speedSlot: WorkshopValue[],
  label: string
): ImpulseEffect[] {
  const positions = locationSlot.map((position, impulseIndex) => {
    if (!isVec3(position)) {
      throw new ParseError('invalid_syntax', `${label} locations[${impulseIndex + 1}] must be a Vector.`);
    }

    return position;
  });

  if (directionSlot.every(isVec3) && speedSlot.every((entry) => typeof entry === 'number')) {
    const directions = normalizeDirectionList(directionSlot, `${label} directions`);
    const speeds = normalizeNumberList(speedSlot, `${label} speeds`);

    if (directions.length !== speeds.length) {
      throw new ParseError('length_mismatch', `${label} directions and speeds must have matching lengths.`);
    }

    if (positions.length === directions.length) {
      return directions.map((direction, index) => ({
        position: positions[index],
        direction,
        speed: speeds[index]
      }));
    }

    if (positions.length === 1) {
      return directions.map((direction, index) => ({
        position: positions[0],
        direction,
        speed: speeds[index]
      }));
    }

    throw new ParseError('length_mismatch', `${label} locations, directions, and speeds must align.`);
  }

  if (directionSlot.length !== speedSlot.length) {
    throw new ParseError('length_mismatch', `${label} directions and speeds must have matching lengths.`);
  }

  return directionSlot.flatMap((directionEntry, groupIndex) => {
    const speedEntry = speedSlot[groupIndex];
    const position = positions[groupIndex] ?? (positions.length === 1 ? positions[0] : null);

    if (!position) {
      throw new ParseError('length_mismatch', `${label} locations, directions, and speeds must align.`);
    }

    const directions = normalizeDirectionList(directionEntry, `${label} directions #${groupIndex + 1}`);
    const speeds = normalizeNumberList(speedEntry, `${label} speeds #${groupIndex + 1}`);

    if (directions.length !== speeds.length) {
      throw new ParseError(
        'length_mismatch',
        `${label} directions #${groupIndex + 1} and speeds #${groupIndex + 1} must have matching lengths.`
      );
    }

    return directions.map((direction, index) => ({
      position,
      direction,
      speed: speeds[index]
    }));
  });
}

export function readImpulses(
  locationAssignments: Map<number, string>,
  directionAssignments: Map<number, string>,
  speedAssignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[]
): void {
  const parsedLocations = readParsedIndexedValue(locationAssignments, levelKey);
  if (parsedLocations === null || parsedLocations === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsedLocations)) {
    throw new ParseError('invalid_syntax', `Global.c_checkpointImpulseLocations[${levelKey}] must be Null or an Array.`);
  }

  const parsedDirections = readParsedIndexedValue(directionAssignments, levelKey);
  const directionSlots =
    parsedDirections === null || parsedDirections === false
      ? []
      : isArrayValue(parsedDirections)
        ? parsedDirections
        : (() => {
            throw new ParseError(
              'invalid_syntax',
              `Global.c_checkpointImpulseDirections[${levelKey}] must be Null or an Array.`
            );
          })();

  const parsedSpeeds = readParsedIndexedValue(speedAssignments, levelKey);
  const speedSlots =
    parsedSpeeds === null || parsedSpeeds === false
      ? []
      : isArrayValue(parsedSpeeds)
        ? parsedSpeeds
        : (() => {
            throw new ParseError(
              'invalid_syntax',
              `Global.c_checkpointImpulseSpeeds[${levelKey}] must be Null or an Array.`
            );
          })();

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const locationSlot = parsedLocations[index];
    if (locationSlot === null || locationSlot === false || locationSlot === undefined) {
      checkpointConfigs[index].impulses = null;
      continue;
    }

    if (!isArrayValue(locationSlot)) {
      throw new ParseError(
        'invalid_syntax',
        `Global.c_checkpointImpulseLocations[${levelKey}][${index}] must be an Array of Vector values.`
      );
    }

    const directionSlot = directionSlots[index];
    const speedSlot = speedSlots[index];
    if (!isArrayValue(directionSlot) || !isArrayValue(speedSlot)) {
      throw new ParseError(
        'invalid_syntax',
        `Global.c_checkpointImpulseDirections[${levelKey}][${index}] and speeds must be Arrays.`
      );
    }
    const impulses = readGroupedImpulseDirections(
      locationSlot,
      directionSlot,
      speedSlot,
      `Global.c_checkpointImpulse[${levelKey}][${index}]`
    );

    checkpointConfigs[index].impulses = impulses.length > 0 ? impulses : null;
  }
}
