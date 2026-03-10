import {
  EDITOR_BOTTOM_PADDING,
  EDITOR_LEFT_PADDING,
  EDITOR_RIGHT_PADDING,
  EDITOR_TOP_PADDING
} from '@/features/workspace/graph/layoutConstants';
import { buildEditorGraphIndexes } from '@/features/workspace/graph/graphIndexes';
import type {
  EditorEdge,
  EditorEdgeBezier,
  EditorGraphModel,
  EditorNodeSummary
} from '@/features/workspace/graph/types';
import type { EditorLayoutState } from '@/features/workspace/types';
import type { DefaultPositionMap } from '@/features/workspace/graph/buildLevelGraph';

interface CachedEdgePath {
  bezier: EditorEdgeBezier;
}

const EDGE_PATH_CACHE = new Map<string, CachedEdgePath>();

export function buildEdgeGeometry(fromNode: EditorNodeSummary, toNode: EditorNodeSummary): EditorEdgeBezier {
  const startX = fromNode.portOutX;
  const startY = fromNode.y;
  const endX = toNode.portInX;
  const endY = toNode.y;
  const controlOffset = Math.max(28, Math.abs(endX - startX) * 0.4);

  return {
    startX,
    startY,
    control1X: startX + controlOffset,
    control1Y: startY,
    control2X: endX - controlOffset,
    control2Y: endY,
    endX,
    endY
  };
}

export function resolveEdgeGeometryWithCache(
  edgeId: string,
  fromNode: EditorNodeSummary,
  toNode: EditorNodeSummary
): { bezier: EditorEdgeBezier; reused: boolean } {
  const nextSnapshot = buildEdgeGeometry(fromNode, toNode);
  const cached = EDGE_PATH_CACHE.get(edgeId);

  if (
    cached &&
    cached.bezier.startX === nextSnapshot.startX &&
    cached.bezier.startY === nextSnapshot.startY &&
    cached.bezier.control1X === nextSnapshot.control1X &&
    cached.bezier.control1Y === nextSnapshot.control1Y &&
    cached.bezier.control2X === nextSnapshot.control2X &&
    cached.bezier.control2Y === nextSnapshot.control2Y &&
    cached.bezier.endX === nextSnapshot.endX &&
    cached.bezier.endY === nextSnapshot.endY
  ) {
    return { bezier: cached.bezier, reused: true };
  }

  EDGE_PATH_CACHE.set(edgeId, { bezier: nextSnapshot });
  return { bezier: nextSnapshot, reused: false };
}

export function resolveEdgeGeometry(
  nodeById: Record<string, EditorNodeSummary>,
  edges: EditorEdge[]
): void {
  const seenEdges = new Set<string>();

  edges.forEach((edge) => {
    seenEdges.add(edge.id);
    const fromNode = nodeById[edge.fromId];
    const toNode = nodeById[edge.toId];

    if (fromNode && toNode) {
      edge.bezier = resolveEdgeGeometryWithCache(edge.id, fromNode, toNode).bezier;
    }
  });

  EDGE_PATH_CACHE.forEach((_, edgeId) => {
    if (!seenEdges.has(edgeId)) {
      EDGE_PATH_CACHE.delete(edgeId);
    }
  });
}

