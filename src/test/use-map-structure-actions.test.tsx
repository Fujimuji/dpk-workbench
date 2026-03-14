import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyDraftVec3 } from '../domain/model/draftVectors';
import { createEmptyMap } from '../domain/model/mutators';
import { useMapStructureActions, type MapStructureActions } from '../features/workspace/canvas/useMapStructureActions';
import type { EditorNodeSummary } from '../features/workspace/graph/types';

function createNode(overrides: Partial<EditorNodeSummary> & Pick<EditorNodeSummary, 'id' | 'kind'>): EditorNodeSummary {
  const { id, kind, ...rest } = overrides;

  return {
    id,
    kind,
    label: overrides.label ?? overrides.id,
    sublabel: overrides.sublabel ?? '',
    selection: overrides.selection ?? { kind: 'start' },
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 120,
    height: overrides.height ?? 40,
    portInX: overrides.portInX ?? 0,
    portOutX: overrides.portOutX ?? 120,
    noteMarker: overrides.noteMarker ?? false,
    hasSettings: overrides.hasSettings ?? true,
    ...rest
  };
}

function mountHarness(
  options: Parameters<typeof useMapStructureActions>[0]
): { actions: () => MapStructureActions; unmount: () => void } {
  let currentActions: MapStructureActions | null = null;
  const container = document.createElement('div');
  const root = createRoot(container);

  function Harness() {
    currentActions = useMapStructureActions(options);
    return null;
  }

  flushSync(() => {
    root.render(<Harness />);
  });

  return {
    actions: () => {
      if (!currentActions) {
        throw new Error('Harness actions were not initialized.');
      }
      return currentActions;
    },
    unmount: () => {
      flushSync(() => {
        root.unmount();
      });
    }
  };
}

function createMomentumOptions(map = createEmptyMap()) {
  return {
    clearCanvasSelection: vi.fn(),
    closeEditor: vi.fn(),
    currentScope: { kind: 'document' as const },
    document: { format: 'momentum' as const, map },
    graph: null,
    layout: {},
    map,
    onDocumentChange: vi.fn(),
    onLayoutChange: vi.fn(),
    onMultiSelectionChange: vi.fn(),
    onReadNoteNodeIdsChange: vi.fn(),
    onRevealSelection: vi.fn(),
    onSelectionChange: vi.fn(),
    readNoteNodeIds: [],
    returnToCheckpoint: vi.fn(),
    selectNodeBySelection: vi.fn(),
    selection: null
  };
}

function createHaxOptions() {
  return {
    clearCanvasSelection: vi.fn(),
    closeEditor: vi.fn(),
    currentScope: { kind: 'checkpoint' as const, levelIndex: 0, checkpointIndex: 0 },
    document: {
      format: 'hax' as const,
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
    },
    graph: null,
    layout: {},
    map: null,
    onDocumentChange: vi.fn(),
    onLayoutChange: vi.fn(),
    onMultiSelectionChange: vi.fn(),
    onReadNoteNodeIdsChange: vi.fn(),
    onRevealSelection: vi.fn(),
    onSelectionChange: vi.fn(),
    readNoteNodeIds: [],
    returnToCheckpoint: vi.fn(),
    selectNodeBySelection: vi.fn(),
    selection: null
  };
}

describe('useMapStructureActions', () => {
  it('reveals the new level after adding one without leaving document scope', () => {
    const options = createMomentumOptions();
    const harness = mountHarness(options);

    flushSync(() => {
      harness.actions().handleAddLevel();
    });

    expect(options.onRevealSelection).toHaveBeenCalledWith(
      { kind: 'level', levelIndex: 0 },
      { preserveScope: true }
    );
    harness.unmount();
  });

  it('reveals the new checkpoint, preserves level scope, and leaves its position empty', () => {
    const map = {
      ...createEmptyMap(),
      levels: [{ name: 'Warmup', color: 'Aqua' as const, checkpoints: [], checkpointConfigs: [] }]
    };
    const options = {
      ...createMomentumOptions(map),
      currentScope: { kind: 'level' as const, levelIndex: 0 }
    };
    const harness = mountHarness(options);

    flushSync(() => {
      harness.actions().handleAddCheckpoint(0, null, 'below');
    });

    expect(options.onRevealSelection).toHaveBeenCalledWith(
      { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      { preserveScope: true }
    );
    expect(options.onDocumentChange).toHaveBeenCalledWith({
      format: 'momentum',
      map: expect.objectContaining({
        levels: [
          expect.objectContaining({
            checkpoints: [
              expect.objectContaining({ position: createEmptyDraftVec3() }),
              expect.objectContaining({ position: createEmptyDraftVec3() })
            ]
          })
        ]
      })
    });
    harness.unmount();
  });

  it('reveals a new PM entity and keeps its position empty', () => {
    const map = {
      start: { x: 0, y: 0, z: 0 },
      levels: [
        {
          name: 'Warmup',
          color: 'Aqua' as const,
          checkpoints: [
            { position: { x: 0, y: 0, z: 0 }, radius: 2 },
            { position: { x: 10, y: 0, z: 0 }, radius: 2 }
          ],
          checkpointConfigs: [
            {
              liquid: false,
              timeLimit: null,
              minimumSpeed: null,
              heightGoal: null,
              disableAbilities: null,
              touchOrbs: null,
              abilityOrbs: null,
              lava: null,
              bot: null,
              impulses: null,
              portal: null
            }
          ]
        }
      ]
    };
    const options = createMomentumOptions(map);
    const harness = mountHarness(options);

    flushSync(() => {
      harness.actions().handleCreateChild(
        createNode({
          id: 'level-0-cp-1-momentumEntities',
          kind: 'momentumEntities',
          selection: { kind: 'momentumEntities', levelIndex: 0, checkpointIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0
        }),
        'touch'
      );
    });

    expect(options.onRevealSelection).toHaveBeenCalledWith({ kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 });
    expect(options.onDocumentChange).toHaveBeenCalledWith({
      format: 'momentum',
      map: expect.objectContaining({
        levels: [
          expect.objectContaining({
            checkpointConfigs: [
              expect.objectContaining({
                touchOrbs: [expect.objectContaining({ position: createEmptyDraftVec3() })]
              })
            ]
          })
        ]
      })
    });
    harness.unmount();
  });

  it('reveals new Hax effects and missions after creation', () => {
    const options = createHaxOptions();
    const harness = mountHarness(options);

    flushSync(() => {
      harness.actions().handleCreateHaxEffect(
        createNode({
          id: 'level-0-cp-1-haxEffects',
          kind: 'haxEffects',
          selection: { kind: 'haxEffects', levelIndex: 0, checkpointIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0
        }),
        'time'
      );
    });

    expect(options.onRevealSelection).toHaveBeenCalledWith({
      kind: 'haxEffect',
      levelIndex: 0,
      checkpointIndex: 0,
      effectIndex: 0
    });
    expect(options.onDocumentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpoints: [
          expect.objectContaining({
            effects: [expect.objectContaining({ position: createEmptyDraftVec3() })]
          })
        ]
      })
    );

    flushSync(() => {
      harness.actions().handleCreateHaxMission(
        createNode({
          id: 'level-0-cp-1-haxMissions',
          kind: 'haxMissions',
          selection: { kind: 'haxMissions', levelIndex: 0, checkpointIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0
        })
      );
    });

    expect(options.onRevealSelection).toHaveBeenCalledWith({
      kind: 'haxMission',
      levelIndex: 0,
      checkpointIndex: 0,
      missionIndex: 0
    });
    harness.unmount();
  });
});
