import type {
  AbilityFlags,
  BotAbilityFlags,
  CheckpointConfig,
  MomentumMapModel
} from '@/domain/model/types';
import {
  BOT_ENTITY_CONFIG,
  ORB_ENTITY_CONFIG,
  ORB_ENTITY_CONFIG_BY_KIND,
  type OrbEntityKind
} from '@/features/workspace/graph/entityConfig';
import { getCheckpointNodeId } from '@/features/workspace/graph/nodeIds';
import {
  measureTextWidth
} from '@/features/workspace/graph/textMeasure';
import type {
  EditorNodeKind,
  EditorNodeSummary
} from '@/features/workspace/graph/types';
import type {
  EditorLayoutState,
  EditorSelection
} from '@/features/workspace/types';

export type DefaultPositionMap = Record<string, { x: number; y: number }>;

export interface VisibleCheckpointOrbChildEntry {
  id: string;
  kind: OrbEntityKind;
  orbIndex: number;
}

export interface VisibleCheckpointBotChildEntry {
  id: string;
  kind: 'bot';
}

export interface VisibleCheckpointImpulseChildEntry {
  id: string;
  kind: 'impulse';
  impulseIndex: number;
}

export interface VisibleCheckpointPortalChildEntry {
  id: string;
  kind: 'portal';
  portalIndex: number;
}

export type VisibleCheckpointChildEntry =
  | VisibleCheckpointOrbChildEntry
  | VisibleCheckpointBotChildEntry
  | VisibleCheckpointImpulseChildEntry
  | VisibleCheckpointPortalChildEntry;

export interface CheckpointContext {
  levelIndex: number;
  checkpointIndex: number;
}

export function getAbilityNamesSummary(
  flags: AbilityFlags,
  context: 'player'
): string;
export function getAbilityNamesSummary(
  flags: BotAbilityFlags,
  context: 'bot'
): string;
export function getAbilityNamesSummary(
  flags: AbilityFlags | BotAbilityFlags,
  context: 'player' | 'bot'
): string {
  const entries =
    context === 'bot'
      ? [
          'primaryFire' in flags && flags.primaryFire ? 'Primary Fire' : null,
          flags.seismicSlam ? 'Seismic Slam' : null,
          flags.rocketPunch ? 'Rocket Punch' : null
        ]
      : [
          flags.seismicSlam ? 'Seismic Slam' : null,
          'powerblock' in flags && flags.powerblock ? 'Powerblock' : null,
          flags.rocketPunch ? 'Rocket Punch' : null
        ];
  const active = entries.filter((entry): entry is string => Boolean(entry));

  if (active.length === 0) {
    return 'No abilities';
  }

  if (active.length >= 3) {
    return 'All abilities';
  }

  if (active.length === 1) {
    return active[0];
  }

  return `${active[0]} & ${active[1]}`;
}

export function getNodeWidth(kind: EditorNodeKind, label: string, sublabel: string): number {
  const sidePadding = 12;
  const totalPadding = sidePadding * 2;

  switch (kind) {
    case 'start': {
      const contentWidth =
        Math.max(measureTextWidth(label, 'title', 7.4), measureTextWidth(sublabel, 'subtitle', 6.2)) + totalPadding;
      return Math.max(102, Math.min(180, Math.ceil(contentWidth)));
    }
    case 'level': {
      const contentWidth =
        Math.max(measureTextWidth(label, 'title', 7.5), measureTextWidth(sublabel, 'subtitle', 6.2)) + totalPadding;
      return Math.max(116, Math.min(214, Math.ceil(contentWidth)));
    }
    case 'checkpoint': {
      const contentWidth = measureTextWidth(label, 'title', 7.2) + totalPadding;
      return Math.max(98, Math.min(166, Math.ceil(contentWidth)));
    }
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
    case 'haxEffectPair':
    case 'haxEffectStack':
    case 'touchStack':
    case 'abilityStack':
    case 'lavaStack': {
      const contentWidth =
        Math.max(measureTextWidth(label, 'title', 6.9), measureTextWidth(sublabel, 'subtitle', 5.9)) + totalPadding;
      return Math.max(96, Math.min(184, Math.ceil(contentWidth)));
    }
  }
}

export function getNodeVisualHeight(kind: EditorNodeKind): number {
  switch (kind) {
    case 'start':
      return 38;
    case 'level':
      return 42;
    case 'checkpoint':
      return 38;
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
    case 'haxEffectPair':
    case 'haxEffectStack':
    case 'touchStack':
    case 'abilityStack':
    case 'lavaStack':
      return 34;
  }
}

export function getDefaultNodeDimensions(
  kind: EditorNodeKind,
  label: string,
  sublabel: string
): { width: number; height: number } {
  return {
    width: getNodeWidth(kind, label, sublabel),
    height: getNodeVisualHeight(kind)
  };
}

function collectCategoryChildren(
  entries: VisibleCheckpointChildEntry[],
  levelIndex: number,
  checkpointIndex: number,
  checkpointConfig: CheckpointConfig,
  category: 'touch' | 'ability' | 'lava'
): void {
  const checkpointId = getCheckpointNodeId(levelIndex, checkpointIndex);
  const categoryConfig = ORB_ENTITY_CONFIG[category];
  const itemCount = categoryConfig.getCount(checkpointConfig);

  for (let orbIndex = 0; orbIndex < itemCount; orbIndex += 1) {
    entries.push({
      id: `${checkpointId}-${categoryConfig.kind}-${orbIndex}`,
      kind: categoryConfig.kind,
      orbIndex
    });
  }
}

