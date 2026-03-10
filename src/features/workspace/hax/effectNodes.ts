import {
  getFirstAvailableMissionId,
  getMissionDisplayName,
  type HaxMission
} from '@/domain/import/hax/missionRules';
import { decodeHaxEffectPrimeState, getHaxEffectPrimeFields } from '@/domain/import/hax/effectPrimePayloads';
import {
  HAX_BOUNCE_DEFAULT_IMPULSE_POWER,
  HAX_BOUNCE_FIXED_DIRECTION,
  HAX_BOUNCE_KILL_MOMENTUM_POWER,
  HAX_BOUNCE_STALL_POWER,
  HAX_PORTAL_RADIUS,
  getHaxBounceVariant
} from '@/domain/import/hax/effectRules';
import type { HaxEffect } from '@/domain/import/hax/types';
import { createEmptyDraftVec3 } from '@/domain/model/draftVectors';
import {
  getCheckpointNodeId,
  getHaxEffectsNodeId,
  getHaxSpawnEffectNodeId,
  getHaxSpawnEffectsNodeId,
  getHaxSpawnPairNodeId,
  getHaxMissionNodeId,
  getHaxMissionsNodeId
} from '@/features/workspace/graph/nodeIds';
import type { EditorNodeIconKey } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';

export type HaxEffectTemplateId =
  | 'time'
  | 'death'
  | 'ability'
  | 'permeation'
  | 'checkpoint'
  | 'portal'
  | 'blackhole'
  | 'zipline'
  | 'shootableOrb'
  | 'bounce';

interface HaxBaseNodeEntry {
  accentColor: string;
  accentSoftColor: string;
  iconKey?: EditorNodeIconKey;
  id: string;
  label: string;
  selection: EditorSelection;
  sublabel: string;
}

export interface HaxEffectNodeEntry extends HaxBaseNodeEntry {
  effectIndexes: number[];
  iconKey: EditorNodeIconKey;
}

export interface HaxMissionNodeEntry extends HaxBaseNodeEntry {
  kind: 'haxMission';
  missionIndex: number;
}

export type HaxWrapperChildEntry =
  | (HaxEffectNodeEntry & { kind: 'haxEffect' | 'haxEffectPair' })
  | HaxMissionNodeEntry;

export interface HaxWrapperNodeEntry extends HaxBaseNodeEntry {
  children: HaxWrapperChildEntry[];
  kind: 'haxEffects' | 'haxMissions';
}

export type VisibleHaxCheckpointChildEntry = HaxWrapperNodeEntry;
export type VisibleHaxSpawnChildEntry = HaxWrapperNodeEntry;

type HaxEffectOwner =
  | {
      checkpointIndex: number;
      kind: 'checkpoint';
      levelIndex: number;
      nodePrefix: string;
    }
  | {
      kind: 'spawn';
      nodePrefix: 'root';
    };

function formatCompactNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function getSignedNumberLabel(value: number): string {
  return value > 0 ? `+${formatCompactNumber(value)}` : formatCompactNumber(value);
}

function getNodeBaseLabel(effect: HaxEffect): string {
  switch (effect.type) {
    case 0:
      return 'Time Effect';
    case 1:
      return 'Death Effect';
    case 2:
      return 'Ability Effect';
    case 3:
      return 'Permeation Effect';
    case 4:
      return 'Checkpoint Effect';
    case 5:
      return 'Portal Entry';
    case 6:
      return 'Portal Exit';
    case 7:
      return 'Blackhole Effect';
    case 8:
      return 'Zipline Start';
    case 9:
      return 'Zipline End';
    case 10:
      return 'Shootable Orb';
    case 11:
      return 'Bounce Orb';
  }
}