export function shiftUnpositionedNodesIntoBounds(
  nodes: EditorNodeSummary[],
  edges: EditorEdge[],
  defaults: DefaultPositionMap,
  layout: EditorLayoutState,
  nodeById: Record<string, EditorNodeSummary>
): void {
  const minDefaultX = nodes.reduce((value, node) => {
    if (layout[node.id]) {
      return value;
    }

    return Math.min(value, defaults[node.id]?.x ?? node.x);
  }, Number.POSITIVE_INFINITY);
  const minDefaultY = nodes.reduce((value, node) => {
    if (layout[node.id]) {
      return value;
    }

    const defaultY = defaults[node.id]?.y ?? node.y;
    return Math.min(value, defaultY - node.height / 2);
  }, Number.POSITIVE_INFINITY);

  const shiftX =
    Number.isFinite(minDefaultX) && minDefaultX < EDITOR_LEFT_PADDING ? EDITOR_LEFT_PADDING - minDefaultX : 0;
  const shiftY =
    Number.isFinite(minDefaultY) && minDefaultY < EDITOR_TOP_PADDING ? EDITOR_TOP_PADDING - minDefaultY : 0;

  if (!shiftX && !shiftY) {
    return;
  }

  nodes.forEach((node) => {
    if (layout[node.id]) {
      return;
    }

    node.x += shiftX;
    node.y += shiftY;
    node.portInX += shiftX;
    node.portOutX += shiftX;
  });

  edges.forEach((edge) => {
    const fromNode = nodeById[edge.fromId];
    const toNode = nodeById[edge.toId];

    if (fromNode && toNode) {
      edge.bezier = resolveEdgeGeometryWithCache(edge.id, fromNode, toNode).bezier;
    }
  });
}

export function applyFocusMode(
  nodes: EditorNodeSummary[],
  edges: EditorEdge[],
  nodeById: Record<string, EditorNodeSummary>,
  childrenById: Record<string, string[]>,
  focusedCheckpointId: string | null,
  isFocusModeEnabled: boolean
): void {
  if (!isFocusModeEnabled || !focusedCheckpointId) {
    return;
  }

  const focusedCheckpointNode = nodeById[focusedCheckpointId];
  const focusedLevelIndex = focusedCheckpointNode?.levelIndex;
  const visibleNodeIds = new Set<string>();

  visibleNodeIds.add('root');
  if (focusedLevelIndex !== undefined) {
    nodes.forEach((node) => {
      if (node.kind === 'level' && node.levelIndex === focusedLevelIndex) {
        visibleNodeIds.add(node.id);
      }
    });
  }

  if (focusedCheckpointNode) {
    let currentNode: EditorNodeSummary | undefined = focusedCheckpointNode;
    while (currentNode) {
      visibleNodeIds.add(currentNode.id);
      currentNode = currentNode.parentId ? nodeById[currentNode.parentId] : undefined;
    }
  }

  if (focusedCheckpointId) {
    const queue = [focusedCheckpointId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      visibleNodeIds.add(currentId);
      (childrenById[currentId] ?? []).forEach((childId) => {
        if (visibleNodeIds.has(childId)) {
          return;
        }

        visibleNodeIds.add(childId);
        queue.push(childId);
      });
    }
  }

  nodes.forEach((node) => {
    node.isDimmed = !visibleNodeIds.has(node.id);
  });

  edges.forEach((edge) => {
    const fromNode = nodeById[edge.fromId];
    const toNode = nodeById[edge.toId];
    edge.isDimmed = Boolean(fromNode?.isDimmed) && Boolean(toNode?.isDimmed);
  });
}

export function getGraphDimensions(
  nodes: EditorNodeSummary[]
): Pick<EditorGraphModel, 'width' | 'height'> {
  const maxRight = nodes.reduce((value, node) => Math.max(value, node.x + node.width), EDITOR_LEFT_PADDING);
  const maxBottom = nodes.reduce((value, node) => Math.max(value, node.y + node.height / 2), EDITOR_TOP_PADDING);

  return {
    width: maxRight + EDITOR_RIGHT_PADDING,
    height: maxBottom + EDITOR_BOTTOM_PADDING
  };
}

export function finalizeEditorGraph(
  nodes: EditorNodeSummary[],
  edges: EditorEdge[],
  focusedCheckpointId: string | null,
  isFocusModeEnabled: boolean
): Pick<EditorGraphModel, 'childrenById' | 'edges' | 'height' | 'nodeById' | 'nodes' | 'width'> {
  const { childrenById, nodeById } = buildEditorGraphIndexes(nodes);
  resolveEdgeGeometry(nodeById, edges);
  applyFocusMode(nodes, edges, nodeById, childrenById, focusedCheckpointId, isFocusModeEnabled);

  return {
    childrenById,
    edges,
    nodeById,
    nodes,
    ...getGraphDimensions(nodes)
  };
}
