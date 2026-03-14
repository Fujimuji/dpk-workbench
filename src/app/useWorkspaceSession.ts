import { useEffect, useMemo, useReducer, useState } from 'react';
import { importSourceText, type ImportedSourceText } from '@/app/importSourceText';
import {
  clearWorkspaceSessionRecoverySnapshot,
  readWorkspaceSessionRecoverySnapshot,
  writeWorkspaceSessionRecoverySnapshot
} from '@/app/workspaceSessionRecovery';
import {
  createWorkspaceSessionSnapshot,
  hasMeaningfulWorkspaceSessionSnapshot,
  serializeWorkspaceSessionSnapshotPayload,
  type WorkspaceSessionSnapshot,
  type WorkspaceSessionSnapshotPayload
} from '@/app/workspaceSessionSnapshot';
import {
  convertHaxDocumentToMomentumDocument,
  renderDocumentOutput
} from '@/domain/document/helpers';
import { validateDocumentRenderReadiness } from '@/domain/document/validateDocumentRenderReadiness';
import type { WorkspaceDocument } from '@/domain/document/types';
import { getHaxLevelStartIndexes } from '@/domain/import/hax/levelLayout';
import type { HaxCheckpoint } from '@/domain/import/hax/types';
import { createCheckpointMarker, createDefaultCheckpointConfig } from '@/domain/import/pm/normalizers';
import { createEmptyMap } from '@/domain/model/mutators';
import type { RenderReadiness } from '@/domain/model/validateDraftMap';
import { AppError } from '@/shared/errors/AppError';
import { buildWorkspaceDocumentNodeIdSet } from '@/features/workspace/documentIndex';
import type { CheckpointConfig, MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import type {
  EditorLayoutState,
  EditorSelection,
  MultiNodeSelection
} from '@/features/workspace/types';

export interface WorkspaceSessionState {
  inputText: string;
  document: WorkspaceDocument | null;
  map: MomentumMapModel | null;
  warnings: ConversionWarning[];
  readNoteNodeIds: string[];
  selection: EditorSelection | null;
  multiSelection: MultiNodeSelection;
  layout: EditorLayoutState;
  errorMessage: string | null;
  copyStatus: string | null;
  undoStack: Array<WorkspaceDocument | null>;
  redoStack: Array<WorkspaceDocument | null>;
}

type WorkspaceSessionAction =
  | { type: 'draft/new'; format: 'momentum' | 'hax' }
  | { type: 'input/set'; value: string }
  | { type: 'import/success'; inputText: string; imported: ImportedSourceText }
  | { type: 'import/failure'; inputText: string; errorMessage: string }
  | { type: 'session/hydrate'; snapshot: WorkspaceSessionSnapshotPayload }
  | { type: 'read-notes/mark'; nodeId: string }
  | { type: 'read-notes/set'; nodeIds: string[] }
  | { type: 'map/set'; value: MomentumMapModel }
  | { type: 'document/set'; value: WorkspaceDocument; warnings?: ConversionWarning[] }
  | { type: 'selection/set'; value: EditorSelection | null }
  | { type: 'multi-selection/set'; value: MultiNodeSelection }
  | { type: 'layout/set'; value: EditorLayoutState }
  | { type: 'error/set'; value: string | null }
  | { type: 'copy-status/set'; value: string | null }
  | { type: 'undo' }
  | { type: 'redo' };

const HISTORY_DEPTH_LIMIT = 50;
export const RECOVERY_AUTOSAVE_DELAY_MS = 750;

function sanitizeReadNoteNodeIds(
  readNoteNodeIds: string[],
  document: WorkspaceDocument | null
): string[] {
  if (!document || readNoteNodeIds.length === 0) {
    return [];
  }

  const nodeIds = buildWorkspaceDocumentNodeIdSet(document);

  return Array.from(new Set(readNoteNodeIds.filter((nodeId) => nodeIds.has(nodeId))));
}

export interface WorkspaceExampleInputs {
  hax: string;
  momentum: string;
}

function pushHistorySnapshot(
  stack: Array<WorkspaceDocument | null>,
  snapshot: WorkspaceDocument | null
): Array<WorkspaceDocument | null> {
  const nextStack = [...stack, snapshot];
  if (nextStack.length <= HISTORY_DEPTH_LIMIT) {
    return nextStack;
  }

  return nextStack.slice(nextStack.length - HISTORY_DEPTH_LIMIT);
}

function coerceFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function sanitizeEditorLayout(layout: Record<string, unknown>): EditorLayoutState {
  const normalized: EditorLayoutState = {};

  Object.entries(layout).forEach(([nodeId, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    const yOffset = coerceFiniteNumber((value as { yOffset?: unknown }).yOffset);
    if (yOffset === null || yOffset === 0) {
      return;
    }

    normalized[nodeId] = { yOffset };
  });

  return normalized;
}

function normalizeCheckpointConfig(config: Partial<CheckpointConfig> | null | undefined): CheckpointConfig {
  const normalizedImpulses =
    config?.impulses?.map((impulse) => {
      const legacyImpulse = impulse as NonNullable<CheckpointConfig['impulses']>[number] & {
        segments?: Array<{ direction?: { x: number; y: number; z: number }; speed?: number }>;
      };

      return 'direction' in legacyImpulse && typeof legacyImpulse.speed === 'number'
        ? legacyImpulse
        : {
            position: legacyImpulse.position,
            direction: legacyImpulse.segments?.[0]?.direction ?? { x: 0, y: 1, z: 0 },
            speed: legacyImpulse.segments?.[0]?.speed ?? 10
          };
    }) ?? null;
  const legacyPortal = (config as Partial<CheckpointConfig> & { portals?: CheckpointConfig['portal'][] | CheckpointConfig['portal'] })?.portals;
  const normalizedPortal =
    config?.portal ??
    (Array.isArray(legacyPortal) ? legacyPortal[0] ?? null : legacyPortal ?? null);

  return {
    ...createDefaultCheckpointConfig(),
    ...config,
    impulses: normalizedImpulses,
    portal: normalizedPortal
  };
}

function normalizeWorkspaceDocument(document: WorkspaceDocument | null): WorkspaceDocument | null {
  if (!document || document.format === 'hax') {
    return document;
  }

  return {
    ...document,
    map: {
      ...document.map,
      levels: document.map.levels.map((level) => ({
        ...level,
        checkpoints: level.checkpoints.map((checkpoint) =>
          'position' in checkpoint ? checkpoint : createCheckpointMarker(checkpoint, 2)
        ),
        checkpointConfigs: level.checkpointConfigs.map((config) => normalizeCheckpointConfig(config))
      }))
    }
  };
}

function projectDocument(document: WorkspaceDocument | null): MomentumMapModel | null {
  if (!document) {
    return null;
  }

  // Hax sessions now use the structural document index and scoped Hax editors directly.
  // Keeping a PM projection in session state only adds conversion churn and breaks blank drafts.
  return document.format === 'momentum' ? document.map : null;
}

export function createInitialWorkspaceSessionState(): WorkspaceSessionState {
  return {
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
  };
}

function createEmptyHaxCheckpoint(isLevelStart: boolean): HaxCheckpoint {
  return {
    position: { x: 0, y: 0, z: 0 },
    radius: 2,
    viewAngle: 0,
    isLevelStart,
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
  };
}

export function createWorkspaceSessionSnapshotPayloadFromState(
  state: Pick<
    WorkspaceSessionState,
    | 'document'
    | 'inputText'
    | 'layout'
    | 'multiSelection'
    | 'readNoteNodeIds'
    | 'selection'
    | 'warnings'
  >
): WorkspaceSessionSnapshotPayload {
  return {
    inputText: state.inputText,
    document: state.document,
    warnings: state.warnings,
    readNoteNodeIds: state.readNoteNodeIds,
    selection: state.selection,
    multiSelection: state.multiSelection,
    layout: state.layout
  };
}

export function sanitizeWorkspaceSessionSnapshotPayload(
  payload: WorkspaceSessionSnapshotPayload
): WorkspaceSessionSnapshotPayload {
  const document = normalizeWorkspaceDocument(payload.document);
  const map = projectDocument(document);
  const layout = sanitizeEditorLayout(payload.layout as Record<string, unknown>);
  const readNoteNodeIds = sanitizeReadNoteNodeIds(payload.readNoteNodeIds, document);
  const canKeepSelection = Boolean(document);

  return {
    inputText: payload.inputText,
    document,
    warnings: payload.warnings,
    readNoteNodeIds,
    selection: canKeepSelection ? payload.selection : null,
    multiSelection: canKeepSelection ? payload.multiSelection : [],
    layout: canKeepSelection ? layout : {}
  };
}

export function getImportErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof AppError ? `${error.message} (${error.code})` : fallbackMessage;
}

function buildStateForDocument(
  current: WorkspaceSessionState,
  nextInputText: string,
  document: WorkspaceDocument | null,
  warnings: ConversionWarning[]
): WorkspaceSessionState {
  const normalizedDocument = normalizeWorkspaceDocument(document);
  return {
    ...current,
    inputText: nextInputText,
    document: normalizedDocument,
    map: projectDocument(normalizedDocument),
    warnings,
    readNoteNodeIds: [],
    selection: normalizedDocument ? { kind: 'start' } : null,
    multiSelection: [],
    layout: {},
    errorMessage: null,
    copyStatus: null
  };
}

export function buildImportedSessionState(
  current: WorkspaceSessionState,
  nextInputText: string,
  imported: ImportedSourceText
): WorkspaceSessionState {
  return buildStateForDocument(current, nextInputText, imported.document, imported.warnings);
}

export function buildImportFailureSessionState(
  current: WorkspaceSessionState,
  nextInputText: string,
  errorMessage: string
): WorkspaceSessionState {
  return {
    ...current,
    inputText: nextInputText,
    document: null,
    map: null,
    warnings: [],
    readNoteNodeIds: [],
    selection: null,
    multiSelection: [],
    layout: {},
    errorMessage,
    copyStatus: null
  };
}

export function buildNewDraftSessionState(
  current: WorkspaceSessionState,
  format: 'momentum' | 'hax' = 'momentum'
): WorkspaceSessionState {
  return buildStateForDocument(
    current,
    current.inputText,
    format === 'momentum'
      ? {
          format: 'momentum',
          map: createEmptyMap()
        }
      : {
          format: 'hax',
          spawn: createEmptyHaxCheckpoint(false),
          checkpoints: []
        },
    []
  );
}

export function buildHydratedSessionState(
  current: WorkspaceSessionState,
  snapshot: WorkspaceSessionSnapshotPayload
): WorkspaceSessionState {
  const sanitized = sanitizeWorkspaceSessionSnapshotPayload(snapshot);

  return {
    ...current,
    ...sanitized,
    map: projectDocument(sanitized.document),
    errorMessage: null,
    copyStatus: null,
    undoStack: [],
    redoStack: []
  };
}

function applyDocumentMutationHistory(state: WorkspaceSessionState, nextState: WorkspaceSessionState): WorkspaceSessionState {
  return {
    ...nextState,
    undoStack: pushHistorySnapshot(state.undoStack, state.document),
    redoStack: []
  };
}

function applyHistorySnapshot(
  state: WorkspaceSessionState,
  documentSnapshot: WorkspaceDocument | null,
  undoStack: Array<WorkspaceDocument | null>,
  redoStack: Array<WorkspaceDocument | null>
): WorkspaceSessionState {
  const normalizedDocument = normalizeWorkspaceDocument(documentSnapshot);
  const nextMap = projectDocument(normalizedDocument);
  const nextLayout = nextMap ? sanitizeEditorLayout(state.layout as Record<string, unknown>) : {};

  return {
    ...state,
    document: normalizedDocument,
    map: nextMap,
    warnings: normalizedDocument ? state.warnings : [],
    selection: null,
    multiSelection: [],
    layout: nextLayout,
    readNoteNodeIds: sanitizeReadNoteNodeIds(state.readNoteNodeIds, normalizedDocument),
    errorMessage: null,
    copyStatus: null,
    undoStack,
    redoStack
  };
}

export function workspaceSessionReducer(
  state: WorkspaceSessionState,
  action: WorkspaceSessionAction
): WorkspaceSessionState {
  switch (action.type) {
    case 'draft/new':
      return applyDocumentMutationHistory(state, buildNewDraftSessionState(state, action.format));
    case 'input/set':
      return { ...state, inputText: action.value };
    case 'import/success':
      return applyDocumentMutationHistory(state, buildImportedSessionState(state, action.inputText, action.imported));
    case 'import/failure':
      return buildImportFailureSessionState(state, action.inputText, action.errorMessage);
    case 'session/hydrate':
      return buildHydratedSessionState(state, action.snapshot);
    case 'read-notes/mark':
      return state.readNoteNodeIds.includes(action.nodeId)
        ? state
        : { ...state, readNoteNodeIds: [...state.readNoteNodeIds, action.nodeId] };
    case 'read-notes/set':
      return { ...state, readNoteNodeIds: Array.from(new Set(action.nodeIds)) };
    case 'map/set':
    case 'document/set': {
      const nextDocument =
        action.type === 'map/set'
          ? ({
              format: 'momentum',
              map: action.value
            } as WorkspaceDocument)
          : action.value;
      const normalizedDocument = normalizeWorkspaceDocument(nextDocument);
      const nextMap = projectDocument(normalizedDocument);
      const nextLayout = sanitizeEditorLayout(state.layout as Record<string, unknown>);

      return applyDocumentMutationHistory(state, {
        ...state,
        document: normalizedDocument,
        map: nextMap,
        warnings: action.type === 'document/set' ? action.warnings ?? state.warnings : state.warnings,
        layout: nextLayout,
        readNoteNodeIds: sanitizeReadNoteNodeIds(state.readNoteNodeIds, normalizedDocument),
        copyStatus: null
      });
    }
    case 'selection/set':
      return { ...state, selection: action.value };
    case 'multi-selection/set':
      return { ...state, multiSelection: action.value };
    case 'layout/set':
      return { ...state, layout: sanitizeEditorLayout(action.value as Record<string, unknown>) };
    case 'error/set':
      return { ...state, errorMessage: action.value };
    case 'copy-status/set':
      return { ...state, copyStatus: action.value };
    case 'undo': {
      if (state.undoStack.length === 0) {
        return state;
      }

      const documentSnapshot = state.undoStack[state.undoStack.length - 1];
      const nextUndoStack = state.undoStack.slice(0, state.undoStack.length - 1);
      const nextRedoStack = pushHistorySnapshot(state.redoStack, state.document);
      return applyHistorySnapshot(state, documentSnapshot, nextUndoStack, nextRedoStack);
    }
    case 'redo': {
      if (state.redoStack.length === 0) {
        return state;
      }

      const documentSnapshot = state.redoStack[state.redoStack.length - 1];
      const nextRedoStack = state.redoStack.slice(0, state.redoStack.length - 1);
      const nextUndoStack = pushHistorySnapshot(state.undoStack, state.document);
      return applyHistorySnapshot(state, documentSnapshot, nextUndoStack, nextRedoStack);
    }
  }
}

export function useWorkspaceSession(exampleInputs: WorkspaceExampleInputs) {
  const [state, dispatch] = useReducer(workspaceSessionReducer, undefined, createInitialWorkspaceSessionState);
  const [manualSaveBaseline, setManualSaveBaseline] = useState(() =>
    serializeWorkspaceSessionSnapshotPayload(
      createWorkspaceSessionSnapshotPayloadFromState(createInitialWorkspaceSessionState())
    )
  );
  const [recoverySnapshot, setRecoverySnapshot] = useState<WorkspaceSessionSnapshot | null>(() => {
    try {
      return readWorkspaceSessionRecoverySnapshot();
    } catch {
      clearWorkspaceSessionRecoverySnapshot();
      return null;
    }
  });
  const renderReadiness: RenderReadiness = useMemo(() => {
    return validateDocumentRenderReadiness(state.document);
  }, [state.document]);
  const durableSnapshotPayload = useMemo(
    () =>
      createWorkspaceSessionSnapshotPayloadFromState({
        document: state.document,
        inputText: state.inputText,
        layout: state.layout,
        multiSelection: state.multiSelection,
        readNoteNodeIds: state.readNoteNodeIds,
        selection: state.selection,
        warnings: state.warnings
      }),
    [
      state.document,
      state.inputText,
      state.layout,
      state.multiSelection,
      state.readNoteNodeIds,
      state.selection,
      state.warnings
    ]
  );
  const durableSnapshotPayloadString = useMemo(
    () => serializeWorkspaceSessionSnapshotPayload(durableSnapshotPayload),
    [durableSnapshotPayload]
  );
  const outputText = useMemo(
    () => (state.document && renderReadiness.isRenderReady ? renderDocumentOutput(state.document) : ''),
    [renderReadiness.isRenderReady, state.document]
  );

  useEffect(() => {
    if (!hasMeaningfulWorkspaceSessionSnapshot(durableSnapshotPayload)) {
      if (!recoverySnapshot) {
        clearWorkspaceSessionRecoverySnapshot();
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      writeWorkspaceSessionRecoverySnapshot(
        createWorkspaceSessionSnapshot(durableSnapshotPayload, 'autosave')
      );
    }, RECOVERY_AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durableSnapshotPayload, durableSnapshotPayloadString, recoverySnapshot]);

  function applyManualSaveBaseline(payload: WorkspaceSessionSnapshotPayload): void {
    setManualSaveBaseline(serializeWorkspaceSessionSnapshotPayload(payload));
  }

  function applyImportedSource(nextInputText: string, imported: ImportedSourceText): void {
    const nextState = buildImportedSessionState(state, nextInputText, imported);
    dispatch({ type: 'import/success', inputText: nextInputText, imported });
    applyManualSaveBaseline(createWorkspaceSessionSnapshotPayloadFromState(nextState));
  }

  function applyImportFailure(nextInputText: string, error: unknown, fallbackMessage: string): void {
    const nextState = buildImportFailureSessionState(
      state,
      nextInputText,
      getImportErrorMessage(error, fallbackMessage)
    );
    dispatch({
      type: 'import/failure',
      inputText: nextInputText,
      errorMessage: nextState.errorMessage ?? fallbackMessage
    });
    applyManualSaveBaseline(createWorkspaceSessionSnapshotPayloadFromState(nextState));
  }

  function handleConvert(): void {
    try {
      applyImportedSource(state.inputText, importSourceText(state.inputText));
    } catch (error) {
      applyImportFailure(state.inputText, error, 'The input could not be imported.');
    }
  }

  async function handlePasteSource(): Promise<void> {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        dispatch({ type: 'error/set', value: 'Clipboard is empty.' });
        dispatch({ type: 'copy-status/set', value: null });
        return;
      }

      try {
        applyImportedSource(clipboardText, importSourceText(clipboardText));
      } catch (error) {
        applyImportFailure(clipboardText, error, 'The clipboard content could not be imported.');
      }
    } catch {
      const isFirefox =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.toLowerCase().includes('firefox');
      dispatch({
        type: 'error/set',
        value: isFirefox
          ? 'Clipboard access was blocked. Firefox may show a native Paste prompt first. Try again or use Manual Text.'
          : 'Clipboard access was blocked. Allow clipboard access, then try Load from Clipboard again.'
      });
      dispatch({ type: 'copy-status/set', value: null });
    }
  }

  function handleUseExample(format: keyof WorkspaceExampleInputs): void {
    const exampleInput = exampleInputs[format];
    try {
      applyImportedSource(exampleInput, importSourceText(exampleInput));
    } catch (error) {
      applyImportFailure(exampleInput, error, 'The example input could not be imported.');
    }
  }

  function handleNewMap(format: 'momentum' | 'hax'): void {
    const nextState = buildNewDraftSessionState(state, format);
    dispatch({ type: 'draft/new', format });
    applyManualSaveBaseline(createWorkspaceSessionSnapshotPayloadFromState(nextState));
  }

  function handleUndo(): void {
    dispatch({ type: 'undo' });
  }

  function handleRedo(): void {
    dispatch({ type: 'redo' });
  }

  function handleConvertCurrentHaxDocument(): boolean {
    if (!state.document || state.document.format !== 'hax') {
      return false;
    }

    try {
      const converted = convertHaxDocumentToMomentumDocument(state.document);
      dispatch({ type: 'document/set', value: converted.document, warnings: converted.warnings });
      dispatch({ type: 'error/set', value: null });
      return true;
    } catch (error) {
      dispatch({
        type: 'error/set',
        value:
          error instanceof AppError
            ? `Could not convert this Hax document. ${error.message}`
            : 'Could not convert this Hax document. Review the map data and try again.'
      });
      dispatch({ type: 'copy-status/set', value: null });
      return false;
    }
  }

  async function handleCopy(): Promise<void> {
    if (!outputText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText);
      dispatch({ type: 'copy-status/set', value: 'Output copied to clipboard.' });
    } catch {
      dispatch({ type: 'copy-status/set', value: 'Clipboard access was blocked. Copy from the output panel manually.' });
    }
  }

  function hydrateFromSnapshot(snapshot: WorkspaceSessionSnapshot): void {
    const sanitizedPayload = sanitizeWorkspaceSessionSnapshotPayload(snapshot);
    dispatch({ type: 'session/hydrate', snapshot: sanitizedPayload });
    applyManualSaveBaseline(sanitizedPayload);
  }

  function buildManualSaveSnapshot(): WorkspaceSessionSnapshot {
    return createWorkspaceSessionSnapshot(durableSnapshotPayload, 'manual-save');
  }

  function markCurrentSessionAsSaved(): void {
    applyManualSaveBaseline(durableSnapshotPayload);
  }

  function restoreRecoverySnapshot(): void {
    if (!recoverySnapshot) {
      return;
    }

    hydrateFromSnapshot(recoverySnapshot);
    clearWorkspaceSessionRecoverySnapshot();
    setRecoverySnapshot(null);
  }

  function dismissRecoverySnapshot(): void {
    clearWorkspaceSessionRecoverySnapshot();
    setRecoverySnapshot(null);
  }

  function clearRecoverySnapshotState(): void {
    clearWorkspaceSessionRecoverySnapshot();
    setRecoverySnapshot(null);
  }

  return {
    state,
    outputText,
    renderReadiness,
    sourceReady: Boolean(state.inputText.trim()),
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    isDirty: durableSnapshotPayloadString !== manualSaveBaseline,
    recoverySnapshot,
    setInputText(value: string) {
      dispatch({ type: 'input/set', value });
    },
    setDocument(value: WorkspaceDocument, warnings?: ConversionWarning[]) {
      dispatch({ type: 'document/set', value, warnings });
    },
    setMap(value: MomentumMapModel) {
      dispatch({
        type: 'document/set',
        value: {
          format: 'momentum',
          map: value
        }
      });
    },
    setSelection(value: EditorSelection | null) {
      dispatch({ type: 'selection/set', value });
    },
    setMultiSelection(value: MultiNodeSelection) {
      dispatch({ type: 'multi-selection/set', value });
    },
    setLayout(value: EditorLayoutState) {
      dispatch({ type: 'layout/set', value });
    },
    setErrorMessage(value: string | null) {
      dispatch({ type: 'error/set', value });
    },
    setStatusMessage(value: string | null) {
      dispatch({ type: 'copy-status/set', value });
    },
    markNodeNotesAsRead(nodeId: string) {
      dispatch({ type: 'read-notes/mark', nodeId });
    },
    setReadNoteNodeIds(nodeIds: string[]) {
      dispatch({ type: 'read-notes/set', nodeIds });
    },
    buildManualSaveSnapshot,
    clearRecoverySnapshot: clearRecoverySnapshotState,
    handleConvert,
    handleConvertCurrentHaxDocument,
    handleUndo,
    handleRedo,
    handleNewMap,
    handleUseExample,
    handlePasteSource,
    handleCopy,
    hydrateFromSnapshot,
    markCurrentSessionAsSaved,
    dismissRecoverySnapshot,
    restoreRecoverySnapshot
  };
}

export type WorkspaceSessionApi = ReturnType<typeof useWorkspaceSession>;
