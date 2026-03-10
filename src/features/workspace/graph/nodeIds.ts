import type { StructuralIndexRemap } from '@/domain/model/mutators/structure';
import type { EditorSelection } from '@/features/workspace/types';

export function getCheckpointNodeId(levelIndex: number, checkpointIndex: number): string {
  return `level-${levelIndex}-cp-${checkpointIndex + 1}`;
}

export function getHaxEffectsNodeId(levelIndex: number, checkpointIndex: number): string {
  return `${getCheckpointNodeId(levelIndex, checkpointIndex)}-haxEffects`;
}

export function getMomentumEntitiesNodeId(levelIndex: number, checkpointIndex: number): string {
  return `${getCheckpointNodeId(levelIndex, checkpointIndex)}-momentumEntities`;
}

export function getHaxSpawnEffectsNodeId(): string {
  return 'root-haxEffects';
}

export function getHaxMissionsNodeId(levelIndex: number, checkpointIndex: number): string {
  return `${getCheckpointNodeId(levelIndex, checkpointIndex)}-haxMissions`;
}

export function getHaxMissionNodeId(levelIndex: number, checkpointIndex: number, missionIndex: number): string {
  return `${getCheckpointNodeId(levelIndex, checkpointIndex)}-haxMission-${missionIndex}`;
}

export function getHaxSpawnEffectNodeId(effectIndex: number): string {
  return `root-haxEffect-${effectIndex}`;
}

export function getHaxSpawnPairNodeId(
  kind: 'haxPortalPair' | 'haxZiplinePair',
  effectIndex: number,
  pairEffectIndex: number
): string {
  return `root-${kind}-${effectIndex}-${pairEffectIndex}`;
}

export type ParsedEditorNodeId =
  | { kind: 'root' }
  | { kind: 'level'; levelIndex: number }
  | { kind: 'checkpoint'; levelIndex: number; checkpointIndex: number }
  | { kind: 'momentumEntities'; levelIndex: number; checkpointIndex: number }
  | { kind: 'haxEffects'; levelIndex: number; checkpointIndex: number }
  | { kind: 'haxMissions'; levelIndex: number; checkpointIndex: number }
  | { kind: 'haxMission'; levelIndex: number; checkpointIndex: number; missionIndex: number }
  | {
      kind: 'orb';
      levelIndex: number;
      checkpointIndex: number;
      orbKind: 'touchOrb' | 'abilityOrb' | 'lavaOrb';
      orbIndex: number;
    }
  | { kind: 'bot'; levelIndex: number; checkpointIndex: number }
  | { kind: 'impulse'; levelIndex: number; checkpointIndex: number; impulseIndex: number }
  | { kind: 'portal'; levelIndex: number; checkpointIndex: number; portalIndex: number }
  | {
      kind: 'stack';
      levelIndex: number;
      checkpointIndex: number;
      stackKind: 'touchStack' | 'abilityStack' | 'lavaStack';
      memberSuffix: string;
    }
  | { kind: 'haxEffect'; levelIndex: number; checkpointIndex: number; effectIndex: number }
  | {
      kind: 'haxPair';
      levelIndex: number;
      checkpointIndex: number;
      pairKind: 'haxPortalPair' | 'haxZiplinePair';
      effectIndex: number;
      pairEffectIndex: number;
    }
  | { kind: 'haxEffectStack'; levelIndex: number; checkpointIndex: number; stackKey: string }
  | { kind: 'haxSpawnEffects' }
  | { kind: 'haxSpawnEffect'; effectIndex: number }
  | {
      kind: 'haxSpawnPair';
      pairKind: 'haxPortalPair' | 'haxZiplinePair';
      effectIndex: number;
      pairEffectIndex: number;
    };

