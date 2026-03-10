import { describe, expect, it } from 'vitest';
import { getNodeIdFromSelection } from '../features/workspace/canvas/selection';
import type { WorkspaceDocumentIndex } from '../features/workspace/documentIndex';
import { buildWorkspaceScopeGraph, getScopeNodeIds } from '../features/workspace/graph/buildScopeGraph';
import type { WorkspaceNodeSummary } from '../features/workspace/graph/types';
import {
  buildWorkspaceScopeBreadcrumbs,
  getWorkspaceScopeDescription,
  getWorkspaceScopeForSelection
} from '../features/workspace/workspaceScope';

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
      id: 'root-haxEffects',
      kind: 'haxEffects',
      label: 'Effects',
      selection: { kind: 'haxSpawnEffects' },
      parentId: 'root'
    }),
    createNode({
      id: 'root-haxEffect-0',
      kind: 'haxEffect',
      label: 'Spawn Effect',
      selection: { kind: 'haxSpawnEffect', effectIndex: 0 },
      parentId: 'root-haxEffects'
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
      id: 'level-0-cp-1-momentumEntities',
      kind: 'momentumEntities',
      label: 'Entities',
      selection: { kind: 'momentumEntities', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0,
      checkpointNumber: 1,
      parentId: 'level-0-cp-1'
    }),
    createNode({
      id: 'level-0-cp-1-bot',
      kind: 'bot',
      label: 'Bot',
      selection: { kind: 'bot', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0,
      checkpointNumber: 1,
      parentId: 'level-0-cp-1-momentumEntities'
    }),
    createNode({
      id: 'level-0-cp-1-haxEffects',
      kind: 'haxEffects',
      label: 'Effects',
      selection: { kind: 'haxEffects', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0,
      checkpointNumber: 1,
      parentId: 'level-0-cp-1'
    }),
    createNode({
      id: 'level-0-cp-1-haxEffect-0',
      kind: 'haxEffect',
      label: 'Checkpoint Effect',
      selection: { kind: 'haxEffect', levelIndex: 0, checkpointIndex: 0, effectIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0,
      checkpointNumber: 1,
      parentId: 'level-0-cp-1-haxEffects'
    })
  ];

  const orderedIds = nodes.map((node) => node.id);
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));

  return {
    ancestorIdsById: {
      root: [],
      'root-haxEffects': ['root'],
      'root-haxEffect-0': ['root', 'root-haxEffects'],
      'level-0': ['root'],
      'level-0-cp-1': ['root', 'level-0'],
      'level-0-cp-1-momentumEntities': ['root', 'level-0', 'level-0-cp-1'],
      'level-0-cp-1-bot': ['root', 'level-0', 'level-0-cp-1', 'level-0-cp-1-momentumEntities'],
      'level-0-cp-1-haxEffects': ['root', 'level-0', 'level-0-cp-1'],
      'level-0-cp-1-haxEffect-0': ['root', 'level-0', 'level-0-cp-1', 'level-0-cp-1-haxEffects']
    },
    childrenById: {
      root: ['root-haxEffects', 'level-0'],
      'root-haxEffects': ['root-haxEffect-0'],
      'level-0': ['level-0-cp-1'],
      'level-0-cp-1': ['level-0-cp-1-momentumEntities', 'level-0-cp-1-haxEffects'],
      'level-0-cp-1-momentumEntities': ['level-0-cp-1-bot'],
      'level-0-cp-1-haxEffects': ['level-0-cp-1-haxEffect-0']
    },
    nodeById,
    nodes,
    orderedIds,
    warningsById: {
      root: [],
      'root-haxEffects': [],
      'root-haxEffect-0': [],
      'level-0': [],
      'level-0-cp-1': [],
      'level-0-cp-1-momentumEntities': [],
      'level-0-cp-1-bot': [],
      'level-0-cp-1-haxEffects': [],
      'level-0-cp-1-haxEffect-0': []
    }
  };
}

function createIndexWithHiddenLevel(): WorkspaceDocumentIndex {
  const base = createIndex();
  const nodes = [
    ...base.nodes,
    createNode({
      id: 'level-1',
      kind: 'level',
      label: 'Level 2',
      selection: { kind: 'level', levelIndex: 1 },
      levelIndex: 1,
      parentId: 'root'
    }),
    createNode({
      id: 'level-1-cp-1',
      kind: 'checkpoint',
      label: 'Checkpoint 1',
      selection: { kind: 'checkpoint', levelIndex: 1, checkpointIndex: 0 },
      levelIndex: 1,
      checkpointIndex: 0,
      checkpointNumber: 1,
      parentId: 'level-1'
    }),
    createNode({
      id: 'level-1-cp-1-momentumEntities',
      kind: 'momentumEntities',
      label: 'Entities',
      selection: { kind: 'momentumEntities', levelIndex: 1, checkpointIndex: 0 },
      levelIndex: 1,
      checkpointIndex: 0,
      checkpointNumber: 1,
      parentId: 'level-1-cp-1'
    }),
    createNode({
      id: 'level-1-cp-1-bot',
      kind: 'bot',
      label: 'Bot',
      selection: { kind: 'bot', levelIndex: 1, checkpointIndex: 0 },
      levelIndex: 1,
      checkpointIndex: 0,
      checkpointNumber: 1,
      parentId: 'level-1-cp-1-momentumEntities'
    })
  ];

  return {
    ancestorIdsById: {
      ...base.ancestorIdsById,
      'level-1': ['root'],
      'level-1-cp-1': ['root', 'level-1'],
      'level-1-cp-1-momentumEntities': ['root', 'level-1', 'level-1-cp-1'],
      'level-1-cp-1-bot': ['root', 'level-1', 'level-1-cp-1', 'level-1-cp-1-momentumEntities']
    },
    childrenById: {
      ...base.childrenById,
      root: [...(base.childrenById.root ?? []), 'level-1'],
      'level-1': ['level-1-cp-1'],
      'level-1-cp-1': ['level-1-cp-1-momentumEntities'],
      'level-1-cp-1-momentumEntities': ['level-1-cp-1-bot']
    },
    nodeById: Object.fromEntries(nodes.map((node) => [node.id, node])),
    nodes,
    orderedIds: nodes.map((node) => node.id),
    warningsById: {
      ...base.warningsById,
      'level-1': [],
      'level-1-cp-1': [],
      'level-1-cp-1-momentumEntities': [],
      'level-1-cp-1-bot': []
    }
  };
}

