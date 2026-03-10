import type { CheckpointConfig } from '@/domain/model/types';
import { isArrayValue, normalizePortalPairList } from '@/domain/import/pm/normalizers';
import { readParsedIndexedValue } from '@/domain/import/pm/readers/assignments';
import { ParseError } from '@/shared/errors/AppError';

export function readPortals(
  assignments: Map<number, string>,
  levelKey: number,
  checkpointConfigs: CheckpointConfig[]
): void {
  const parsed = readParsedIndexedValue(assignments, levelKey);
  if (parsed === null || parsed === false || checkpointConfigs.length === 0) {
    return;
  }

  if (!isArrayValue(parsed)) {
    throw new ParseError('invalid_syntax', `Global.c_checkpointPortals[${levelKey}] must be Null or an Array.`);
  }

  for (let index = 0; index < checkpointConfigs.length; index += 1) {
    const slot = parsed[index];
    if (slot === null || slot === false || slot === undefined) {
      checkpointConfigs[index].portals = null;
      continue;
    }

    const portals = normalizePortalPairList(slot, `Global.c_checkpointPortals[${levelKey}][${index}]`);
    checkpointConfigs[index].portals = portals.length > 0 ? portals : null;
  }
}
