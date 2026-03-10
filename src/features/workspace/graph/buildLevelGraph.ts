import { getWorkshopColorCss } from '@/shared/workshop/colors';
import type { MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import { appendCheckpointChildren } from '@/features/workspace/graph/buildLevelCheckpointChildren';
import {
  createNode,
  type DefaultPositionMap,
  getCheckpointRole,
  getNodeVisualHeight,
  getNodeWidth,
  hasDirectSettings,
  truncateLabel
} from '@/features/workspace/graph/buildLevelGraph.shared';
import { computeSwimlaneLayout } from '@/features/workspace/graph/computeSwimlaneLayout';
import { EMPTY_EDGE_BEZIER, type EditorEdge, type EditorNodeSummary } from '@/features/workspace/graph/types';
import { getWarningsForNode } from '@/features/workspace/graph/warningIndex';
import type {
  ChildGroupState,
  EditorLayoutState,
  EditorSelection
} from '@/features/workspace/types';

export type { DefaultPositionMap } from '@/features/workspace/graph/buildLevelGraph.shared';

export interface BuildLevelGraphResult {
  defaults: DefaultPositionMap;
  edges: EditorEdge[];
  nodes: EditorNodeSummary[];
  warningsById: Record<string, ConversionWarning[]>;
}

export function buildLevelGraph(
  model: MomentumMapModel,
  warnings: ConversionWarning[],
  _selection: EditorSelection | null,
  layout: EditorLayoutState,
  childGroups: ChildGroupState
): BuildLevelGraphResult {
  const swimlaneLayout = computeSwimlaneLayout(model, childGroups);
  const nodes: EditorNodeSummary[] = [];
  const edges: EditorEdge[] = [];
  const warningsById: Record<string, ConversionWarning[]> = {};
  const defaults: DefaultPositionMap = {};

  model.levels.forEach((level, levelIndex) => {
    const levelAccent = getWorkshopColorCss(level.color, 0.92);
    const levelAccentSoft = getWorkshopColorCss(level.color, 0.18);
    const levelNodeChildren: EditorNodeSummary[] = [];

    level.checkpoints.forEach((_, checkpointIndex) => {
      const checkpointNumber = checkpointIndex + 1;
      const config = level.checkpointConfigs[checkpointIndex];
      const checkpointId = `level-${levelIndex}-cp-${checkpointNumber}`;
      const checkpointWarnings = getWarningsForNode(warnings, 'checkpoint', levelIndex, checkpointNumber);
      const isFinish = checkpointIndex >= level.checkpointConfigs.length;
      const swimlaneNode = swimlaneLayout.layoutById[checkpointId];
      const checkpointNode = createNode(
        {
          id: checkpointId,
          kind: 'checkpoint',
          label: `Checkpoint ${checkpointNumber}`,
          sublabel: getCheckpointRole(checkpointIndex, level.checkpoints.length),
          selection: { kind: 'checkpoint', levelIndex, checkpointIndex },
          levelIndex,
          checkpointIndex,
          checkpointNumber,
          x: swimlaneNode?.baseX ?? 0,
          y: swimlaneNode?.baseY ?? 0,
          width: getNodeWidth('checkpoint', `Checkpoint ${checkpointNumber}`, ''),
          height: getNodeVisualHeight('checkpoint'),
          accentColor: levelAccent,
          accentSoftColor: levelAccentSoft,
          noteMarker: checkpointWarnings.length > 0,
          hasSettings: hasDirectSettings(config)
        },
        layout,
        defaults
      );

      nodes.push(checkpointNode);
      levelNodeChildren.push(checkpointNode);
      warningsById[checkpointId] = checkpointWarnings;

      if (!isFinish && config) {
        appendCheckpointChildren({
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
          swimlaneLayout: swimlaneLayout.layoutById,
          warnings,
          warningsById
        });
      }
    });

    const checkpointOnly = levelNodeChildren.filter((node) => node.kind === 'checkpoint');
    const levelId = `level-${levelIndex}`;
    const levelWarnings = getWarningsForNode(warnings, 'level', levelIndex);
    const label = truncateLabel(level.name, 20);
    const sublabel = `Level ${levelIndex + 1}`;
    const swimlaneNode = swimlaneLayout.layoutById[levelId];
    const levelNode = createNode(
      {
        id: levelId,
        kind: 'level',
        label,
        sublabel,
        selection: { kind: 'level', levelIndex },
        levelIndex,
        x: swimlaneNode?.baseX ?? 0,
        y: swimlaneNode?.baseY ?? 0,
        width: getNodeWidth('level', label, sublabel),
        height: getNodeVisualHeight('level'),
        accentColor: levelAccent,
        accentSoftColor: levelAccentSoft,
        noteMarker: levelWarnings.length > 0,
        hasSettings: false
      },
      layout,
      defaults
    );

    nodes.push(levelNode);
    warningsById[levelId] = levelWarnings;
    edges.push({ id: `edge-root-${levelId}`, fromId: 'root', toId: levelId, bezier: { ...EMPTY_EDGE_BEZIER }, accentColor: levelAccent });
    checkpointOnly.forEach((checkpointNode) => {
      edges.push({
        id: `edge-${levelId}-${checkpointNode.id}`,
        fromId: levelId,
        toId: checkpointNode.id,
        bezier: { ...EMPTY_EDGE_BEZIER },
        accentColor: levelAccent
      });
    });
  });

  const rootWarnings = getWarningsForNode(warnings, 'start');
  const rootNode = createNode(
    {
      id: 'root',
      kind: 'start',
      label: 'Spawn',
      sublabel: 'Start position',
      selection: { kind: 'start' },
      x: swimlaneLayout.rootCenter.x,
      y: swimlaneLayout.rootCenter.y,
      width: getNodeWidth('start', 'Spawn', 'Start position'),
      height: getNodeVisualHeight('start'),
      noteMarker: rootWarnings.length > 0,
      hasSettings: false
    },
    layout,
    defaults
  );

  nodes.unshift(rootNode);
  warningsById.root = rootWarnings;

  return {
    defaults,
    edges,
    nodes,
    warningsById
  };
}