function getSingleNodeAccent(effect: HaxEffect): Pick<HaxEffectNodeEntry, 'accentColor' | 'accentSoftColor'> {
  switch (effect.type) {
    case 0:
      return effect.radius < 0
        ? { accentColor: '#b78cff', accentSoftColor: 'rgba(183, 140, 255, 0.22)' }
        : { accentColor: '#7ddcff', accentSoftColor: 'rgba(125, 220, 255, 0.22)' };
    case 1:
      return { accentColor: '#ff6b6b', accentSoftColor: 'rgba(255, 107, 107, 0.2)' };
    case 2:
      return { accentColor: '#dde8f4', accentSoftColor: 'rgba(221, 232, 244, 0.22)' };
    case 3:
      return { accentColor: '#9dff57', accentSoftColor: 'rgba(157, 255, 87, 0.2)' };
    case 4:
      return { accentColor: '#ffb347', accentSoftColor: 'rgba(255, 179, 71, 0.22)' };
    case 5:
      return { accentColor: '#ff9f43', accentSoftColor: 'rgba(255, 159, 67, 0.2)' };
    case 6:
      return { accentColor: '#7ddcff', accentSoftColor: 'rgba(125, 220, 255, 0.22)' };
    case 7:
      return { accentColor: '#1f2229', accentSoftColor: 'rgba(31, 34, 41, 0.24)' };
    case 8:
    case 9:
      return { accentColor: '#4d8dff', accentSoftColor: 'rgba(77, 141, 255, 0.2)' };
    case 10:
      return { accentColor: '#3fe0d0', accentSoftColor: 'rgba(63, 224, 208, 0.2)' };
    case 11:
      return { accentColor: '#ff9f43', accentSoftColor: 'rgba(255, 140, 88, 0.22)' };
  }
}

function getSingleNodeIconKey(effect: HaxEffect): EditorNodeIconKey {
  switch (effect.type) {
    case 0:
      return 'haxTime';
    case 1:
      return 'haxDeath';
    case 2:
      return 'haxAbility';
    case 3:
      return 'haxPermeation';
    case 4:
      return 'haxCheckpoint';
    case 5:
    case 6:
      return 'haxPortal';
    case 7:
      return 'haxBlackhole';
    case 8:
    case 9:
      return 'haxZipline';
    case 10:
      return 'haxShootableOrb';
    case 11:
      return 'haxBounce';
  }
}

function getSingleNodeSublabel(effect: HaxEffect): string {
  switch (effect.type) {
    case 0:
      return `${effect.radius < 0 ? 'Shootable' : 'Area'} · ${getSignedNumberLabel(
        typeof effect.payload === 'number' ? effect.payload : 0
      )}s`;
    case 1:
      return effect.radius < 0 ? 'Light Shaft' : 'Death Area';
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 10: {
      if (typeof effect.payload !== 'number') {
        return 'Unsupported Payload';
      }

      const primeState = decodeHaxEffectPrimeState(effect.type, effect.payload);
      const activeFieldCount = getHaxEffectPrimeFields(effect.type)
        .filter((field) => primeState.flags[field.key])
        .length;
      const activeExtraCount = primeState.extraFactors.length;
      const activeCount = activeFieldCount + activeExtraCount;

      if (activeCount === 0) {
        return primeState.resetCooldowns ? 'Reset Cooldowns' : 'No Prime Attributes';
      }

      return `${activeCount} Prime Attribute${activeCount === 1 ? '' : 's'}${primeState.resetCooldowns ? ' · Reset Cooldowns' : ''}`;
    }
    case 7:
      return 'Blackhole';
    case 8:
      return 'Start Marker';
    case 9:
      return 'End Marker';
    case 11:
      if (typeof effect.payload === 'number') {
        return 'Bounce';
      }

      switch (getHaxBounceVariant(effect.payload)) {
        case 'stall':
          return 'Stall';
        case 'killMomentum':
          return 'Kill Momentum';
        default:
          return `Impulse · Power ${formatCompactNumber(effect.payload.power)}`;
      }
  }
}