describe('workspace scope helpers', () => {
  it('maps selections to document, level, and checkpoint scopes', () => {
    expect(getWorkspaceScopeForSelection({ kind: 'start' })).toEqual({ kind: 'document' });
    expect(getWorkspaceScopeForSelection({ kind: 'level', levelIndex: 1 })).toEqual({ kind: 'level', levelIndex: 1 });
    expect(getWorkspaceScopeForSelection({ kind: 'touchOrb', levelIndex: 2, checkpointIndex: 3, orbIndex: 0 })).toEqual({
      kind: 'checkpoint',
      levelIndex: 2,
      checkpointIndex: 3
    });
    expect(getWorkspaceScopeForSelection({ kind: 'momentumEntities', levelIndex: 1, checkpointIndex: 2 })).toEqual({
      kind: 'checkpoint',
      levelIndex: 1,
      checkpointIndex: 2
    });
  });

  it('builds breadcrumbs for nested scopes', () => {
    expect(buildWorkspaceScopeBreadcrumbs({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 1 })).toEqual([
      { id: 'document', label: 'Spawn View', scope: { kind: 'document' } },
      { id: 'level-0', label: 'Level 1', scope: { kind: 'level', levelIndex: 0 } },
      {
        id: 'level-0-checkpoint-1',
        label: 'Checkpoint 2',
        scope: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 1 }
      }
    ]);
  });

  it('uses format-aware document scope descriptions', () => {
    expect(getWorkspaceScopeDescription({ kind: 'document' }, 'momentum')).toBe(
      'Spawn View shows spawn and level boundaries'
    );
    expect(getWorkspaceScopeDescription({ kind: 'document' }, 'hax')).toBe(
      'Spawn View shows spawn, level boundaries, and top-level Hax wrappers'
    );
  });
});

describe('buildWorkspaceScopeGraph', () => {
  it('collects only spawn and top-level nodes in document scope', () => {
    const scopedIds = Array.from(getScopeNodeIds(createIndex(), { kind: 'document' }));

    expect(scopedIds).toEqual(['root', 'root-haxEffects', 'root-haxEffect-0', 'level-0']);
    expect(scopedIds).not.toContain('level-0-cp-1');
  });

  it('builds a level-local graph without checkpoint descendants', () => {
    const scopedGraph = buildWorkspaceScopeGraph(createIndex(), { kind: 'level', levelIndex: 0 }, {});

    expect(scopedGraph?.nodes.map((node) => node.id)).toEqual(['level-0', 'level-0-cp-1']);
    expect(scopedGraph?.edges.map((edge) => edge.id)).toEqual(['edge-level-0-level-0-cp-1']);
    expect(scopedGraph?.nodes.some((node) => node.id === 'level-0-cp-1-bot')).toBe(false);
  });

  it('builds a checkpoint-local graph with only local descendants plus ancestor context', () => {
    const scopedGraph = buildWorkspaceScopeGraph(
      createIndex(),
      { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      {}
    );

    expect(scopedGraph?.nodes.map((node) => node.id)).toEqual([
      'level-0',
      'level-0-cp-1',
      'level-0-cp-1-momentumEntities',
      'level-0-cp-1-bot',
      'level-0-cp-1-haxEffects',
      'level-0-cp-1-haxEffect-0'
    ]);
    expect(scopedGraph?.nodes.some((node) => node.id === 'root-haxEffects')).toBe(false);
    expect(
      scopedGraph?.nodes.find((node) => node.id === getNodeIdFromSelection({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }))?.label
    ).toBe('Checkpoint 1');
  });

  it('does not let hidden document branches affect checkpoint-scope bounds', () => {
    const index = createIndex();
    const expandedIndex = createIndexWithHiddenLevel();
    const baselineScope = buildWorkspaceScopeGraph(index, { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }, {});
    const expandedScope = buildWorkspaceScopeGraph(
      expandedIndex,
      { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      {}
    );

    expect(expandedScope?.nodes.map((node) => node.id)).toEqual(baselineScope?.nodes.map((node) => node.id));
    expect(expandedScope?.width).toBe(baselineScope?.width);
    expect(expandedScope?.height).toBe(baselineScope?.height);
  });

  it('applies persisted yOffset overrides on top of the scoped baseline layout', () => {
    const baseline = buildWorkspaceScopeGraph(
      createIndex(),
      { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      {}
    );
    const withOffset = buildWorkspaceScopeGraph(
      createIndex(),
      { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      { 'level-0-cp-1-bot': { yOffset: 24 } }
    );

    const baselineBot = baseline?.nodes.find((node) => node.id === 'level-0-cp-1-bot');
    const offsetBot = withOffset?.nodes.find((node) => node.id === 'level-0-cp-1-bot');

    expect(offsetBot?.y).toBe((baselineBot?.y ?? 0) + 24);
  });
});