const LEVEL_RE = /^level-(\d+)$/;
const CHECKPOINT_RE = /^level-(\d+)-cp-(\d+)$/;
const MOMENTUM_ENTITIES_RE = /^level-(\d+)-cp-(\d+)-momentumEntities$/;
const HAX_EFFECTS_RE = /^level-(\d+)-cp-(\d+)-haxEffects$/;
const HAX_MISSIONS_RE = /^level-(\d+)-cp-(\d+)-haxMissions$/;
const HAX_MISSION_RE = /^level-(\d+)-cp-(\d+)-haxMission-(\d+)$/;
const ORB_RE = /^level-(\d+)-cp-(\d+)-(touchOrb|abilityOrb|lavaOrb)-(\d+)$/;
const BOT_RE = /^level-(\d+)-cp-(\d+)-bot$/;
const IMPULSE_RE = /^level-(\d+)-cp-(\d+)-impulse-(\d+)$/;
const PORTAL_RE = /^level-(\d+)-cp-(\d+)-portal-(\d+)$/;
const STACK_RE = /^level-(\d+)-cp-(\d+)-(touchStack|abilityStack|lavaStack)-(\d+(?:-\d+)*)$/;
const HAX_EFFECT_RE = /^level-(\d+)-cp-(\d+)-haxEffect-(\d+)$/;
const HAX_PAIR_RE = /^level-(\d+)-cp-(\d+)-(haxPortalPair|haxZiplinePair)-(\d+)-(\d+)$/;
const HAX_STACK_RE = /^level-(\d+)-cp-(\d+)-haxEffectStack-(.+)$/;
const ROOT_HAX_EFFECT_RE = /^root-haxEffect-(\d+)$/;
const ROOT_HAX_PAIR_RE = /^root-(haxPortalPair|haxZiplinePair)-(\d+)-(\d+)$/;

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

export function parseEditorNodeId(nodeId: string): ParsedEditorNodeId | null {
  if (nodeId === 'root') {
    return { kind: 'root' };
  }

  if (nodeId === getHaxSpawnEffectsNodeId()) {
    return { kind: 'haxSpawnEffects' };
  }

  const rootEffectMatch = ROOT_HAX_EFFECT_RE.exec(nodeId);
  if (rootEffectMatch) {
    return { kind: 'haxSpawnEffect', effectIndex: Number(rootEffectMatch[1]) };
  }

  const rootPairMatch = ROOT_HAX_PAIR_RE.exec(nodeId);
  if (rootPairMatch) {
    return {
      kind: 'haxSpawnPair',
      pairKind: rootPairMatch[1] as 'haxPortalPair' | 'haxZiplinePair',
      effectIndex: Number(rootPairMatch[2]),
      pairEffectIndex: Number(rootPairMatch[3])
    };
  }

  const levelMatch = LEVEL_RE.exec(nodeId);
  if (levelMatch) {
    return { kind: 'level', levelIndex: Number(levelMatch[1]) };
  }

  const checkpointMatch = CHECKPOINT_RE.exec(nodeId);
  if (checkpointMatch) {
    return {
      kind: 'checkpoint',
      levelIndex: Number(checkpointMatch[1]),
      checkpointIndex: Number(checkpointMatch[2]) - 1
    };
  }

  const momentumEntitiesMatch = MOMENTUM_ENTITIES_RE.exec(nodeId);
  if (momentumEntitiesMatch) {
    return {
      kind: 'momentumEntities',
      levelIndex: Number(momentumEntitiesMatch[1]),
      checkpointIndex: Number(momentumEntitiesMatch[2]) - 1
    };
  }

  const haxEffectsMatch = HAX_EFFECTS_RE.exec(nodeId);
  if (haxEffectsMatch) {
    return {
      kind: 'haxEffects',
      levelIndex: Number(haxEffectsMatch[1]),
      checkpointIndex: Number(haxEffectsMatch[2]) - 1
    };
  }

  const haxMissionsMatch = HAX_MISSIONS_RE.exec(nodeId);
  if (haxMissionsMatch) {
    return {
      kind: 'haxMissions',
      levelIndex: Number(haxMissionsMatch[1]),
      checkpointIndex: Number(haxMissionsMatch[2]) - 1
    };
  }

  const haxMissionMatch = HAX_MISSION_RE.exec(nodeId);
  if (haxMissionMatch) {
    return {
      kind: 'haxMission',
      levelIndex: Number(haxMissionMatch[1]),
      checkpointIndex: Number(haxMissionMatch[2]) - 1,
      missionIndex: Number(haxMissionMatch[3])
    };
  }

  const orbMatch = ORB_RE.exec(nodeId);
  if (orbMatch) {
    return {
      kind: 'orb',
      levelIndex: Number(orbMatch[1]),
      checkpointIndex: Number(orbMatch[2]) - 1,
      orbKind: orbMatch[3] as 'touchOrb' | 'abilityOrb' | 'lavaOrb',
      orbIndex: Number(orbMatch[4])
    };
  }

  const botMatch = BOT_RE.exec(nodeId);
  if (botMatch) {
    return {
      kind: 'bot',
      levelIndex: Number(botMatch[1]),
      checkpointIndex: Number(botMatch[2]) - 1
    };
  }

  const impulseMatch = IMPULSE_RE.exec(nodeId);
  if (impulseMatch) {
    return {
      kind: 'impulse',
      levelIndex: Number(impulseMatch[1]),
      checkpointIndex: Number(impulseMatch[2]) - 1,
      impulseIndex: Number(impulseMatch[3])
    };
  }

  const portalMatch = PORTAL_RE.exec(nodeId);
  if (portalMatch) {
    return {
      kind: 'portal',
      levelIndex: Number(portalMatch[1]),
      checkpointIndex: Number(portalMatch[2]) - 1,
      portalIndex: Number(portalMatch[3])
    };
  }

  const stackMatch = STACK_RE.exec(nodeId);
  if (stackMatch) {
    return {
      kind: 'stack',
      levelIndex: Number(stackMatch[1]),
      checkpointIndex: Number(stackMatch[2]) - 1,
      stackKind: stackMatch[3] as 'touchStack' | 'abilityStack' | 'lavaStack',
      memberSuffix: stackMatch[4]
    };
  }

  const haxEffectMatch = HAX_EFFECT_RE.exec(nodeId);
  if (haxEffectMatch) {
    return {
      kind: 'haxEffect',
      levelIndex: Number(haxEffectMatch[1]),
      checkpointIndex: Number(haxEffectMatch[2]) - 1,
      effectIndex: Number(haxEffectMatch[3])
    };
  }

  const haxPairMatch = HAX_PAIR_RE.exec(nodeId);
  if (haxPairMatch) {
    return {
      kind: 'haxPair',
      levelIndex: Number(haxPairMatch[1]),
      checkpointIndex: Number(haxPairMatch[2]) - 1,
      pairKind: haxPairMatch[3] as 'haxPortalPair' | 'haxZiplinePair',
      effectIndex: Number(haxPairMatch[4]),
      pairEffectIndex: Number(haxPairMatch[5])
    };
  }

  const haxStackMatch = HAX_STACK_RE.exec(nodeId);
  if (haxStackMatch) {
    return {
      kind: 'haxEffectStack',
      levelIndex: Number(haxStackMatch[1]),
      checkpointIndex: Number(haxStackMatch[2]) - 1,
      stackKey: haxStackMatch[3]
    };
  }

  return null;
}

