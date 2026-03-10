import type { ConversionWarning } from '@/domain/warnings/types';
import { createNode, getNodeVisualHeight, getNodeWidth, type DefaultPositionMap } from '@/features/workspace/graph/buildLevelGraph.shared';
import { EMPTY_EDGE_BEZIER, type EditorEdge, type EditorGraphModel, type EditorNodeSummary, type WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import { buildEditorGraphIndexes } from '@/features/workspace/graph/graphIndexes';
import { getGraphDimensions, resolveEdgeGeometry } from '@/features/workspace/graph/finalizeGraph';
import type { WorkspaceDocumentIndex } from '@/features/workspace/documentIndex';
import type { EditorLayoutState, WorkspaceScope } from '@/features/workspace/types';
import { getWorkspaceScopeNodeId } from '@/features/workspace/workspaceScope';
import { measureWithPerf } from '@/shared/devPerf';

interface ScopeLayoutProfile {
  depthGaps: number[];
  leafGap: number;
}

const SCOPE_LAYOUT_PROFILES: Record<WorkspaceScope['kind'], ScopeLayoutProfile> = {
  document: {
    depthGaps: [0, 150, 122],
    leafGap: 34
  },
  level: {
    depthGaps: [0, 176, 118],
    leafGap: 26
  },
  checkpoint: {
    depthGaps: [0, 148, 152, 138, 120],
    leafGap: 22
  }
};

function getDepthOffset(profile: ScopeLayoutProfile, depth: number): number {
  let offset = 0;
  for (let currentDepth = 1; currentDepth <= depth; currentDepth += 1) {
    offset += profile.depthGaps[Math.min(currentDepth, profile.depthGaps.length - 1)];
  }

  return offset;
}

function collectDescendantIds(
  childrenById: Record<string, string[]>,
  rootId: string,
  targetIds: Set<string>
): void {
  const pendingIds = [rootId];

  while (pendingIds.length > 0) {
    const currentId = pendingIds.shift();
    if (!currentId) {
      continue;
    }

    (childrenById[currentId] ?? []).forEach((childId) => {
      if (targetIds.has(childId)) {
        return;
      }

      targetIds.add(childId);
      pendingIds.push(childId);
    });
  }
}

export function getScopeNodeIds(index: WorkspaceDocumentIndex, scope: WorkspaceScope): Set<string> {
  const includedIds = new Set<string>();

  if (scope.kind === 'document') {
    includedIds.add('root');
    (index.childrenById.root ?? []).forEach((childId) => {
      includedIds.add(childId);
      const childNode = index.nodeById[childId];
      if (childNode && childNode.kind !== 'level') {
        collectDescendantIds(index.childrenById, childId, includedIds);
      }
    });
    return includedIds;
  }

  const scopeNodeId = getWorkspaceScopeNodeId(scope);
  const scopeNode = index.nodeById[scopeNodeId];
  if (!scopeNode) {
    return getScopeNodeIds(index, { kind: 'document' });
  }

  if (scope.kind === 'level') {
    includedIds.add(scopeNodeId);
    (index.childrenById[scopeNodeId] ?? []).forEach((childId) => includedIds.add(childId));
    return includedIds;
  }

  if (scopeNode.parentId) {
    includedIds.add(scopeNode.parentId);
  }
  includedIds.add(scopeNodeId);
  collectDescendantIds(index.childrenById, scopeNodeId, includedIds);
  return includedIds;
}

function buildScopedEdges(
  nodes: WorkspaceNodeSummary[],
  nodeIdSet: Set<string>
): EditorEdge[] {
  return nodes
    .filter((node) => node.parentId && nodeIdSet.has(node.parentId))
    .map((node) => ({
      id: `edge-${node.parentId}-${node.id}`,
      fromId: node.parentId!,
      toId: node.id,
      bezier: { ...EMPTY_EDGE_BEZIER },
      accentColor: node.accentColor
    }));
}

function materializeNode(
  node: WorkspaceNodeSummary,
  position: { x: number; y: number },
  layout: EditorLayoutState,
  defaults: DefaultPositionMap
): EditorNodeSummary {
  const isPortalPair =
    node.kind === 'haxEffectPair' &&
    (node.selection.kind === 'haxSpawnPortalPair' || node.selection.kind === 'haxPortalPair');

  return createNode(
    {
      ...node,
      x: position.x,
      y: position.y,
      width: getNodeWidth(node.kind, node.label, node.sublabel),
      height: getNodeVisualHeight(node.kind),
      overlayWidth: isPortalPair ? 620 : undefined,
      overlayHeight: isPortalPair ? 460 : undefined
    },
    layout,
    defaults
  );
}

export interface WorkspaceScopeGraphBase {
  edges: EditorEdge[];
  nodes: WorkspaceNodeSummary[];
  positions: Record<string, { x: number; y: number }>;
  warningsById: Record<string, ConversionWarning[]>;
}

function getScopeLayoutRootIds(index: WorkspaceDocumentIndex, scope: WorkspaceScope): string[] {
  if (scope.kind === 'document') {
    return ['root'];
  }

  if (scope.kind === 'level') {
    return [getWorkspaceScopeNodeId(scope)];
  }

  const checkpointNode = index.nodeById[getWorkspaceScopeNodeId(scope)];
  return checkpointNode?.parentId ? [checkpointNode.parentId] : [getWorkspaceScopeNodeId(scope)];
}

function computeScopedPositions(
  nodes: WorkspaceNodeSummary[],
  scope: WorkspaceScope,
  index: WorkspaceDocumentIndex
): Record<string, { x: number; y: number }> {
  const profile = SCOPE_LAYOUT_PROFILES[scope.kind];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const positions: Record<string, { x: number; y: number }> = {};
  const layoutRootIds = getScopeLayoutRootIds(index, scope);
  let leafCursor = 40;

  function layoutNode(nodeId: string, depth: number): number {
    const node = nodeById.get(nodeId);
    if (!node) {
      return leafCursor;
    }

    const childIds = (index.childrenById[nodeId] ?? []).filter((childId) => nodeById.has(childId));
    const height = getNodeVisualHeight(node.kind);
    let baseY = leafCursor + height / 2;

    if (childIds.length > 0) {
      const childCenters = childIds.map((childId) => layoutNode(childId, depth + 1));
      baseY =
        childCenters.length === 1
          ? childCenters[0]!
          : (childCenters[0]! + childCenters[childCenters.length - 1]!) / 2;
    } else {
      leafCursor += height + profile.leafGap;
    }

    positions[nodeId] = {
      x: 52 + getDepthOffset(profile, depth),
      y: baseY
    };

    return baseY;
  }

  layoutRootIds.forEach((rootId) => {
    layoutNode(rootId, 0);
  });

  return positions;
}

export function buildWorkspaceScopeGraphBase(
  index: WorkspaceDocumentIndex | null,
  scope: WorkspaceScope
): WorkspaceScopeGraphBase | null {
  if (!index) {
    return null;
  }

  return measureWithPerf('workspace-scope-base', () => {
    const includedIds = getScopeNodeIds(index, scope);
    const scopeNodes = index.orderedIds
      .filter((nodeId) => includedIds.has(nodeId))
      .map((nodeId) => index.nodeById[nodeId]!)
      .filter(Boolean);

    if (scopeNodes.length === 0) {
      return null;
    }

    return {
      nodes: scopeNodes,
      positions: computeScopedPositions(scopeNodes, scope, index),
      edges: buildScopedEdges(scopeNodes, new Set(scopeNodes.map((node) => node.id))),
      warningsById: Object.fromEntries(
        scopeNodes.map((node) => [node.id, index.warningsById[node.id] ?? []] as const)
      ) as Record<string, ConversionWarning[]>
    };
  });
}

export function materializeWorkspaceScopeGraph(
  base: WorkspaceScopeGraphBase | null,
  layout: EditorLayoutState
): EditorGraphModel | null {
  if (!base) {
    return null;
  }

  return measureWithPerf('workspace-scope-materialize', () => {
    const defaults: DefaultPositionMap = {};
    const nodes = base.nodes.map((node) => materializeNode(node, base.positions[node.id]!, layout, defaults));
    const { nodeById, childrenById } = buildEditorGraphIndexes(nodes);
    const edges = base.edges.map((edge) => ({
      ...edge,
      bezier: { ...edge.bezier }
    }));

    resolveEdgeGeometry(nodeById, edges);

    return {
      childrenById,
      nodeById,
      nodes,
      edges,
      warningsById: base.warningsById,
      ...getGraphDimensions(nodes)
    };
  });
}

export function buildWorkspaceScopeGraph(
  index: WorkspaceDocumentIndex | null,
  scope: WorkspaceScope,
  layout: EditorLayoutState
): EditorGraphModel | null {
  return materializeWorkspaceScopeGraph(buildWorkspaceScopeGraphBase(index, scope), layout);
}
