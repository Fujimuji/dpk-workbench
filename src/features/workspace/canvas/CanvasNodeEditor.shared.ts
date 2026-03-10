import type {
  AbilityFlags,
  BotAbilityFlags,
  CheckpointConfig,
  CheckpointMarker,
  MomentumMapModel
} from '@/domain/model/types';
import type { EditorNodeKind, WorkspaceNodeSummary } from '@/features/workspace/graph/types';

export type NodeEditorTab = 'main' | 'notes';

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function countEnabledAbilities(flags: AbilityFlags): number {
  return Number(flags.seismicSlam) + Number(flags.powerblock) + Number(flags.rocketPunch);
}

export function countEnabledBotAbilities(flags: BotAbilityFlags): number {
  return Number(flags.primaryFire) + Number(flags.seismicSlam) + Number(flags.rocketPunch);
}

export function getNodeLabel(node: WorkspaceNodeSummary): string {
  return node.kind === 'start' ? 'Spawn checkpoint' : node.kind === 'level' ? node.sublabel : node.label;
}

export function getEditorHeaderTitle(node: WorkspaceNodeSummary): string {
  if (node.kind === 'start') {
    return 'Spawn';
  }

  return node.label;
}

export function getEditorHeaderMeta(node: WorkspaceNodeSummary, map: MomentumMapModel | null): string | null {
  if (node.kind === 'start') {
    return 'Start position';
  }

  if (
    (
      node.kind === 'momentumEntities' ||
      node.kind === 'touchOrb' ||
      node.kind === 'abilityOrb' ||
      node.kind === 'lavaOrb' ||
      node.kind === 'bot' ||
      node.kind === 'impulse' ||
      node.kind === 'portal' ||
      node.kind === 'haxEffects' ||
      node.kind === 'haxMissions' ||
      node.kind === 'haxMission' ||
      node.kind === 'haxEffect' ||
      node.kind === 'haxEffectPair'
    ) &&
    node.levelIndex !== undefined &&
    node.checkpointNumber !== undefined
  ) {
    const levelName = map?.levels[node.levelIndex]?.name;
    if (levelName) {
      return `${levelName} - Checkpoint ${node.checkpointNumber}`;
    }
    return `Level ${node.levelIndex + 1} - Checkpoint ${node.checkpointNumber}`;
  }

  if (
    (node.kind === 'haxEffects' || node.kind === 'haxEffect' || node.kind === 'haxEffectPair') &&
    (node.selection.kind === 'haxSpawnEffects' ||
      node.selection.kind === 'haxSpawnEffect' ||
      node.selection.kind === 'haxSpawnPortalPair' ||
      node.selection.kind === 'haxSpawnZiplinePair')
  ) {
    return 'Spawn';
  }

  if (node.kind === 'checkpoint') {
    return node.sublabel !== 'Checkpoint' ? node.sublabel : null;
  }

  return node.sublabel && node.sublabel !== node.label ? node.sublabel : null;
}

export function isEntityNodeKind(kind: EditorNodeKind): boolean {
  return (
    kind === 'momentumEntities' ||
    kind === 'touchOrb' ||
    kind === 'abilityOrb' ||
    kind === 'lavaOrb' ||
    kind === 'bot' ||
    kind === 'impulse' ||
    kind === 'portal' ||
    kind === 'haxMission' ||
    kind === 'haxEffect' ||
    kind === 'haxEffectPair'
  );
}

export function getCheckpointData(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number
): {
  checkpoint: CheckpointMarker;
  config: CheckpointConfig | null;
  isFinish: boolean;
} | null {
  const level = map.levels[levelIndex];
  if (!level) {
    return null;
  }

  const checkpoint = level.checkpoints[checkpointIndex];
  if (!checkpoint) {
    return null;
  }

  return {
    checkpoint: 'position' in checkpoint ? checkpoint : { position: checkpoint, radius: 2 },
    config: level.checkpointConfigs[checkpointIndex] ?? null,
    isFinish: checkpointIndex >= level.checkpointConfigs.length
  };
}
