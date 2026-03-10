import type { StructuralIndexRemap } from '@/domain/model/mutators/structure';
import { parseEditorNodeId, remapEditorNodeId } from '@/features/workspace/graph/nodeIds';
import type { ChildGroupState, EditorLayoutState, EditorSelection, MultiNodeSelection } from '@/features/workspace/types';

function remapLevelIndex(levelIndex: number, remap: StructuralIndexRemap): number | null {
  return remap.levelIndexMap[levelIndex] ?? null;
}

function remapCheckpointIndex(levelIndex: number, checkpointIndex: number, remap: StructuralIndexRemap): number | null {
  const nextLevelIndex = remapLevelIndex(levelIndex, remap);
  if (nextLevelIndex === null) {
    return null;
  }

  const checkpointMap = remap.checkpointIndexMapByLevel[levelIndex];
  return checkpointMap?.[checkpointIndex] ?? checkpointIndex;
}

function remapNodeId(nodeId: string, remap: StructuralIndexRemap): string | null {
  return remapEditorNodeId(nodeId, remap);
}

export function remapEditorSelection(selection: EditorSelection | null, remap: StructuralIndexRemap): EditorSelection | null {
  if (!selection) {
    return null;
  }

  switch (selection.kind) {
    case 'start':
    case 'haxSpawnEffects':
    case 'haxSpawnEffect':
    case 'haxSpawnPortalPair':
    case 'haxSpawnZiplinePair':
      return selection;
    case 'level': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      return nextLevelIndex === null ? null : { kind: 'level', levelIndex: nextLevelIndex };
    }
    case 'checkpoint': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : { kind: 'checkpoint', levelIndex: nextLevelIndex, checkpointIndex: nextCheckpointIndex };
    }
    case 'momentumEntities': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : { kind: 'momentumEntities', levelIndex: nextLevelIndex, checkpointIndex: nextCheckpointIndex };
    }
    case 'haxEffects':
    case 'haxMissions': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : { ...selection, levelIndex: nextLevelIndex, checkpointIndex: nextCheckpointIndex };
    }
    case 'haxMission': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : { ...selection, levelIndex: nextLevelIndex, checkpointIndex: nextCheckpointIndex };
    }
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : {
            kind: selection.kind,
            levelIndex: nextLevelIndex,
            checkpointIndex: nextCheckpointIndex,
            orbIndex: selection.orbIndex
          };
    }
    case 'bot': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : { kind: 'bot', levelIndex: nextLevelIndex, checkpointIndex: nextCheckpointIndex };
    }
    case 'impulse': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : {
            kind: 'impulse',
            levelIndex: nextLevelIndex,
            checkpointIndex: nextCheckpointIndex,
            impulseIndex: selection.impulseIndex
          };
    }
    case 'portal': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : {
            kind: 'portal',
            levelIndex: nextLevelIndex,
            checkpointIndex: nextCheckpointIndex,
            portalIndex: selection.portalIndex
          };
    }
    case 'haxEffect':
      {
        const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
        const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
        return nextLevelIndex === null || nextCheckpointIndex === null
          ? null
          : {
              kind: 'haxEffect',
              levelIndex: nextLevelIndex,
              checkpointIndex: nextCheckpointIndex,
              effectIndex: selection.effectIndex
            };
      }
    case 'haxPortalPair':
    case 'haxZiplinePair': {
      const nextLevelIndex = remapLevelIndex(selection.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(selection.levelIndex, selection.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : {
            ...selection,
            levelIndex: nextLevelIndex,
            checkpointIndex: nextCheckpointIndex
          };
    }
  }
}

export function remapMultiSelection(selection: MultiNodeSelection, remap: StructuralIndexRemap): MultiNodeSelection {
  const nextIds = selection
    .map((nodeId) => remapNodeId(nodeId, remap))
    .filter((nodeId): nodeId is string => Boolean(nodeId));

  return Array.from(new Set(nextIds));
}

export function remapNodeIds(nodeIds: string[], remap: StructuralIndexRemap): string[] {
  const nextIds = nodeIds
    .map((nodeId) => remapNodeId(nodeId, remap))
    .filter((nodeId): nodeId is string => Boolean(nodeId));

  return Array.from(new Set(nextIds));
}

export function remapLayoutState(layout: EditorLayoutState, remap: StructuralIndexRemap): EditorLayoutState {
  const nextLayout: EditorLayoutState = {};

  Object.entries(layout).forEach(([nodeId, position]) => {
    const nextNodeId = remapNodeId(nodeId, remap);
    if (nextNodeId) {
      nextLayout[nextNodeId] = position;
    }
  });

  return nextLayout;
}

export function remapChildGroups(groups: ChildGroupState, remap: StructuralIndexRemap): ChildGroupState {
  return groups
    .map((group) => {
      const nextLevelIndex = remapLevelIndex(group.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(group.levelIndex, group.checkpointIndex, remap);
      if (nextLevelIndex === null || nextCheckpointIndex === null) {
        return null;
      }

      if ('format' in group && group.format === 'hax') {
        const nextNodeIds = group.nodeIds
          .map((nodeId) => remapNodeId(nodeId, remap))
          .filter((nodeId): nodeId is string => Boolean(nodeId));

        return {
          ...group,
          levelIndex: nextLevelIndex,
          checkpointIndex: nextCheckpointIndex,
          nodeIds: nextNodeIds
        };
      }

      return {
        ...group,
        levelIndex: nextLevelIndex,
        checkpointIndex: nextCheckpointIndex
      };
    })
    .filter((group): group is ChildGroupState[number] => Boolean(group));
}

export function remapFocusedCheckpointId(checkpointId: string | null, remap: StructuralIndexRemap): string | null {
  if (!checkpointId) {
    return null;
  }

  const remapped = remapNodeId(checkpointId, remap);
  return remapped && parseEditorNodeId(remapped)?.kind === 'checkpoint' ? remapped : null;
}
