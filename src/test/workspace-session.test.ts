import { describe, expect, it } from 'vitest';
import {
  buildHydratedSessionState,
  buildNewDraftSessionState,
  buildImportFailureSessionState,
  buildImportedSessionState,
  createWorkspaceSessionSnapshotPayloadFromState,
  createInitialWorkspaceSessionState,
  getImportErrorMessage,
  workspaceSessionReducer,
  sanitizeEditorLayout
} from '../app/useWorkspaceSession';
import { validateDraftMap } from '../domain/model/validateDraftMap';
import { AppError } from '../shared/errors/AppError';
import type { ImportedSourceText } from '../app/importSourceText';
import type { MomentumMapModel } from '../domain/model/types';
import { checkpoint, checkpointConfig } from './model-helpers';

function createImportedSource(): ImportedSourceText {
  return {
    document: {
      format: 'momentum',
      map: {
        start: { x: 1, y: 2, z: 3 },
        levels: [
          {
            name: 'Level 1',
            color: 'Aqua',
            checkpoints: [
              checkpoint({ x: 10, y: 11, z: 12 }),
              checkpoint({ x: 13, y: 14, z: 15 })
            ],
            checkpointConfigs: [checkpointConfig()]
          }
        ]
      }
    },
    warnings: [{ code: 'missing_first_level_marker', message: 'Inserted Level 1.', targetKind: 'start' }]
  };
}

function createMapWithTouchOrbs(touchOrbCount: number): MomentumMapModel {
  return {
    start: { x: 1, y: 2, z: 3 },
    levels: [
      {
        name: 'Level 1',
        color: 'Aqua',
        checkpoints: [
          checkpoint({ x: 10, y: 11, z: 12 }),
          checkpoint({ x: 13, y: 14, z: 15 })
        ],
        checkpointConfigs: [
          checkpointConfig({
            touchOrbs: Array.from({ length: touchOrbCount }, (_, index) => ({
              position: { x: index, y: index + 1, z: index + 2 },
              radius: 1
            }))
          })
        ]
      }
    ]
  };
}

