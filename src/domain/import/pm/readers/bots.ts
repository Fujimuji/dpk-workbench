import type { CheckpointConfig } from '@/domain/model/types';
import { isArrayValue, isVec3, parseBotAbilityFlags } from '@/domain/import/pm/normalizers';
import { readParsedIndexedValue } from '@/domain/import/pm/readers/assignments';
import { ParseError } from '@/shared/errors/AppError';

export function readBots(
  locationAssignments: Map<number, string>,
  abilityAssignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[]
): void {
  const parsedLocations = readParsedIndexedValue(locationAssignments, levelKey);
  if (parsedLocations === null || parsedLocations === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsedLocations)) {
    throw new ParseError('invalid_syntax', `Global.c_checkpointBotLocation[${levelKey}] must be Null or an Array.`);
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
              `Global.c_checkpointBotValidAbilities[${levelKey}] must be Null or an Array.`
            );
          })();

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const locationSlot = parsedLocations[index];
    if (locationSlot === null || locationSlot === false || locationSlot === undefined) {
      checkpointConfigs[index].bot = null;
      continue;
    }

    if (!isVec3(locationSlot)) {
      throw new ParseError('invalid_syntax', `Global.c_checkpointBotLocation[${levelKey}][${index}] must be a Vector.`);
    }

    const validAbilities =
      abilitySlots[index] === undefined || abilitySlots[index] === null || abilitySlots[index] === false
        ? { primaryFire: true, seismicSlam: true, rocketPunch: true }
        : parseBotAbilityFlags(abilitySlots[index], `Global.c_checkpointBotValidAbilities[${levelKey}][${index}]`);

    checkpointConfigs[index].bot = {
      position: locationSlot,
      validAbilities
    };
  }
}
