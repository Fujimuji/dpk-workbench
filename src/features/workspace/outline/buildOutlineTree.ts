import type { WorkspaceDocumentIndex } from '@/features/workspace/documentIndex';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

export interface OutlineTreeNode {
  aggregateUnreadCount: number;
  ancestorIds: string[];
  children: OutlineTreeNode[];
  depth: number;
  directChildCount: number;
  id: string;
  isExpandable: boolean;
  node: WorkspaceNodeSummary;
  ownUnreadCount: number;
  summaryLabel: string | null;
}

export interface OutlineTreeModel {
  ancestorIdsById: Record<string, string[]>;
  nodeById: Record<string, OutlineTreeNode>;
  root: OutlineTreeNode | null;
}

function getSummaryLabel(node: WorkspaceNodeSummary, childCount: number): string | null {
  if (childCount === 0) {
    return null;
  }

  switch (node.kind) {
    case 'start':
      return `${childCount} top-level items`;
    case 'level':
      return `${childCount} checkpoints`;
    case 'checkpoint':
      return `${childCount} child nodes`;
    case 'momentumEntities':
      return `${childCount} entities`;
    case 'haxEffects':
      return `${childCount} effects`;
    case 'haxMissions':
      return `${childCount} missions`;
    default:
      return null;
  }
}

function getDisplayChildCount(node: WorkspaceNodeSummary, children: OutlineTreeNode[]): number {
  if (node.kind === 'checkpoint') {
    const momentumEntitiesChild = children.find((child) => child.node.kind === 'momentumEntities');
    if (momentumEntitiesChild) {
      return momentumEntitiesChild.directChildCount;
    }
  }

  return children.length;
}

export function buildOutlineTree(
  index: WorkspaceDocumentIndex | null,
  readNoteNodeIds: string[]
): OutlineTreeModel {
  if (index === null) {
    return {
      ancestorIdsById: {},
      nodeById: {},
      root: null
    };
  }

  const resolvedIndex = index;
  const readNodeIdSet = new Set(readNoteNodeIds);

  const ancestorIdsById: Record<string, string[]> = {};
  const nodeById: Record<string, OutlineTreeNode> = {};

  function buildNode(nodeId: string, ancestorIds: string[], depth: number): OutlineTreeNode | null {
    const graphNode = resolvedIndex.nodeById[nodeId];
    if (!graphNode) {
      return null;
    }

    const children = (resolvedIndex.childrenById[nodeId] ?? [])
      .map((childId) => buildNode(childId, [...ancestorIds, nodeId], depth + 1))
      .filter((child): child is OutlineTreeNode => Boolean(child));
    const ownUnreadCount = readNodeIdSet.has(nodeId) ? 0 : resolvedIndex.warningsById[nodeId]?.length ?? 0;
    const aggregateUnreadCount = ownUnreadCount + children.reduce((total, child) => total + child.aggregateUnreadCount, 0);

    const treeNode: OutlineTreeNode = {
      aggregateUnreadCount,
      ancestorIds,
      children,
      depth,
      directChildCount: getDisplayChildCount(graphNode, children),
      id: nodeId,
      isExpandable:
        children.length > 0 &&
        (
          graphNode.kind === 'start' ||
          graphNode.kind === 'level' ||
          graphNode.kind === 'checkpoint' ||
          graphNode.kind === 'momentumEntities' ||
          graphNode.kind === 'haxEffects' ||
          graphNode.kind === 'haxMissions'
        ),
      node: graphNode,
      ownUnreadCount,
      summaryLabel: getSummaryLabel(graphNode, children.length)
    };

    ancestorIdsById[nodeId] = ancestorIds;
    nodeById[nodeId] = treeNode;

    return treeNode;
  }

  return {
    ancestorIdsById,
    nodeById,
    root: buildNode('root', [], 0)
  };
}
