import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceDocumentIndex } from '../features/workspace/documentIndex';
import type { WorkspaceNodeSummary } from '../features/workspace/graph/types';
import { buildOutlineTree } from '../features/workspace/outline/buildOutlineTree';
import {
  getNavigatorRowClassName,
  getRevealExpandedNavigatorNodeIds,
  shouldShowNavigatorRowBadges,
  WorkspaceNavigator
} from '../features/workspace/outline/WorkspaceNavigator';

function createNode(
  overrides: Partial<WorkspaceNodeSummary> & Pick<WorkspaceNodeSummary, 'id' | 'kind'>
): WorkspaceNodeSummary {
  const { id, kind, ...rest } = overrides;

  return {
    id,
    kind,
    label: overrides.label ?? id,
    sublabel: overrides.sublabel ?? '',
    selection: overrides.selection ?? { kind: 'start' },
    noteMarker: overrides.noteMarker ?? false,
    hasSettings: overrides.hasSettings ?? false,
    ...rest
  };
}

function createIndex(): WorkspaceDocumentIndex {
  const nodes = [
    createNode({ id: 'root', kind: 'start', label: 'Spawn', selection: { kind: 'start' } }),
    createNode({
      id: 'level-0',
      kind: 'level',
      label: 'Level 1',
      sublabel: 'Should stay hidden',
      parentId: 'root',
      selection: { kind: 'level', levelIndex: 0 },
      levelIndex: 0
    }),
    createNode({
      id: 'level-0-cp-1',
      kind: 'checkpoint',
      label: 'Checkpoint 1',
      parentId: 'level-0',
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0,
      checkpointNumber: 1
    }),
    createNode({
      id: 'level-0-cp-2',
      kind: 'checkpoint',
      label: 'Checkpoint 2',
      parentId: 'level-0',
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 1 },
      levelIndex: 0,
      checkpointIndex: 1,
      checkpointNumber: 2
    })
  ];
  const orderedIds = nodes.map((node) => node.id);
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));

  return {
    ancestorIdsById: {
      root: [],
      'level-0': ['root'],
      'level-0-cp-1': ['root', 'level-0'],
      'level-0-cp-2': ['root', 'level-0']
    },
    childrenById: {
      root: ['level-0'],
      'level-0': ['level-0-cp-1', 'level-0-cp-2']
    },
    nodeById,
    nodes,
    orderedIds,
    warningsById: {
      root: [],
      'level-0': [],
      'level-0-cp-1': [],
      'level-0-cp-2': []
    }
  };
}

describe('workspace navigator helpers', () => {
  it('shows badges for selected, hovered, and scope rows only', () => {
    expect(
      shouldShowNavigatorRowBadges({
        hasUnreadNotes: true,
        hasVisibleCount: true,
        isHovered: false,
        isScopeAnchor: false,
        isScopeBranch: false,
        isSelected: false
      })
    ).toBe(false);

    expect(
      shouldShowNavigatorRowBadges({
        hasUnreadNotes: true,
        hasVisibleCount: false,
        isHovered: true,
        isScopeAnchor: false,
        isScopeBranch: false,
        isSelected: false
      })
    ).toBe(true);

    expect(
      shouldShowNavigatorRowBadges({
        hasUnreadNotes: false,
        hasVisibleCount: true,
        isHovered: false,
        isScopeAnchor: false,
        isScopeBranch: true,
        isSelected: false
      })
    ).toBe(true);
  });

  it('keeps current-scope styling distinct from plain selection', () => {
    const selectedOnly = getNavigatorRowClassName(
      {
        isHovered: false,
        isScopeAnchor: false,
        isScopeBranch: false,
        isSelected: true
      },
      true
    );
    const scopeAnchor = getNavigatorRowClassName(
      {
        isHovered: false,
        isScopeAnchor: true,
        isScopeBranch: true,
        isSelected: false
      },
      true
    );

    expect(selectedOnly).toContain('is-selected');
    expect(selectedOnly).not.toContain('is-scope-anchor');
    expect(scopeAnchor).toContain('is-scope-anchor');
    expect(scopeAnchor).toContain('is-scope-branch');
  });

  it('expands only the reveal target ancestor chain', () => {
    const expandedIds = getRevealExpandedNavigatorNodeIds(buildOutlineTree(createIndex(), []), 'level-0-cp-1');

    expect(expandedIds).toContain('root');
    expect(expandedIds).toContain('level-0');
    expect(expandedIds).toContain('level-0-cp-1');
    expect(expandedIds).not.toContain('level-0-cp-2');
  });

  it('renders one-line rows with badges only and no summary text', () => {
    const index = createIndex();
    const markup = renderToStaticMarkup(
      createElement(WorkspaceNavigator, {
        currentScope: { kind: 'level', levelIndex: 0 },
        documentIndex: index,
        onScopeChange: vi.fn(),
        onSelectNode: vi.fn(),
        readNoteNodeIds: [],
        revealRequest: null,
        selection: { kind: 'level', levelIndex: 0 },
        selectedNode: index.nodeById['level-0']
      })
    );

    expect(markup).not.toContain('outline-tree-row-meta');
    expect(markup).not.toContain('Should stay hidden');
    expect(markup).toContain('outline-tree-row-count');
    expect(markup).not.toContain('Checkpoint 1');
  });
});
