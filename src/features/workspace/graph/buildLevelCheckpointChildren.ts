import type { CheckpointConfig } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import {
  buildVisibleCheckpointChildren,
  createNode,
  type DefaultPositionMap,
  getAbilityNamesSummary,
  getEntityAccent,
  getNodeWidth
} from '@/features/workspace/graph/buildLevelGraph.shared';
import {
  BOT_ENTITY_CONFIG,
  ORB_ENTITY_CONFIG,
  ORB_ENTITY_CONFIG_BY_KIND
} from '@/features/workspace/graph/entityConfig';
import type { SwimlaneLayoutMap } from '@/features/workspace/graph/computeSwimlaneLayout';
import { EMPTY_EDGE_BEZIER, type EditorEdge, type EditorNodeSummary } from '@/features/workspace/graph/types';
import { getWarningsForNode } from '@/features/workspace/graph/warningIndex';
import type {
  ChildEntityCategory,
  EditorLayoutState
} from '@/features/workspace/types';

interface AppendCheckpointChildrenInput {
  checkpointId: string;
  checkpointIndex: number;
  checkpointNode: EditorNodeSummary;
  checkpointNumber: number;
  childGroups: unknown;
  config: CheckpointConfig;
  defaults: DefaultPositionMap;
  edges: EditorEdge[];
  layout: EditorLayoutState;
  levelIndex: number;
  levelNodeChildren: EditorNodeSummary[];
  nodes: EditorNodeSummary[];
  swimlaneLayout: SwimlaneLayoutMap;
  warnings: ConversionWarning[];
  warningsById: Record<string, ConversionWarning[]>;
}

function getWarningPrefix(category: ChildEntityCategory, orbIndex: number): string {
  const config = ORB_ENTITY_CONFIG[category];
  return `${config.label} ${orbIndex + 1}:`;
}

function getLayoutPosition(
  swimlaneLayout: SwimlaneLayoutMap,
  id: string,
  checkpointNode: EditorNodeSummary
): { x: number; y: number } {
  const swimlaneNode = swimlaneLayout[id];

  if (!swimlaneNode) {
    return { x: checkpointNode.x, y: checkpointNode.y };
  }

  return { x: swimlaneNode.baseX, y: swimlaneNode.baseY };
}

