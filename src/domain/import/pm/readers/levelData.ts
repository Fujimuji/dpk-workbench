import type { CheckpointMarker, Vec3, WorkshopColor } from '@/domain/model/types';
import { createCheckpointMarker, isWorkshopColor, normalizeNumberList, normalizeVectorList } from '@/domain/import/pm/normalizers';
import { collectIndexedAssignments, unescapeWorkshopString } from '@/domain/import/pm/readers/assignments';
import { ParseError } from '@/shared/errors/AppError';
import { parseWorkshopValue } from '@/shared/workshop/workshopValues';

export function parseLevelDataAssignments(actionsBlock: string): Map<number, Partial<{ name: string; color: WorkshopColor }>> {
  const assignments = collectIndexedAssignments(actionsBlock, 'Global.c_levelData');
  const parsed = new Map<number, Partial<{ name: string; color: WorkshopColor }>>();

  assignments.forEach((expression, levelKey) => {
    const next: Partial<{ name: string; color: WorkshopColor }> = {};
    const nameMatch = expression.match(/Custom\s+String\s*\(\s*"((?:[^"\\]|\\.)*)"\s*\)/i);
    const colorMatch = expression.match(/Color\s*\(\s*([^)]+?)\s*\)/i);

    if (nameMatch) {
      next.name = unescapeWorkshopString(nameMatch[1]);
    }

    if (colorMatch) {
      const colorToken = colorMatch[1].trim();
      if (isWorkshopColor(colorToken)) {
        next.color = colorToken;
      }
    }

    parsed.set(levelKey, next);
  });

  return parsed;
}

export function buildLevelVectors(
  vectorAssignments: Map<number, string>,
  sizeAssignments: Map<number, string>
): Array<{ levelKey: number; checkpoints: CheckpointMarker[] }> {
  const levelKeys = [...vectorAssignments.keys()].sort((left, right) => left - right);
  if (levelKeys.length === 0) {
    throw new ParseError('missing_assignment', 'Missing assignment for Global.c_checkpointVectors.');
  }

  return levelKeys.map((levelKey) => {
    const parsed = parseWorkshopValue(vectorAssignments.get(levelKey)!);
    const checkpointVectors = normalizeVectorList(parsed, `Global.c_checkpointVectors[${levelKey}]`);
    if (checkpointVectors.length === 0) {
      throw new ParseError(
        'invalid_checkpoint_shape',
        `Global.c_checkpointVectors[${levelKey}] must contain at least one checkpoint.`
      );
    }

    const sizeExpression = sizeAssignments.get(levelKey);
    const checkpointSizes =
      sizeExpression === undefined
        ? []
        : normalizeNumberList(parseWorkshopValue(sizeExpression), `Global.c_checkpointSizes[${levelKey}]`);

    return {
      levelKey,
      checkpoints: checkpointVectors.map((position, checkpointIndex) =>
        createCheckpointMarker(position, checkpointSizes[checkpointIndex] ?? 2)
      )
    };
  });
}
