import type { MomentumMapModel } from '@/domain/model/types';
import {
  EDITOR_BAND_MIN_HEIGHT,
  EDITOR_COL_0_X,
  EDITOR_COL_1_X,
  EDITOR_COL_2_X,
  EDITOR_COL_3_X,
  EDITOR_TOP_PADDING
} from '@/features/workspace/graph/layoutConstants';
import {
  buildVisibleCheckpointChildren,
  getNodeVisualHeight,
  type VisibleCheckpointChildEntry
} from '@/features/workspace/graph/buildLevelGraph.shared';
import type { EditorNodeKind } from '@/features/workspace/graph/types';
import type { ChildGroupState } from '@/features/workspace/types';

export interface SwimlaneNodeLayout {
  id: string;
  depth: 0 | 1 | 2 | 3;
  bandTop: number;
  bandHeight: number;
  baseX: number;
  baseY: number;
}

export type SwimlaneLayoutMap = Record<string, SwimlaneNodeLayout>;

export interface SwimlaneTreeNode {
  id: string;
  kind: EditorNodeKind;
  depth: 0 | 1 | 2 | 3;
  visualHeight: number;
  children: SwimlaneTreeNode[];
  bandHeight: number;
}

export interface SwimlaneLayoutResult {
  checkpointCenters: Record<string, { x: number; y: number }>;
  levelCenters: Record<string, { x: number; y: number }>;
  rootCenter: { x: number; y: number };
  layoutById: SwimlaneLayoutMap;
}

function getDepthColumnX(depth: 0 | 1 | 2 | 3): number {
  switch (depth) {
    case 0:
      return EDITOR_COL_0_X;
    case 1:
      return EDITOR_COL_1_X;
    case 2:
      return EDITOR_COL_2_X;
    case 3:
      return EDITOR_COL_3_X;
  }
}

function createChildTreeNode(entry: VisibleCheckpointChildEntry): SwimlaneTreeNode {
  return {
    id: entry.id,
    kind: entry.kind,
    depth: 3,
    visualHeight: getNodeVisualHeight(entry.kind),
    children: [],
    bandHeight: 0
  };
}

function buildTree(model: MomentumMapModel, childGroups: ChildGroupState): SwimlaneTreeNode {
  const levels = model.levels.map((level, levelIndex) => {
    const checkpoints = level.checkpoints.map((_, checkpointIndex) => {
      const checkpointId = `level-${levelIndex}-cp-${checkpointIndex + 1}`;
      const checkpointConfig = level.checkpointConfigs[checkpointIndex] ?? null;
      const visibleChildren = buildVisibleCheckpointChildren(levelIndex, checkpointIndex, checkpointConfig, childGroups);
      return {
        id: checkpointId,
        kind: 'checkpoint' as const,
        depth: 2 as const,
        visualHeight: getNodeVisualHeight('checkpoint'),
        children: visibleChildren.map(createChildTreeNode),
        bandHeight: 0
      };
    });

    return {
      id: `level-${levelIndex}`,
      kind: 'level' as const,
      depth: 1 as const,
      visualHeight: getNodeVisualHeight('level'),
      children: checkpoints,
      bandHeight: 0
    };
  });

  return {
    id: 'root',
    kind: 'start',
    depth: 0,
    visualHeight: getNodeVisualHeight('start'),
    children: levels,
    bandHeight: 0
  };
}

function computeBandHeights(node: SwimlaneTreeNode): number {
  if (node.children.length === 0) {
    node.bandHeight = Math.max(EDITOR_BAND_MIN_HEIGHT, node.visualHeight);
    return node.bandHeight;
  }

  const childBandHeight = node.children.reduce((sum, child) => sum + computeBandHeights(child), 0);
  node.bandHeight = Math.max(EDITOR_BAND_MIN_HEIGHT, childBandHeight);
  return node.bandHeight;
}

function assignBands(
  node: SwimlaneTreeNode,
  bandTop: number,
  layoutById: SwimlaneLayoutMap,
  checkpointCenters: Record<string, { x: number; y: number }>,
  levelCenters: Record<string, { x: number; y: number }>
): void {
  const baseX = getDepthColumnX(node.depth);
  const baseY = bandTop + node.bandHeight / 2;

  layoutById[node.id] = {
    id: node.id,
    depth: node.depth,
    bandTop,
    bandHeight: node.bandHeight,
    baseX,
    baseY
  };

  if (node.kind === 'checkpoint') {
    checkpointCenters[node.id] = { x: baseX, y: baseY };
  } else if (node.kind === 'level') {
    levelCenters[node.id] = { x: baseX, y: baseY };
  }

  let cursor = bandTop;
  node.children.forEach((child) => {
    assignBands(child, cursor, layoutById, checkpointCenters, levelCenters);
    cursor += child.bandHeight;
  });
}

export function computeSwimlaneTreeLayout(tree: SwimlaneTreeNode): SwimlaneLayoutResult {
  computeBandHeights(tree);

  const layoutById: SwimlaneLayoutMap = {};
  const checkpointCenters: Record<string, { x: number; y: number }> = {};
  const levelCenters: Record<string, { x: number; y: number }> = {};
  assignBands(tree, EDITOR_TOP_PADDING, layoutById, checkpointCenters, levelCenters);
  const rootLayout = layoutById.root;

  return {
    checkpointCenters,
    levelCenters,
    rootCenter: { x: rootLayout.baseX, y: rootLayout.baseY },
    layoutById
  };
}

export function computeSwimlaneLayout(model: MomentumMapModel, childGroups: ChildGroupState): SwimlaneLayoutResult {
  return computeSwimlaneTreeLayout(buildTree(model, childGroups));
}
