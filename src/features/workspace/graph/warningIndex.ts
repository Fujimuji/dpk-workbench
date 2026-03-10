import type { ConversionWarning } from '@/domain/warnings/types';
import type { EditorNodeKind } from '@/features/workspace/graph/types';

export function getWarningsForNode(
  warnings: ConversionWarning[],
  kind: EditorNodeKind | 'checkpoint',
  levelIndex?: number,
  checkpointNumber?: number,
  entityIndex?: number
): ConversionWarning[] {
  return warnings.filter((warning) => {
    if (warning.targetKind !== kind) {
      return false;
    }

    if (warning.levelIndex !== levelIndex) {
      return false;
    }

    if (warning.checkpointNumber !== checkpointNumber) {
      return false;
    }

    if (kind === 'touchOrb' || kind === 'abilityOrb' || kind === 'lavaOrb') {
      return warning.orbIndex === entityIndex;
    }

    if (kind === 'impulse' || kind === 'portal') {
      return warning.effectIndex === entityIndex;
    }

    return true;
  });
}
