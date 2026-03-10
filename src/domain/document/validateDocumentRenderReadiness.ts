import type { WorkspaceDocument } from '@/domain/document/types';
import { formatHaxCheckpointReference, getHaxLevelStartIndexes } from '@/domain/import/hax/levelLayout';
import { getEffectName } from '@/domain/import/hax/warningRules';
import { formatIncompleteDraftVec3Message, isCompleteDraftVec3 } from '@/domain/model/draftVectors';
import { validateDraftMap, type RenderReadiness } from '@/domain/model/validateDraftMap';

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function validateHaxDocument(document: Extract<WorkspaceDocument, { format: 'hax' }>): RenderReadiness {
  const blockingReasons: string[] = [];

  if (!isCompleteDraftVec3(document.spawn.position)) {
    blockingReasons.push(formatIncompleteDraftVec3Message('Spawn', document.spawn.position));
  }

  document.spawn.effects.forEach((effect, effectIndex) => {
    if (!isCompleteDraftVec3(effect.position)) {
      blockingReasons.push(
        formatIncompleteDraftVec3Message(`Spawn ${toTitleCase(getEffectName(effect.type))} ${effectIndex + 1}`, effect.position)
      );
    }
  });

  const levelStarts = getHaxLevelStartIndexes(document);
  levelStarts.forEach((startIndex, levelIndex) => {
    const nextStart = levelStarts[levelIndex + 1] ?? document.checkpoints.length;

    for (let absoluteCheckpointIndex = startIndex; absoluteCheckpointIndex < nextStart; absoluteCheckpointIndex += 1) {
      const checkpointIndex = absoluteCheckpointIndex - startIndex;
      const checkpoint = document.checkpoints[absoluteCheckpointIndex];
      const checkpointReference = formatHaxCheckpointReference(levelIndex, checkpointIndex);

      if (!isCompleteDraftVec3(checkpoint.position)) {
        blockingReasons.push(
          formatIncompleteDraftVec3Message(checkpointReference, checkpoint.position)
        );
      }

      checkpoint.effects.forEach((effect, effectIndex) => {
        if (!isCompleteDraftVec3(effect.position)) {
          blockingReasons.push(
            formatIncompleteDraftVec3Message(
              `${checkpointReference} ${toTitleCase(getEffectName(effect.type))} ${effectIndex + 1}`,
              effect.position
            )
          );
        }
      });
    }
  });

  return {
    isRenderReady: blockingReasons.length === 0,
    blockingReasons
  };
}

export function validateDocumentRenderReadiness(document: WorkspaceDocument | null): RenderReadiness {
  if (!document) {
    return {
      isRenderReady: false,
      blockingReasons: []
    };
  }

  return document.format === 'hax' ? validateHaxDocument(document) : validateDraftMap(document.map);
}
