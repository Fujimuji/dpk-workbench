import type { CheckpointConfig } from '@/domain/model/types';
import {
  isArrayValue,
  normalizeAbilityList,
  normalizeNumberList,
  normalizeVectorList
} from '@/domain/import/pm/normalizers';
import { readParsedIndexedValue } from '@/domain/import/pm/readers/assignments';
import { ParseError } from '@/shared/errors/AppError';

export function readAbilityOrbs(
  locationAssignments: Map<number, string>,
  abilityAssignments: Map<number, string>,
  sizeAssignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[]
): void {
  const parsedLocations = readParsedIndexedValue(locationAssignments, levelKey);
  if (parsedLocations === null || parsedLocations === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsedLocations)) {
    throw new ParseError('invalid_syntax', `Global.c_checkpointAbilityOrbLocations[${levelKey}] must be Null or an Array.`);
  }

  const parsedAbilities = readParsedIndexedValue(abilityAssignments, levelKey);
  const abilitySlots =
    parsedAbilities === null || parsedAbilities === false
      ? []
      : isArrayValue(parsedAbilities)
        ? parsedAbilities
        : (() => {
            throw new ParseError(
              'invalid_syntax',
              `Global.c_checkpointAbilityOrbAbilities[${levelKey}] must be Null or an Array.`
            );
          })();
  const parsedSizes = readParsedIndexedValue(sizeAssignments, levelKey);
  const sizeSlots =
    parsedSizes === null || parsedSizes === false
      ? []
      : isArrayValue(parsedSizes)
        ? parsedSizes
        : (() => {
            throw new ParseError(
              'invalid_syntax',
              `Global.c_checkpointAbilityOrbSizes[${levelKey}] must be Null or an Array.`
            );
          })();

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const locationSlot = parsedLocations[index];
    if (locationSlot === null || locationSlot === false || locationSlot === undefined) {
      checkpointConfigs[index].abilityOrbs = null;
      continue;
    }

    const positions = normalizeVectorList(locationSlot, `Global.c_checkpointAbilityOrbLocations[${levelKey}][${index}]`);
    const abilityValues =
      abilitySlots[index] === undefined || abilitySlots[index] === null || abilitySlots[index] === false
        ? []
        : normalizeAbilityList(abilitySlots[index], `Global.c_checkpointAbilityOrbAbilities[${levelKey}][${index}]`);
    const sizeValues =
      sizeSlots[index] === undefined || sizeSlots[index] === null || sizeSlots[index] === false
        ? []
        : normalizeNumberList(sizeSlots[index], `Global.c_checkpointAbilityOrbSizes[${levelKey}][${index}]`);

    checkpointConfigs[index].abilityOrbs = positions.map((position, orbIndex) => ({
      position,
      radius: sizeValues[orbIndex] ?? 1,
      abilities: abilityValues[orbIndex] ?? {
        seismicSlam: true,
        powerblock: true,
        rocketPunch: true
      }
    }));
  }
}