export function appendCheckpointChildren({
  checkpointId,
  checkpointIndex,
  checkpointNode,
  checkpointNumber,
  childGroups,
  config,
  defaults,
  edges,
  layout,
  levelIndex,
  levelNodeChildren,
  nodes,
  swimlaneLayout,
  warnings,
  warningsById
}: AppendCheckpointChildrenInput) {
  const visibleChildren = buildVisibleCheckpointChildren(levelIndex, checkpointIndex, config, childGroups);
  const pushEdge = (toId: string, accentColor: string) => {
    edges.push({
      id: `edge-${checkpointId}-${toId}`,
      fromId: checkpointId,
      toId,
      bezier: { ...EMPTY_EDGE_BEZIER },
      accentColor
    });
  };

  visibleChildren.forEach((entry) => {
    const { x, y } = getLayoutPosition(swimlaneLayout, entry.id, checkpointNode);

    if (entry.kind === 'touchOrb' || entry.kind === 'abilityOrb' || entry.kind === 'lavaOrb') {
      const orbConfig = ORB_ENTITY_CONFIG_BY_KIND[entry.kind];
      let sublabel = '';

      if (entry.kind === 'abilityOrb') {
        const orb = config.abilityOrbs?.[entry.orbIndex];
        if (!orb) {
          return;
        }

        sublabel = getAbilityNamesSummary(orb.abilities, 'player');
      }

      const accent = getEntityAccent(entry.kind);
      const label = `${orbConfig.label} ${entry.orbIndex + 1}`;
      const childWarnings = getWarningsForNode(warnings, entry.kind, levelIndex, checkpointNumber, entry.orbIndex);
      const node = createNode(
        {
          id: entry.id,
          kind: entry.kind,
          label,
          sublabel,
          selection: { kind: entry.kind, levelIndex, checkpointIndex, orbIndex: entry.orbIndex },
          levelIndex,
          checkpointIndex,
          checkpointNumber,
          orbIndex: entry.orbIndex,
          parentId: checkpointId,
          x,
          y,
          width: getNodeWidth(entry.kind, label, sublabel),
          height: 34,
          accentColor: accent.color,
          accentSoftColor: accent.softColor,
          noteMarker: childWarnings.length > 0,
          hasSettings: false
        },
        layout,
        defaults
      );

      nodes.push(node);
      levelNodeChildren.push(node);
      warningsById[entry.id] = childWarnings;
      pushEdge(entry.id, accent.color);
      return;
    }

    if (entry.kind === 'impulse') {
      const accent = getEntityAccent('impulse');
      const impulse = config.impulses?.[entry.impulseIndex];
      if (!impulse) {
        return;
      }

      const childWarnings = getWarningsForNode(warnings, 'impulse', levelIndex, checkpointNumber, entry.impulseIndex);
      const label = `Impulse ${entry.impulseIndex + 1}`;
      const sublabel = `Speed ${impulse.speed}`;
      const node = createNode(
        {
          id: entry.id,
          kind: 'impulse',
          label,
          sublabel,
          selection: { kind: 'impulse', levelIndex, checkpointIndex, impulseIndex: entry.impulseIndex },
          levelIndex,
          checkpointIndex,
          checkpointNumber,
          parentId: checkpointId,
          x,
          y,
          width: getNodeWidth('impulse', label, sublabel),
          height: 34,
          accentColor: accent.color,
          accentSoftColor: accent.softColor,
          noteMarker: childWarnings.length > 0,
          hasSettings: false
        },
        layout,
        defaults
      );

      nodes.push(node);
      levelNodeChildren.push(node);
      warningsById[entry.id] = childWarnings;
      pushEdge(entry.id, accent.color);
      return;
    }

    if (entry.kind === 'portal') {
      const accent = getEntityAccent('portal');
      const childWarnings = getWarningsForNode(warnings, 'portal', levelIndex, checkpointNumber, entry.portalIndex);
      const label = `Portal ${entry.portalIndex + 1}`;
      const node = createNode(
        {
          id: entry.id,
          kind: 'portal',
          label,
          sublabel: 'Entry + Exit',
          selection: { kind: 'portal', levelIndex, checkpointIndex, portalIndex: entry.portalIndex },
          levelIndex,
          checkpointIndex,
          checkpointNumber,
          parentId: checkpointId,
          x,
          y,
          width: getNodeWidth('portal', label, 'Entry + Exit'),
          height: 34,
          accentColor: accent.color,
          accentSoftColor: accent.softColor,
          noteMarker: childWarnings.length > 0,
          hasSettings: false
        },
        layout,
        defaults
      );

      nodes.push(node);
      levelNodeChildren.push(node);
      warningsById[entry.id] = childWarnings;
      pushEdge(entry.id, accent.color);
      return;
    }

    const accent = {
      color: BOT_ENTITY_CONFIG.color,
      softColor: BOT_ENTITY_CONFIG.softColor
    };
    const botSummary = getAbilityNamesSummary(config.bot!.validAbilities, 'bot');
    const childWarnings = getWarningsForNode(warnings, 'bot', levelIndex, checkpointNumber);
    const node = createNode(
      {
        id: entry.id,
        kind: 'bot',
        label: 'Bot',
        sublabel: botSummary,
        selection: { kind: 'bot', levelIndex, checkpointIndex },
        levelIndex,
        checkpointIndex,
        checkpointNumber,
        parentId: checkpointId,
        x,
        y,
        width: getNodeWidth('bot', 'Bot', botSummary),
        height: 34,
        accentColor: accent.color,
        accentSoftColor: accent.softColor,
        noteMarker: childWarnings.length > 0,
        hasSettings: false
      },
      layout,
      defaults
    );

    nodes.push(node);
    levelNodeChildren.push(node);
    warningsById[entry.id] = childWarnings;
    pushEdge(entry.id, accent.color);
  });
}