function formatParsedEditorNodeId(parsed: ParsedEditorNodeId): string {
  switch (parsed.kind) {
    case 'root':
      return 'root';
    case 'level':
      return `level-${parsed.levelIndex}`;
    case 'checkpoint':
      return getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex);
    case 'momentumEntities':
      return getMomentumEntitiesNodeId(parsed.levelIndex, parsed.checkpointIndex);
    case 'haxEffects':
      return getHaxEffectsNodeId(parsed.levelIndex, parsed.checkpointIndex);
    case 'haxMissions':
      return getHaxMissionsNodeId(parsed.levelIndex, parsed.checkpointIndex);
    case 'haxMission':
      return getHaxMissionNodeId(parsed.levelIndex, parsed.checkpointIndex, parsed.missionIndex);
    case 'orb':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-${parsed.orbKind}-${parsed.orbIndex}`;
    case 'bot':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-bot`;
    case 'impulse':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-impulse-${parsed.impulseIndex}`;
    case 'portal':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-portal-${parsed.portalIndex}`;
    case 'stack':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-${parsed.stackKind}-${parsed.memberSuffix}`;
    case 'haxEffect':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-haxEffect-${parsed.effectIndex}`;
    case 'haxPair':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-${parsed.pairKind}-${parsed.effectIndex}-${parsed.pairEffectIndex}`;
    case 'haxEffectStack':
      return `${getCheckpointNodeId(parsed.levelIndex, parsed.checkpointIndex)}-haxEffectStack-${parsed.stackKey}`;
    case 'haxSpawnEffects':
      return getHaxSpawnEffectsNodeId();
    case 'haxSpawnEffect':
      return getHaxSpawnEffectNodeId(parsed.effectIndex);
    case 'haxSpawnPair':
      return getHaxSpawnPairNodeId(parsed.pairKind, parsed.effectIndex, parsed.pairEffectIndex);
  }
}

export function remapEditorNodeId(nodeId: string, remap: StructuralIndexRemap): string | null {
  const parsed = parseEditorNodeId(nodeId);
  if (!parsed) {
    return nodeId;
  }

  switch (parsed.kind) {
    case 'root':
    case 'haxSpawnEffects':
    case 'haxSpawnEffect':
    case 'haxSpawnPair':
      return formatParsedEditorNodeId(parsed);
    case 'level': {
      const nextLevelIndex = remapLevelIndex(parsed.levelIndex, remap);
      return nextLevelIndex === null ? null : formatParsedEditorNodeId({ ...parsed, levelIndex: nextLevelIndex });
    }
    default: {
      const nextLevelIndex = remapLevelIndex(parsed.levelIndex, remap);
      const nextCheckpointIndex = remapCheckpointIndex(parsed.levelIndex, parsed.checkpointIndex, remap);
      return nextLevelIndex === null || nextCheckpointIndex === null
        ? null
        : formatParsedEditorNodeId({
            ...parsed,
            levelIndex: nextLevelIndex,
            checkpointIndex: nextCheckpointIndex
          } as Exclude<ParsedEditorNodeId, { kind: 'root' | 'haxSpawnEffects' | 'haxSpawnEffect' | 'haxSpawnPair' | 'level' }>);
    }
  }
}

export function getSelectionNodeId(selection: EditorSelection): string {
  switch (selection.kind) {
    case 'start':
      return formatParsedEditorNodeId({ kind: 'root' });
    case 'level':
      return formatParsedEditorNodeId({ kind: 'level', levelIndex: selection.levelIndex });
    case 'checkpoint':
      return formatParsedEditorNodeId({
        kind: 'checkpoint',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex
      });
    case 'momentumEntities':
      return formatParsedEditorNodeId({
        kind: 'momentumEntities',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex
      });
    case 'haxSpawnEffects':
      return formatParsedEditorNodeId({ kind: 'haxSpawnEffects' });
    case 'haxEffects':
      return formatParsedEditorNodeId({
        kind: 'haxEffects',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex
      });
    case 'haxMissions':
      return formatParsedEditorNodeId({
        kind: 'haxMissions',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex
      });
    case 'haxMission':
      return formatParsedEditorNodeId({
        kind: 'haxMission',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex,
        missionIndex: selection.missionIndex
      });
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
      return formatParsedEditorNodeId({
        kind: 'orb',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex,
        orbKind: selection.kind,
        orbIndex: selection.orbIndex
      });
    case 'bot':
      return formatParsedEditorNodeId({
        kind: 'bot',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex
      });
    case 'impulse':
      return formatParsedEditorNodeId({
        kind: 'impulse',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex,
        impulseIndex: selection.impulseIndex
      });
    case 'portal':
      return formatParsedEditorNodeId({
        kind: 'portal',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex,
        portalIndex: selection.portalIndex
      });
    case 'haxSpawnEffect':
      return formatParsedEditorNodeId({ kind: 'haxSpawnEffect', effectIndex: selection.effectIndex });
    case 'haxEffect':
      return formatParsedEditorNodeId({
        kind: 'haxEffect',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex,
        effectIndex: selection.effectIndex
      });
    case 'haxSpawnPortalPair':
      return formatParsedEditorNodeId({
        kind: 'haxSpawnPair',
        pairKind: 'haxPortalPair',
        effectIndex: selection.effectIndex,
        pairEffectIndex: selection.pairEffectIndex
      });
    case 'haxPortalPair':
      return formatParsedEditorNodeId({
        kind: 'haxPair',
        pairKind: 'haxPortalPair',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex,
        effectIndex: selection.effectIndex,
        pairEffectIndex: selection.pairEffectIndex
      });
    case 'haxSpawnZiplinePair':
      return formatParsedEditorNodeId({
        kind: 'haxSpawnPair',
        pairKind: 'haxZiplinePair',
        effectIndex: selection.effectIndex,
        pairEffectIndex: selection.pairEffectIndex
      });
    case 'haxZiplinePair':
      return formatParsedEditorNodeId({
        kind: 'haxPair',
        pairKind: 'haxZiplinePair',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex,
        effectIndex: selection.effectIndex,
        pairEffectIndex: selection.pairEffectIndex
      });
  }
}

export function nodeMatchesSelection(selection: EditorSelection | null, nodeId: string): boolean {
  if (!selection) {
    return false;
  }

  return getSelectionNodeId(selection) === nodeId;
}