function buildPairLookup(effects: HaxEffect[], leftType: HaxEffect['type'], rightType: HaxEffect['type']): Map<number, number> {
  const leftIndexes: number[] = [];
  const rightIndexes: number[] = [];

  effects.forEach((effect, effectIndex) => {
    if (effect.type === leftType) {
      leftIndexes.push(effectIndex);
    } else if (effect.type === rightType) {
      rightIndexes.push(effectIndex);
    }
  });

  const pairLookup = new Map<number, number>();
  const pairCount = Math.min(leftIndexes.length, rightIndexes.length);
  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    pairLookup.set(leftIndexes[pairIndex], rightIndexes[pairIndex]);
    pairLookup.set(rightIndexes[pairIndex], leftIndexes[pairIndex]);
  }

  return pairLookup;
}

function createEffectsWrapperNode(
  owner: HaxEffectOwner,
  children: HaxWrapperChildEntry[]
): HaxWrapperNodeEntry {
  return {
    accentColor: '#7ddcff',
    accentSoftColor: 'rgba(125, 220, 255, 0.18)',
    children,
    id: owner.kind === 'spawn' ? getHaxSpawnEffectsNodeId() : getHaxEffectsNodeId(owner.levelIndex, owner.checkpointIndex),
    kind: 'haxEffects',
    label: 'Effects',
    selection:
      owner.kind === 'spawn'
        ? { kind: 'haxSpawnEffects' }
        : { kind: 'haxEffects', levelIndex: owner.levelIndex, checkpointIndex: owner.checkpointIndex },
    sublabel: children.length === 0 ? 'No Effects' : `${children.length} Node${children.length === 1 ? '' : 's'}`
  };
}

function createMissionsWrapperNode(
  levelIndex: number,
  checkpointIndex: number,
  missions: HaxMission[]
): HaxWrapperNodeEntry {
  const children = buildHaxCheckpointMissionEntries(levelIndex, checkpointIndex, missions);
  return {
    accentColor: '#ffd166',
    accentSoftColor: 'rgba(255, 209, 102, 0.18)',
    children,
    id: getHaxMissionsNodeId(levelIndex, checkpointIndex),
    kind: 'haxMissions',
    label: 'Missions',
    selection: { kind: 'haxMissions', levelIndex, checkpointIndex },
    sublabel: children.length === 0 ? 'No Missions' : `${children.length} Mission${children.length === 1 ? '' : 's'}`
  };
}

function getMissionSublabel(mission: HaxMission): string {
  return mission.kind === 'lock' ? 'Lock Mission' : `Time Mission · ${getSignedNumberLabel(mission.timeDelta ?? 0)}s`;
}

export function getNextDefaultHaxMissionId(missions: HaxMission[]) {
  return getFirstAvailableMissionId(missions.map((mission) => mission.id));
}

export function createDefaultHaxMission(missions: HaxMission[]): HaxMission | null {
  const nextMissionId = getNextDefaultHaxMissionId(missions);
  return nextMissionId ? { id: nextMissionId, kind: 'lock', timeDelta: null } : null;
}

