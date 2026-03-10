import {
  addImpulse,
  addAbilityOrb,
  addLavaOrb,
  addPortal,
  addTouchOrb,
  setBot
} from '@/domain/model/mutators';
import { createEmptyDraftVec3 } from '@/domain/model/draftVectors';
import type { MomentumMapModel } from '@/domain/model/types';
import type {
  EditorGraphModel,
  EditorSocketKind
} from '@/features/workspace/graph/types';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';

interface SocketActionResult {
  nextMap: MomentumMapModel;
  nextSelection: EditorSelection;
}

function getCheckpointData(map: MomentumMapModel, levelIndex: number, checkpointIndex: number) {
  const level = map.levels[levelIndex];
  if (!level) {
    return null;
  }

  const checkpoint = level.checkpoints[checkpointIndex];
  if (!checkpoint) {
    return null;
  }

  return {
    checkpoint,
    config: level.checkpointConfigs[checkpointIndex] ?? null,
    isFinish: checkpointIndex >= level.checkpointConfigs.length
  };
}

export function createSocketActionResult(
  _graph: EditorGraphModel | null,
  map: MomentumMapModel,
  node: WorkspaceNodeSummary,
  socket: EditorSocketKind
): SocketActionResult | null {
  if (
    (node.kind !== 'checkpoint' && node.kind !== 'momentumEntities') ||
    node.levelIndex === undefined ||
    node.checkpointIndex === undefined
  ) {
    return null;
  }

  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  if (!checkpointData || checkpointData.isFinish) {
    return null;
  }

  const { checkpoint, config } = checkpointData;

  if (socket === 'touch') {
    const nextIndex = config?.touchOrbs?.length ?? 0;
    return {
      nextMap: addTouchOrb(map, node.levelIndex, node.checkpointIndex, { position: createEmptyDraftVec3(), radius: 1 }),
      nextSelection: { kind: 'touchOrb', levelIndex: node.levelIndex, checkpointIndex: node.checkpointIndex, orbIndex: nextIndex }
    };
  }

  if (socket === 'ability') {
    const nextIndex = config?.abilityOrbs?.length ?? 0;
    return {
      nextMap: addAbilityOrb(map, node.levelIndex, node.checkpointIndex, {
        position: createEmptyDraftVec3(),
        radius: 1,
        abilities: { seismicSlam: true, powerblock: true, rocketPunch: true }
      }),
      nextSelection: { kind: 'abilityOrb', levelIndex: node.levelIndex, checkpointIndex: node.checkpointIndex, orbIndex: nextIndex }
    };
  }

  if (socket === 'lava') {
    const nextIndex = config?.lava?.length ?? 0;
    return {
      nextMap: addLavaOrb(map, node.levelIndex, node.checkpointIndex, { position: createEmptyDraftVec3(), radius: 1 }),
      nextSelection: { kind: 'lavaOrb', levelIndex: node.levelIndex, checkpointIndex: node.checkpointIndex, orbIndex: nextIndex }
    };
  }

  if (socket === 'impulse') {
    const nextIndex = config?.impulses?.length ?? 0;
    return {
      nextMap: addImpulse(map, node.levelIndex, node.checkpointIndex, {
        position: createEmptyDraftVec3(),
        direction: { x: 0, y: 1, z: 0 },
        speed: 10
      }),
      nextSelection: { kind: 'impulse', levelIndex: node.levelIndex, checkpointIndex: node.checkpointIndex, impulseIndex: nextIndex }
    };
  }

  if (socket === 'portal') {
    const nextIndex = config?.portals?.length ?? 0;
    const nextCheckpoint = map.levels[node.levelIndex]?.checkpoints[node.checkpointIndex + 1];
    return {
      nextMap: addPortal(map, node.levelIndex, node.checkpointIndex, {
        entry: createEmptyDraftVec3(),
        exit: createEmptyDraftVec3()
      }),
      nextSelection: { kind: 'portal', levelIndex: node.levelIndex, checkpointIndex: node.checkpointIndex, portalIndex: nextIndex }
    };
  }

  return {
    nextMap: setBot(map, node.levelIndex, node.checkpointIndex, {
      position: createEmptyDraftVec3(),
      validAbilities: { primaryFire: true, seismicSlam: true, rocketPunch: true }
    }),
    nextSelection: { kind: 'bot', levelIndex: node.levelIndex, checkpointIndex: node.checkpointIndex }
  };
}
