import { describe, expect, it } from 'vitest';
import type { ConversionWarning } from '../domain/warnings/types';
import type { WorkspaceDocumentIndex } from '../features/workspace/documentIndex';
import { buildOutlineTree } from '../features/workspace/outline/buildOutlineTree';
import type { WorkspaceNodeSummary } from '../features/workspace/graph/types';

function createNode(
  overrides: Partial<WorkspaceNodeSummary> & Pick<WorkspaceNodeSummary, 'id' | 'kind'>
): WorkspaceNodeSummary {
  const { id, kind, ...rest } = overrides;

  return {
    id,
    kind,
    label: overrides.label ?? overrides.id,
    sublabel: overrides.sublabel ?? '',
    selection: overrides.selection ?? { kind: 'start' },
    noteMarker: overrides.noteMarker ?? false,
    hasSettings: overrides.hasSettings ?? false,
    ...rest
  };
}

function createWarning(message: string, targetKind: ConversionWarning['targetKind']): ConversionWarning {
  return {
    code: 'unsupported_payload',
    message,
    targetKind
  };
}

function createIndex(nodes: WorkspaceNodeSummary[], warningsById: Record<string, ConversionWarning[]>): WorkspaceDocumentIndex {
  const orderedIds = nodes.map((node) => node.id);
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const childrenById: Record<string, string[]> = {};
  const ancestorIdsById: Record<string, string[]> = {};

  nodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }

    childrenById[node.parentId] = [...(childrenById[node.parentId] ?? []), node.id];
  });

  orderedIds.forEach((nodeId) => {
    const ancestors: string[] = [];
    let currentParentId = nodeById[nodeId]?.parentId;
    while (currentParentId) {
      ancestors.unshift(currentParentId);
      currentParentId = nodeById[currentParentId]?.parentId;
    }

    ancestorIdsById[nodeId] = ancestors;
  });

  return {
    ancestorIdsById,
    childrenById,
    nodeById,
    nodes,
    orderedIds,
    warningsById
  };
}

describe('buildOutlineTree', () => {
  it('keeps the visible child hierarchy from the document index', () => {
    const index = createIndex(
      [
        createNode({
          id: 'root',
          kind: 'start',
          label: 'Spawn'
        }),
        createNode({
          id: 'level-0',
          kind: 'level',
          label: 'Level 1',
          selection: { kind: 'level', levelIndex: 0 },
          levelIndex: 0,
          parentId: 'root'
        }),
        createNode({
          id: 'level-0-cp-1',
          kind: 'checkpoint',
          label: 'Checkpoint 1',
          selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0,
          checkpointNumber: 1,
          parentId: 'level-0'
        }),
        createNode({
          id: 'level-0-cp-1-touch-0',
          kind: 'touchOrb',
          label: 'Touch Orb 1',
          selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0,
          checkpointNumber: 1,
          parentId: 'level-0-cp-1'
        })
      ],
      {
        root: [],
        'level-0': [],
        'level-0-cp-1': [],
        'level-0-cp-1-touch-0': []
      }
    );

    const tree = buildOutlineTree(index, []);
    const checkpointNode = tree.nodeById['level-0-cp-1'];

    expect(tree.root?.children[0]?.id).toBe('level-0');
    expect(checkpointNode.children.map((child) => child.id)).toEqual(['level-0-cp-1-touch-0']);
    expect(checkpointNode.children[0]?.node.kind).toBe('touchOrb');
  });

  it('aggregates unread note counts upward and respects read note ids', () => {
    const index = createIndex(
      [
        createNode({ id: 'root', kind: 'start', label: 'Spawn' }),
        createNode({
          id: 'level-0',
          kind: 'level',
          label: 'Level 1',
          selection: { kind: 'level', levelIndex: 0 },
          levelIndex: 0,
          parentId: 'root'
        }),
        createNode({
          id: 'level-0-cp-1',
          kind: 'checkpoint',
          label: 'Checkpoint 1',
          selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0,
          checkpointNumber: 1,
          parentId: 'level-0'
        }),
        createNode({
          id: 'level-0-cp-1-bot',
          kind: 'bot',
          label: 'Bot',
          selection: { kind: 'bot', levelIndex: 0, checkpointIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0,
          checkpointNumber: 1,
          parentId: 'level-0-cp-1'
        })
      ],
      {
        root: [],
        'level-0': [createWarning('Level note', 'level')],
        'level-0-cp-1': [],
        'level-0-cp-1-bot': [createWarning('Bot note', 'bot')]
      }
    );

    const unreadTree = buildOutlineTree(index, []);
    const readTree = buildOutlineTree(index, ['level-0-cp-1-bot']);

    expect(unreadTree.nodeById['level-0'].aggregateUnreadCount).toBe(2);
    expect(unreadTree.nodeById['level-0-cp-1'].aggregateUnreadCount).toBe(1);
    expect(readTree.nodeById['level-0'].aggregateUnreadCount).toBe(1);
    expect(readTree.nodeById['level-0-cp-1-bot'].ownUnreadCount).toBe(0);
  });
});