export function createHaxEffectsFromTemplate(template: HaxEffectTemplateId): HaxEffect[] {
  switch (template) {
    case 'time':
      return [{ position: createEmptyDraftVec3(), radius: 2, type: 0, payload: 0 }];
    case 'death':
      return [{ position: createEmptyDraftVec3(), radius: 2, type: 1, payload: 1 }];
    case 'ability':
      return [{ position: createEmptyDraftVec3(), radius: 2, type: 2, payload: 0 }];
    case 'permeation':
      return [{ position: createEmptyDraftVec3(), radius: 2, type: 3, payload: 0 }];
    case 'checkpoint':
      return [{ position: createEmptyDraftVec3(), radius: 2, type: 4, payload: 0 }];
    case 'portal':
      return [
        { position: createEmptyDraftVec3(), radius: HAX_PORTAL_RADIUS, type: 5, payload: 0 },
        { position: createEmptyDraftVec3(), radius: HAX_PORTAL_RADIUS, type: 6, payload: 0 }
      ];
    case 'blackhole':
      return [{ position: createEmptyDraftVec3(), radius: 2, type: 7, payload: 0 }];
    case 'zipline':
      return [
        { position: createEmptyDraftVec3(), radius: 0, type: 8, payload: 0 },
        { position: createEmptyDraftVec3(), radius: 1, type: 9, payload: 0 }
      ];
    case 'shootableOrb':
      return [{ position: createEmptyDraftVec3(), radius: 2, type: 10, payload: 0 }];
    case 'bounce':
      return [
        {
          position: createEmptyDraftVec3(),
          radius: 2,
          type: 11,
          payload: { direction: HAX_BOUNCE_FIXED_DIRECTION, power: HAX_BOUNCE_DEFAULT_IMPULSE_POWER }
        }
      ];
  }
}

export function buildHaxCheckpointEffectEntries(
  levelIndex: number,
  checkpointIndex: number,
  effects: HaxEffect[]
): HaxEffectNodeEntry[] {
  return buildHaxEffectEntries({
    kind: 'checkpoint',
    levelIndex,
    checkpointIndex,
    nodePrefix: getCheckpointNodeId(levelIndex, checkpointIndex)
  }, effects);
}

export function buildHaxSpawnEffectEntries(effects: HaxEffect[]): HaxEffectNodeEntry[] {
  return buildHaxEffectEntries({ kind: 'spawn', nodePrefix: 'root' }, effects);
}

function buildHaxEffectEntries(
  owner: HaxEffectOwner,
  effects: HaxEffect[]
): HaxEffectNodeEntry[] {
  const entries: HaxEffectNodeEntry[] = [];
  const portalPairs = buildPairLookup(effects, 5, 6);
  const ziplinePairs = buildPairLookup(effects, 8, 9);
  const counters = new Map<string, number>();

  for (let effectIndex = 0; effectIndex < effects.length; effectIndex += 1) {
    const effect = effects[effectIndex];
    if (!effect) {
      continue;
    }

    const portalPairIndex = portalPairs.get(effectIndex);
    if (portalPairIndex !== undefined) {
      if (effectIndex > portalPairIndex) {
        continue;
      }

      const count = (counters.get('Portal') ?? 0) + 1;
      counters.set('Portal', count);
      entries.push({
        accentColor: '#ff9f43',
        accentSoftColor: 'rgba(125, 220, 255, 0.22)',
        effectIndexes: [effectIndex, portalPairIndex],
        id:
          owner.kind === 'spawn'
            ? getHaxSpawnPairNodeId('haxPortalPair', effectIndex, portalPairIndex)
            : `${owner.nodePrefix}-haxPortalPair-${effectIndex}-${portalPairIndex}`,
        iconKey: 'haxPortal',
        label: `Portal ${count}`,
        selection:
          owner.kind === 'spawn'
            ? {
                kind: 'haxSpawnPortalPair',
                effectIndex,
                pairEffectIndex: portalPairIndex
              }
            : {
                kind: 'haxPortalPair',
                levelIndex: owner.levelIndex,
                checkpointIndex: owner.checkpointIndex,
                effectIndex,
                pairEffectIndex: portalPairIndex
              },
        sublabel: 'Entry + Exit'
      });
      continue;
    }

    const ziplinePairIndex = ziplinePairs.get(effectIndex);
    if (ziplinePairIndex !== undefined) {
      if (effectIndex > ziplinePairIndex) {
        continue;
      }

      const count = (counters.get('Zipline') ?? 0) + 1;
      counters.set('Zipline', count);
      entries.push({
        accentColor: '#4d8dff',
        accentSoftColor: 'rgba(77, 141, 255, 0.2)',
        effectIndexes: [effectIndex, ziplinePairIndex],
        id:
          owner.kind === 'spawn'
            ? getHaxSpawnPairNodeId('haxZiplinePair', effectIndex, ziplinePairIndex)
            : `${owner.nodePrefix}-haxZiplinePair-${effectIndex}-${ziplinePairIndex}`,
        iconKey: 'haxZipline',
        label: `Zipline ${count}`,
        selection:
          owner.kind === 'spawn'
            ? {
                kind: 'haxSpawnZiplinePair',
                effectIndex,
                pairEffectIndex: ziplinePairIndex
              }
            : {
                kind: 'haxZiplinePair',
                levelIndex: owner.levelIndex,
                checkpointIndex: owner.checkpointIndex,
                effectIndex,
                pairEffectIndex: ziplinePairIndex
              },
        sublabel: 'Start + End'
      });
      continue;
    }

    const baseLabel = getNodeBaseLabel(effect);
    const count = (counters.get(baseLabel) ?? 0) + 1;
    counters.set(baseLabel, count);
    entries.push({
      ...getSingleNodeAccent(effect),
      effectIndexes: [effectIndex],
      id: owner.kind === 'spawn' ? getHaxSpawnEffectNodeId(effectIndex) : `${owner.nodePrefix}-haxEffect-${effectIndex}`,
      iconKey: getSingleNodeIconKey(effect),
      label: `${baseLabel} ${count}`,
      selection:
        owner.kind === 'spawn'
          ? { kind: 'haxSpawnEffect', effectIndex }
          : { kind: 'haxEffect', levelIndex: owner.levelIndex, checkpointIndex: owner.checkpointIndex, effectIndex },
      sublabel: getSingleNodeSublabel(effect)
    });
  }

  return entries;
}

