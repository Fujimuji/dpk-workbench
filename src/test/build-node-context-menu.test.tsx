import { describe, expect, it, vi } from 'vitest';
import { buildNodeContextMenu } from '../features/workspace/canvas/buildNodeContextMenu';
import { withEditorGraphIndexes } from '../features/workspace/graph/graphIndexes';
import type {
  EditorGraphModel,
  EditorNodeSummary
} from '../features/workspace/graph/types';
import type { MapStructureActions } from '../features/workspace/canvas/useMapStructureActions';
import type { MomentumMapModel } from '../domain/model/types';
import type { HaxDocument } from '../domain/import/hax/types';
import { checkpoint, checkpointConfig } from './model-helpers';
import type { WorkspaceScope } from '../features/workspace/types';

function createMap(): MomentumMapModel {
  return {
    start: { x: 0, y: 0, z: 0 },
    levels: [
      {
        name: 'Level 1',
        color: 'Aqua',
        checkpoints: [
          checkpoint({ x: 0, y: 0, z: 0 }),
          checkpoint({ x: 10, y: 0, z: 0 })
        ],
        checkpointConfigs: [
          checkpointConfig({
            touchOrbs: [{ position: { x: 1, y: 2, z: 3 }, radius: 1 }],
            abilityOrbs: [
              {
                position: { x: 1, y: 2, z: 3 },
                radius: 1,
                abilities: { seismicSlam: true, powerblock: true, rocketPunch: true }
              }
            ],
            lava: [{ position: { x: 1, y: 2, z: 3 }, radius: 1 }]
          })
        ]
      },
      {
        name: 'Level 2',
        color: 'Purple',
        checkpoints: [
          checkpoint({ x: 20, y: 0, z: 0 }),
          checkpoint({ x: 30, y: 0, z: 0 })
        ],
        checkpointConfigs: [checkpointConfig({})]
      }
    ]
  };
}

function createHaxDocument(): HaxDocument {
  return {
    format: 'hax',
    spawn: {
      position: { x: 0, y: 0, z: 0 },
      radius: 2,
      viewAngle: 0,
      isLevelStart: false,
      prime: {
        rocketPunchDisabled: false,
        powerblockDisabled: false,
        seismicSlamDisabled: false,
        centerlessCheckpoint: false,
        effectLock: false,
        extraFactors: []
      },
      missions: [],
      abilityCount: null,
      teleport: null,
      timeTrialMinimum: null,
      effects: [],
      fakeUpper: false
    },
    checkpoints: [
      {
        position: { x: 10, y: 0, z: 0 },
        radius: 2,
        viewAngle: 0,
        isLevelStart: true,
        prime: {
          rocketPunchDisabled: false,
          powerblockDisabled: false,
          seismicSlamDisabled: false,
          centerlessCheckpoint: false,
          effectLock: false,
          extraFactors: []
        },
        missions: [],
        abilityCount: null,
        teleport: null,
        timeTrialMinimum: null,
        effects: [],
        fakeUpper: false
      }
    ]
  };
}

function createNode(overrides: Partial<EditorNodeSummary> & Pick<EditorNodeSummary, 'id' | 'kind'>): EditorNodeSummary {
  const { id, kind, ...rest } = overrides;
  return {
    id,
    kind,
    label: overrides.label ?? id,
    sublabel: overrides.sublabel ?? '',
    selection: overrides.selection ?? { kind: 'start' },
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 100,
    height: overrides.height ?? 34,
    portInX: overrides.portInX ?? 0,
    portOutX: overrides.portOutX ?? 100,
    noteMarker: overrides.noteMarker ?? false,
    hasSettings: overrides.hasSettings ?? false,
    ...rest
  };
}

function createActions(): MapStructureActions {
  return {
    applyStructuralEdit: vi.fn(),
    collectSubtreeNodeIds: vi.fn(),
    handleAddCheckpoint: vi.fn(),
    handleAddLevel: vi.fn(),
    handleCreateChild: vi.fn(),
    handleCreateHaxEffect: vi.fn(),
    handleCreateHaxMission: vi.fn(),
    handleDeleteNodes: vi.fn(),
    handleInsertLevel: vi.fn(),
    handleMoveCheckpoint: vi.fn(),
    handleMoveLevel: vi.fn(),
    handleRemoveCheckpoint: vi.fn(),
    handleRemoveEntity: vi.fn(),
    handleRemoveLevel: vi.fn()
  };
}

function createScope(scope: WorkspaceScope = { kind: 'document' }): WorkspaceScope {
  return scope;
}