describe('workspace session state helpers', () => {
  it('creates an empty initial state', () => {
    expect(createInitialWorkspaceSessionState()).toEqual({
      inputText: '',
      document: null,
      map: null,
      warnings: [],
      readNoteNodeIds: [],
      selection: null,
      multiSelection: [],
      layout: {},
      errorMessage: null,
      copyStatus: null,
      undoStack: [],
      redoStack: []
    });
  });

  it('builds an imported state and resets editor-only state', () => {
    const current = {
      ...createInitialWorkspaceSessionState(),
      selection: { kind: 'level', levelIndex: 0 } as const,
      multiSelection: ['level-0'],
      readNoteNodeIds: ['root'],
      layout: { 'level-0': { yOffset: 20 } },
      errorMessage: 'old',
      copyStatus: 'old'
    };

    const next = buildImportedSessionState(current, 'input', createImportedSource());

    expect(next.inputText).toBe('input');
    expect(next.document?.format).toBe('momentum');
    expect(next.map?.levels).toHaveLength(1);
    expect(next.warnings).toHaveLength(1);
    expect(next.readNoteNodeIds).toEqual([]);
    expect(next.selection).toEqual({ kind: 'start' });
    expect(next.multiSelection).toEqual([]);
    expect(next.layout).toEqual({});
    expect(next.errorMessage).toBeNull();
    expect(next.copyStatus).toBeNull();
  });

  it('builds an import failure state and clears imported data', () => {
    const current = buildImportedSessionState(createInitialWorkspaceSessionState(), 'input', createImportedSource());
    const next = buildImportFailureSessionState(current, 'broken', 'Import failed.');

    expect(next.inputText).toBe('broken');
    expect(next.map).toBeNull();
    expect(next.warnings).toEqual([]);
    expect(next.readNoteNodeIds).toEqual([]);
    expect(next.selection).toBeNull();
    expect(next.errorMessage).toBe('Import failed.');
    expect(next.copyStatus).toBeNull();
  });

  it('builds a new draft state with an empty map and cleared editor-only state', () => {
    const current = buildImportedSessionState(createInitialWorkspaceSessionState(), 'input', createImportedSource());
    const next = buildNewDraftSessionState(current, 'momentum');

    expect(next.map).toEqual({
      start: { x: 0, y: 0, z: 0 },
      levels: []
    });
    expect(next.readNoteNodeIds).toEqual([]);
    expect(next.selection).toEqual({ kind: 'start' });
    expect(next.multiSelection).toEqual([]);
    expect(next.layout).toEqual({});
    expect(next.errorMessage).toBeNull();
    expect(next.copyStatus).toBeNull();
    expect(validateDraftMap(next.map)).toEqual({
      isRenderReady: false,
      blockingReasons: ['Add at least one level to generate output.']
    });
  });

  it('builds a new empty Hax draft when requested', () => {
    const current = buildImportedSessionState(createInitialWorkspaceSessionState(), 'input', createImportedSource());
    const next = buildNewDraftSessionState(current, 'hax');

    expect(next.document).toEqual({
      format: 'hax',
      spawn: expect.objectContaining({
        position: { x: 0, y: 0, z: 0 },
        isLevelStart: false
      }),
      checkpoints: []
    });
    expect(next.map).toBeNull();
    expect(next.selection).toEqual({ kind: 'start' });
    expect(next.layout).toEqual({});
  });

  it('hydrates saved session payloads and sanitizes editor-only state', () => {
    const current = createInitialWorkspaceSessionState();
    const payload = createWorkspaceSessionSnapshotPayloadFromState({
      ...current,
      inputText: 'saved text',
      document: { format: 'momentum', map: createMapWithTouchOrbs(1) },
      warnings: [],
      readNoteNodeIds: ['level-0', 'missing-node'],
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      multiSelection: ['level-0-cp-1'],
      layout: {
        'level-0': { yOffset: 20 },
        invalid: { yOffset: 0 }
      }
    });

    const hydrated = buildHydratedSessionState(current, payload);

    expect(hydrated.inputText).toBe('saved text');
    expect(hydrated.readNoteNodeIds).toEqual(['level-0']);
    expect(hydrated.layout).toEqual({ 'level-0': { yOffset: 20 } });
    expect(hydrated.undoStack).toEqual([]);
    expect(hydrated.redoStack).toEqual([]);
    expect(hydrated.errorMessage).toBeNull();
    expect(hydrated.copyStatus).toBeNull();
  });

  it('formats AppError messages with their code', () => {
    expect(getImportErrorMessage(new AppError('bad_input', 'Bad input.'), 'fallback')).toBe('Bad input. (bad_input)');
    expect(getImportErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });

  it('keeps only finite non-zero yOffset layout entries and drops legacy absolute layout shapes', () => {
    expect(
      sanitizeEditorLayout({
        'level-0': { yOffset: 24 },
        'level-0-cp-1': { x: 12, y: 15 },
        'level-1': { yOffset: 0 },
        invalid: null
      })
    ).toEqual({
      'level-0': { yOffset: 24 }
    });
  });

  it('stores model snapshots for undo and replays them with redo', () => {
    const imported = createImportedSource();
    let state = workspaceSessionReducer(createInitialWorkspaceSessionState(), {
      type: 'import/success',
      inputText: 'input',
      imported
    });

    const updatedMap = createMapWithTouchOrbs(2);
    state = workspaceSessionReducer(state, {
      type: 'map/set',
      value: updatedMap
    });

    state = {
      ...state,
      readNoteNodeIds: ['level-0'],
      selection: { kind: 'level', levelIndex: 0 },
      multiSelection: ['level-0']
    };

    const undoneState = workspaceSessionReducer(state, { type: 'undo' });
    expect(undoneState.map).toEqual(imported.document.format === 'momentum' ? imported.document.map : null);
    expect(undoneState.readNoteNodeIds).toEqual(['level-0']);
    expect(undoneState.selection).toBeNull();
    expect(undoneState.multiSelection).toEqual([]);
    expect(undoneState.redoStack).toHaveLength(1);

    const redoneState = workspaceSessionReducer(undoneState, { type: 'redo' });
    expect(redoneState.map).toEqual(updatedMap);
    expect(redoneState.selection).toBeNull();
    expect(redoneState.multiSelection).toEqual([]);
    expect(redoneState.undoStack).toHaveLength(2);
    expect(redoneState.redoStack).toHaveLength(0);
  });

  it('caps undo history to the configured depth limit', () => {
    let state = workspaceSessionReducer(createInitialWorkspaceSessionState(), { type: 'draft/new', format: 'momentum' });
    expect(state.map).not.toBeNull();

    for (let index = 0; index < 60; index += 1) {
      state = workspaceSessionReducer(state, {
        type: 'map/set',
        value: {
          ...state.map!,
          start: { x: index, y: index + 1, z: index + 2 }
        }
      });
    }

    expect(state.undoStack).toHaveLength(50);
  });

  it('builds the same durable snapshot payload when only non-persisted session fields change', () => {
    const durableState = buildImportedSessionState(createInitialWorkspaceSessionState(), 'input', createImportedSource());
    const nextState = {
      ...durableState,
      errorMessage: 'transient error',
      copyStatus: 'transient status',
      undoStack: [durableState.document],
      redoStack: [null]
    };

    expect(createWorkspaceSessionSnapshotPayloadFromState(nextState)).toEqual(
      createWorkspaceSessionSnapshotPayloadFromState(durableState)
    );
  });
});
