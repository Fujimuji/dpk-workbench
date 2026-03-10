import type { CheckpointConfig } from '@/domain/model/types';
import { isArrayValue, normalizeNumberList, normalizeVectorList } from '@/domain/import/pm/normalizers';
import { readParsedIndexedValue } from '@/domain/import/pm/readers/assignments';
import { ParseError } from '@/shared/errors/AppError';

export function readTouchOrbs(
  locationAssignments: Map<number, string>,
  sizeAssignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[]
): void {
  const parsedLocations = readParsedIndexedValue(locationAssignments, levelKey);
  if (parsedLocations === null || parsedLocations === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsedLocations)) {
    throw new ParseError('invalid_syntax', `Global.c_checkpointTouchOrbLocations[${levelKey}] must be Null or an Array.`);
  }

  const parsedSizes = readParsedIndexedValue(sizeAssignments, levelKey);
  const sizeSlots =
    parsedSizes === null || parsedSizes === false
      ? []
      : isArrayValue(parsedSizes)
        ? parsedSizes
        : (() => {
            throw new ParseError('invalid_syntax', `Global.c_checkpointTouchOrbSizes[${levelKey}] must be Null or an Array.`);
          })();

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const locationSlot = parsedLocations[index];
    if (locationSlot === null || locationSlot === false || locationSlot === undefined) {
      checkpointConfigs[index].touchOrbs = null;
      continue;
    }

    const positions = normalizeVectorList(locationSlot, `Global.c_checkpointTouchOrbLocations[${levelKey}][${index}]`);
    const sizeValues =
      sizeSlots[index] === undefined || sizeSlots[index] === null || sizeSlots[index] === false
        ? []
        : normalizeNumberList(sizeSlots[index], `Global.c_checkpointTouchOrbSizes[${levelKey}][${index}]`);

    checkpointConfigs[index].touchOrbs = positions.map((position, orbIndex) => ({
      position,
      radius: sizeValues[orbIndex] ?? 1
    }));
  }
}