describe('buildNodeContextMenu', () => {
  it('includes root structural actions for start nodes', () => {
    const items = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope(),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: createNode({ id: 'root', kind: 'start' }),
      onCloseContextMenu: vi.fn()
    });

    expect(items.map((item) => item.id)).toContain('add-level');
  });

  it('keeps PM child creation off playable checkpoints', () => {
    const node = createNode({
      id: 'level-0-cp-1',
      kind: 'checkpoint',
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0
    });

    const items = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node,
      onCloseContextMenu: vi.fn()
    });

    expect(items.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(['add-touch', 'add-ability', 'add-lava', 'add-bot'])
    );
  });

  it('moves PM child creation actions to the entities wrapper node', () => {
    const node = createNode({
      id: 'level-0-cp-1-momentumEntities',
      kind: 'momentumEntities',
      selection: { kind: 'momentumEntities', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0
    });

    const items = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node,
      onCloseContextMenu: vi.fn()
    });

    expect(items.map((item) => item.id)).toEqual(
      expect.arrayContaining(['add-touch', 'add-ability', 'add-lava', 'add-bot', 'add-impulse', 'add-portal'])
    );
    expect(items.find((item) => item.id === 'add-bot')?.disabled).toBe(false);
  });

  it('offers bulk delete wording when the context node is inside the active multi-selection', () => {
    const touchOrb0 = createNode({
      id: 'level-0-cp-1-touchOrb-0',
      kind: 'touchOrb',
      label: 'Touch Orb 1',
      selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0,
      orbIndex: 0
    });
    const touchOrb1 = createNode({
      id: 'level-0-cp-1-touchOrb-1',
      kind: 'touchOrb',
      label: 'Touch Orb 2',
      selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 1 },
      levelIndex: 0,
      checkpointIndex: 0,
      orbIndex: 1
    });
    const graph: EditorGraphModel = withEditorGraphIndexes({
      nodes: [touchOrb0, touchOrb1],
      edges: [],
      warningsById: {},
      width: 1000,
      height: 600
    });

    const items = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }),
      graph,
      map: createMap(),
      multiSelection: [touchOrb0.id, touchOrb1.id],
      multiSelectionActive: true,
      multiSelectionSet: new Set([touchOrb0.id, touchOrb1.id]),
      node: touchOrb0,
      onCloseContextMenu: vi.fn()
    });

    expect(items.find((item) => item.id === 'remove-selected')).toMatchObject({
      label: 'Delete Selected (2)'
    });
  });

  it('moves Hax effect creation actions to the effects wrapper node', () => {
    const checkpointNode = createNode({
      id: 'level-0-cp-1',
      kind: 'checkpoint',
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0
    });
    const checkpointItems = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }),
      document: createHaxDocument(),
      graph: null,
      map: null,
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: checkpointNode,
      onCloseContextMenu: vi.fn()
    });

    expect(checkpointItems.map((item) => item.id)).not.toEqual(expect.arrayContaining(['add-time', 'add-death', 'add-portal', 'add-zipline']));

    const effectsNode = createNode({
      id: 'level-0-cp-1-haxEffects',
      kind: 'haxEffects',
      selection: { kind: 'haxEffects', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0
    });

    const items = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }),
      document: createHaxDocument(),
      graph: null,
      map: null,
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: effectsNode,
      onCloseContextMenu: vi.fn()
    });

    expect(items.map((item) => item.id)).toEqual(expect.arrayContaining(['add-time', 'add-death', 'add-portal', 'add-zipline']));
  });

  it('adds Hax mission creation to the missions wrapper node', () => {
    const node = createNode({
      id: 'level-0-cp-1-haxMissions',
      kind: 'haxMissions',
      selection: { kind: 'haxMissions', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0
    });

    const items = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }),
      document: createHaxDocument(),
      graph: null,
      map: null,
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node,
      onCloseContextMenu: vi.fn()
    });

    expect(items.map((item) => item.id)).toContain('add-mission');
  });

  it('allows Hax effect creation from the spawn effects wrapper node', () => {
    const node = createNode({
      id: 'root-haxEffects',
      kind: 'haxEffects',
      selection: { kind: 'haxSpawnEffects' }
    });

    const items = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope(),
      document: createHaxDocument(),
      graph: null,
      map: null,
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node,
      onCloseContextMenu: vi.fn()
    });

    expect(items.map((item) => item.id)).toEqual(expect.arrayContaining(['add-time', 'add-death', 'add-portal']));
  });

  it('shows level insertion only in document scope and checkpoint insertion only in level scope', () => {
    const levelNode = createNode({
      id: 'level-0',
      kind: 'level',
      selection: { kind: 'level', levelIndex: 0 },
      levelIndex: 0
    });

    const documentItems = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'document' }),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: levelNode,
      onCloseContextMenu: vi.fn()
    });

    expect(documentItems.map((item) => item.id)).toEqual(
      expect.arrayContaining(['add-level-above', 'add-level-below', 'move-level-down'])
    );
    expect(documentItems.map((item) => item.id)).not.toContain('add-checkpoint');

    const levelScopeItems = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'level', levelIndex: 0 }),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: levelNode,
      onCloseContextMenu: vi.fn()
    });

    expect(levelScopeItems.map((item) => item.id)).toContain('add-checkpoint');
    expect(levelScopeItems.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(['add-level-above', 'add-level-below', 'move-level-up', 'move-level-down'])
    );

    const secondLevelNode = createNode({
      id: 'level-1',
      kind: 'level',
      selection: { kind: 'level', levelIndex: 1 },
      levelIndex: 1
    });

    const secondLevelDocumentItems = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'document' }),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: secondLevelNode,
      onCloseContextMenu: vi.fn()
    });

    expect(secondLevelDocumentItems.map((item) => item.id)).toContain('move-level-up');
  });

  it('removes checkpoint reorder and insert-above actions and hides insertion outside level scope', () => {
    const checkpointNode = createNode({
      id: 'level-0-cp-1',
      kind: 'checkpoint',
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0
    });

    const levelScopeItems = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'level', levelIndex: 0 }),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: checkpointNode,
      onCloseContextMenu: vi.fn()
    });

    expect(levelScopeItems.map((item) => item.id)).toContain('add-checkpoint-below');
    expect(levelScopeItems.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(['add-checkpoint-above', 'move-checkpoint-up', 'move-checkpoint-down'])
    );

    const checkpointScopeItems = buildNodeContextMenu({
      actions: createActions(),
      currentScope: createScope({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }),
      graph: null,
      map: createMap(),
      multiSelection: [],
      multiSelectionActive: false,
      multiSelectionSet: new Set<string>(),
      node: checkpointNode,
      onCloseContextMenu: vi.fn()
    });

    expect(checkpointScopeItems.map((item) => item.id)).not.toContain('add-checkpoint-below');
    expect(checkpointScopeItems.map((item) => item.id)).toContain('remove-checkpoint');
  });
});