export function buildVisibleCheckpointChildren(
  levelIndex: number,
  checkpointIndex: number,
  checkpointConfig: CheckpointConfig | null,
  _legacyChildGroups?: unknown
): VisibleCheckpointChildEntry[] {
  if (!checkpointConfig) {
    return [];
  }

  const entries: VisibleCheckpointChildEntry[] = [];

  collectCategoryChildren(entries, levelIndex, checkpointIndex, checkpointConfig, 'touch');
  collectCategoryChildren(entries, levelIndex, checkpointIndex, checkpointConfig, 'ability');
  collectCategoryChildren(entries, levelIndex, checkpointIndex, checkpointConfig, 'lava');

  if (checkpointConfig.bot) {
    entries.push({
      id: `${getCheckpointNodeId(levelIndex, checkpointIndex)}-bot`,
      kind: 'bot'
    });
  }

  (checkpointConfig.impulses ?? []).forEach((_, impulseIndex) => {
    entries.push({
      id: `${getCheckpointNodeId(levelIndex, checkpointIndex)}-impulse-${impulseIndex}`,
      kind: 'impulse',
      impulseIndex
    });
  });

  (checkpointConfig.portals ?? []).forEach((_, portalIndex) => {
    entries.push({
      id: `${getCheckpointNodeId(levelIndex, checkpointIndex)}-portal-${portalIndex}`,
      kind: 'portal',
      portalIndex
    });
  });

  return entries;
}

export function getEntityAccent(kind: Extract<EditorNodeKind, 'touchOrb' | 'abilityOrb' | 'lavaOrb' | 'bot' | 'impulse' | 'portal'>): {
  color: string;
  softColor: string;
} {
  if (kind === 'bot') {
    return {
      color: BOT_ENTITY_CONFIG.color,
      softColor: BOT_ENTITY_CONFIG.softColor
    };
  }

  if (kind === 'impulse') {
    return {
      color: '#ffb357',
      softColor: 'rgba(255, 179, 87, 0.22)'
    };
  }

  if (kind === 'portal') {
    return {
      color: '#7ddcff',
      softColor: 'rgba(125, 220, 255, 0.22)'
    };
  }

  const config = ORB_ENTITY_CONFIG_BY_KIND[kind];
  return {
    color: config.color,
    softColor: config.softColor
  };
}

export function getCheckpointContext(selection: EditorSelection | null): CheckpointContext | null {
  if (!selection) {
    return null;
  }

  switch (selection.kind) {
    case 'checkpoint':
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
    case 'bot':
    case 'impulse':
    case 'portal':
      return { levelIndex: selection.levelIndex, checkpointIndex: selection.checkpointIndex };
    default:
      return null;
  }
}

export function hasDirectSettings(config: CheckpointConfig | undefined): boolean {
  if (!config) {
    return false;
  }

  return (
    config.liquid ||
    config.timeLimit !== null ||
    config.minimumSpeed !== null ||
    config.heightGoal !== null ||
    config.disableAbilities !== null
  );
}

export function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function getCheckpointRole(checkpointIndex: number, checkpointCount: number): string {
  if (checkpointIndex === 0) {
    return 'Start';
  }

  if (checkpointIndex === checkpointCount - 1) {
    return 'Finish';
  }

  return 'Checkpoint';
}

function getOverlaySize(kind: EditorNodeKind): { width: number; height: number } {
  switch (kind) {
    case 'start':
      return { width: 280, height: 240 };
    case 'level':
      return { width: 300, height: 260 };
    case 'checkpoint':
    case 'momentumEntities':
      return { width: 320, height: 300 };
    case 'haxEffects':
      return { width: 340, height: 320 };
    case 'haxMissions':
      return { width: 320, height: 280 };
    case 'haxMission':
      return { width: 320, height: 340 };
    case 'touchOrb':
    case 'lavaOrb':
      return { width: 280, height: 260 };
    case 'abilityOrb':
    case 'bot':
    case 'impulse':
    case 'portal':
      return { width: 300, height: 280 };
    case 'haxEffect':
      return { width: 320, height: 420 };
    case 'haxEffectPair':
      return { width: 340, height: 460 };
    case 'haxEffectStack':
      return { width: 300, height: 220 };
    case 'touchStack':
    case 'lavaStack':
      return { width: 280, height: 220 };
    case 'abilityStack':
      return { width: 300, height: 220 };
  }
}

export function createNode(
  input: Omit<EditorNodeSummary, 'overlayHeight' | 'overlayWidth' | 'portInX' | 'portOutX'> & {
    overlayHeight?: number;
    overlayWidth?: number;
  },
  layout: EditorLayoutState,
  defaults: DefaultPositionMap
): EditorNodeSummary {
  defaults[input.id] = { x: input.x, y: input.y };
  const yOffset = layout[input.id]?.yOffset ?? 0;
  const resolvedPosition = { x: input.x, y: input.y + yOffset };
  const overlaySize = getOverlaySize(input.kind);

  return {
    ...input,
    x: resolvedPosition.x,
    y: resolvedPosition.y,
    portInX: resolvedPosition.x,
    portOutX: resolvedPosition.x + input.width,
    overlayWidth: input.overlayWidth ?? overlaySize.width,
    overlayHeight: input.overlayHeight ?? overlaySize.height
  };
}
