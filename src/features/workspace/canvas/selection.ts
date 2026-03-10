import type { ChildEntityCategory, EditorSelection } from '@/features/workspace/types';
import type { EditorNodeKind, EditorSocketKind } from '@/features/workspace/graph/types';
import { getCheckpointNodeId, getSelectionNodeId } from '@/features/workspace/graph/nodeIds';

export function getCheckpointId(levelIndex: number, checkpointIndex: number): string {
  return getCheckpointNodeId(levelIndex, checkpointIndex);
}

export function getCheckpointIdFromSelection(selection: EditorSelection | null): string | null {
  if (!selection) {
    return null;
  }

  switch (selection.kind) {
    case 'checkpoint':
    case 'momentumEntities':
    case 'haxEffects':
    case 'haxMissions':
    case 'haxMission':
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
    case 'bot':
    case 'impulse':
    case 'portal':
    case 'haxEffect':
    case 'haxPortalPair':
    case 'haxZiplinePair':
      return getCheckpointId(selection.levelIndex, selection.checkpointIndex);
    default:
      return null;
  }
}

export function isStackNodeKind(kind: EditorNodeKind): kind is 'touchStack' | 'abilityStack' | 'lavaStack' | 'haxEffectStack' {
  return kind === 'touchStack' || kind === 'abilityStack' || kind === 'lavaStack' || kind === 'haxEffectStack';
}

export function getChildCategoryFromSocket(socket: EditorSocketKind): ChildEntityCategory | null {
  switch (socket) {
    case 'touch':
      return 'touch';
    case 'ability':
      return 'ability';
    case 'lava':
      return 'lava';
    case 'bot':
    case 'impulse':
    case 'portal':
      return null;
  }
}

export function getSelectionPath(selection: EditorSelection | null): string {
  if (!selection) {
    return 'No selection';
  }

  switch (selection.kind) {
    case 'start':
      return 'Spawn';
    case 'level':
      return `Level ${selection.levelIndex + 1}`;
    case 'checkpoint':
      return `Checkpoint ${selection.checkpointIndex + 1}`;
    case 'momentumEntities':
      return 'Entities';
    case 'haxSpawnEffects':
      return 'Spawn Effects';
    case 'haxEffects':
      return 'Effects';
    case 'haxMissions':
      return 'Missions';
    case 'haxMission':
      return `Mission ${selection.missionIndex + 1}`;
    case 'touchOrb':
      return `Touch Orb ${selection.orbIndex + 1}`;
    case 'abilityOrb':
      return `Ability Orb ${selection.orbIndex + 1}`;
    case 'lavaOrb':
      return `Lava Orb ${selection.orbIndex + 1}`;
    case 'bot':
      return 'Bot';
    case 'impulse':
      return `Impulse ${selection.impulseIndex + 1}`;
    case 'portal':
      return `Portal ${selection.portalIndex + 1}`;
    case 'haxSpawnEffect':
      return `Effect ${selection.effectIndex + 1}`;
    case 'haxEffect':
      return `Effect ${selection.effectIndex + 1}`;
    case 'haxSpawnPortalPair':
      return 'Portal Pair';
    case 'haxPortalPair':
      return 'Portal Pair';
    case 'haxSpawnZiplinePair':
      return 'Zipline Pair';
    case 'haxZiplinePair':
      return 'Zipline Pair';
  }
}

export function getNodeIdFromSelection(selection: EditorSelection): string {
  return getSelectionNodeId(selection);
}

export function selectionMatchesNode(selection: EditorSelection | null, node: { id: string }): boolean {
  return selection ? getNodeIdFromSelection(selection) === node.id : false;
}