export function buildHaxCheckpointMissionEntries(
  levelIndex: number,
  checkpointIndex: number,
  missions: HaxMission[]
): HaxMissionNodeEntry[] {
  return missions.map((mission, missionIndex) => ({
    accentColor: '#ffd166',
    accentSoftColor: 'rgba(255, 209, 102, 0.18)',
    id: getHaxMissionNodeId(levelIndex, checkpointIndex, missionIndex),
    kind: 'haxMission',
    label: getMissionDisplayName(mission.id),
    missionIndex,
    selection: { kind: 'haxMission', levelIndex, checkpointIndex, missionIndex },
    sublabel: getMissionSublabel(mission)
  }));
}

function buildVisibleHaxEffectChildren(
  levelIndex: number,
  checkpointIndex: number,
  effects: HaxEffect[]
): HaxWrapperChildEntry[] {
  return buildHaxCheckpointEffectEntries(levelIndex, checkpointIndex, effects).map((entry) => ({
      ...entry,
      kind: entry.effectIndexes.length === 1 ? 'haxEffect' : 'haxEffectPair'
    }));
}

export function buildVisibleHaxCheckpointChildren(
  levelIndex: number,
  checkpointIndex: number,
  effects: HaxEffect[],
  missions: HaxMission[],
  _legacyChildGroups?: unknown
): VisibleHaxCheckpointChildEntry[] {
  return [
    createEffectsWrapperNode(
      {
        kind: 'checkpoint',
        levelIndex,
        checkpointIndex,
        nodePrefix: getCheckpointNodeId(levelIndex, checkpointIndex)
      },
      buildVisibleHaxEffectChildren(levelIndex, checkpointIndex, effects)
    ),
    createMissionsWrapperNode(levelIndex, checkpointIndex, missions)
  ];
}

export function buildVisibleHaxSpawnChildren(effects: HaxEffect[]): VisibleHaxSpawnChildEntry[] {
  return [
    createEffectsWrapperNode(
      { kind: 'spawn', nodePrefix: 'root' },
      buildHaxSpawnEffectEntries(effects).map((entry) => ({
        ...entry,
        kind: entry.effectIndexes.length === 1 ? 'haxEffect' : 'haxEffectPair'
      }))
    )
  ];
}
