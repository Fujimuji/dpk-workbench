import type { WorkspaceDocument } from '@/domain/document/types';
import { isMomentumDocument } from '@/domain/document/types';
import { isCompleteDraftVec3 } from '@/domain/model/draftVectors';
import type { RenderReadiness } from '@/domain/model/validateDraftMap';
import type { NodeEditorTab } from '@/features/workspace/canvas/CanvasNodeEditor';
import type { EditorSelection, WorkspaceScope } from '@/features/workspace/types';

export type WorkspaceOnboardingFormat = 'momentum' | 'hax';
export type WorkspaceGuideId = 'core' | 'momentum' | 'hax';
export type WorkspaceGuideTag = 'Shared' | 'Momentum' | 'Hax';
export type WorkspaceGuideShellTarget =
  | 'canvas-help-button'
  | 'canvas-help-popover'
  | 'canvas-panel'
  | 'command-dock'
  | 'command-palette-trigger'
  | 'fit-graph-button'
  | 'inspector-panel'
  | 'navigator-panel'
  | 'output-overlay'
  | 'scope-header'
  | 'selected-canvas-node'
  | 'source-overlay'
  | 'status-cluster';

export interface WorkspaceOnboardingState {
  completedGuideIds: WorkspaceGuideId[];
  lastCompletedGuideId: WorkspaceGuideId | null;
  version: 4;
  welcomeDismissed: boolean;
}

export interface WorkspaceGuideTarget {
  kind: 'navigator-node' | 'shell';
  value: string;
}

export type WorkspaceGuideCompletion =
  | { kind: 'none' }
  | { kind: 'command-palette-open' }
  | { kind: 'context-menu-open'; nodeId: string }
  | { kind: 'document-format'; format: WorkspaceOnboardingFormat }
  | { kind: 'fit-graph-triggered' }
  | { kind: 'overlay-open'; overlay: 'source' | 'output' }
  | { kind: 'render-ready' }
  | {
      kind: 'selection-kind';
      checkpointIndex?: number;
      levelIndex?: number;
      selectionKinds: EditorSelection['kind'][];
    }
  | { kind: 'selected-checkpoint-has-complete-position' }
  | { kind: 'shortcut-help-open' }
  | {
      kind: 'scope';
      checkpointIndex?: number;
      levelIndex?: number;
      scopeKind: WorkspaceScope['kind'];
    }
  | {
      kind: 'checkpoint-count-increase';
      levelIndex: number;
      minimumDelta: number;
    };

export interface WorkspaceGuideStepSetup {
  overlay?: 'close' | 'output' | 'source' | null;
  selection?: EditorSelection;
  tab?: NodeEditorTab;
  workspaceScope?: WorkspaceScope;
}

export interface WorkspaceGuideStep {
  completion: WorkspaceGuideCompletion;
  id: string;
  instruction: string;
  setup?: WorkspaceGuideStepSetup;
  successHint: string;
  target: WorkspaceGuideTarget;
  title: string;
}

export interface WorkspaceGuideDefinition {
  defaultFormat: WorkspaceOnboardingFormat;
  description: string;
  formatMode: 'always-example' | 'current-or-example';
  id: WorkspaceGuideId;
  label: string;
  steps: WorkspaceGuideStep[];
  tag: WorkspaceGuideTag;
}

export interface WorkspaceGuideRunState {
  guideFormat: WorkspaceOnboardingFormat;
  guideId: WorkspaceGuideId;
  stepIndex: number;
}

export interface WorkspaceGuideBaseline {
  contextMenuOpenNonce: number;
  fitGraphNonce: number;
  momentumCheckpointCounts: number[];
}

export interface WorkspaceGuideEvaluationState {
  document: WorkspaceDocument | null;
  isCommandPaletteOpen: boolean;
  isShortcutHelpOpen: boolean;
  lastContextMenuNodeId: string | null;
  lastContextMenuOpenNonce: number;
  lastFitGraphNonce: number;
  openOverlayPanel: 'source' | 'output' | null;
  renderReadiness: RenderReadiness;
  selection: EditorSelection | null;
  workspaceScope: WorkspaceScope;
}

interface WorkspaceGuideTelemetryBaseline {
  contextMenuOpenNonce?: number;
  fitGraphNonce?: number;
}

interface WorkspaceOnboardingStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface ShouldAutoOpenWorkspaceOnboardingOptions {
  hasDocument: boolean;
  hasRecoverySnapshot: boolean;
  onboarding: WorkspaceOnboardingState;
}

export const WORKSPACE_ONBOARDING_STORAGE_KEY = 'parkour-data-converter.workspace-onboarding';
const WORKSPACE_ONBOARDING_STORAGE_VERSION = 4 as const;
const WORKSPACE_GUIDE_IDS: WorkspaceGuideId[] = ['core', 'momentum', 'hax'];

function getWorkspaceOnboardingStorage(
  storage?: WorkspaceOnboardingStorageLike
): WorkspaceOnboardingStorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readBooleanFlag(value: unknown): boolean {
  return value === true;
}

function readGuideId(value: unknown): WorkspaceGuideId | null {
  if (typeof value !== 'string') {
    return null;
  }

  return WORKSPACE_GUIDE_IDS.includes(value as WorkspaceGuideId) ? (value as WorkspaceGuideId) : null;
}

function readGuideIds(value: unknown): WorkspaceGuideId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((entry) => readGuideId(entry)).filter(Boolean) as WorkspaceGuideId[]));
}

export function createDefaultWorkspaceOnboardingState(): WorkspaceOnboardingState {
  return {
    completedGuideIds: [],
    lastCompletedGuideId: null,
    version: WORKSPACE_ONBOARDING_STORAGE_VERSION,
    welcomeDismissed: false
  };
}

export function readStoredWorkspaceOnboarding(
  storage?: WorkspaceOnboardingStorageLike
): WorkspaceOnboardingState {
  const onboardingStorage = getWorkspaceOnboardingStorage(storage);
  if (!onboardingStorage) {
    return createDefaultWorkspaceOnboardingState();
  }

  try {
    const rawValue = onboardingStorage.getItem(WORKSPACE_ONBOARDING_STORAGE_KEY);
    if (!rawValue) {
      return createDefaultWorkspaceOnboardingState();
    }

    const parsedValue = JSON.parse(rawValue);
    if (!isRecord(parsedValue) || parsedValue.version !== WORKSPACE_ONBOARDING_STORAGE_VERSION) {
      return createDefaultWorkspaceOnboardingState();
    }

    return {
      completedGuideIds: readGuideIds(parsedValue.completedGuideIds),
      lastCompletedGuideId: readGuideId(parsedValue.lastCompletedGuideId),
      version: WORKSPACE_ONBOARDING_STORAGE_VERSION,
      welcomeDismissed: readBooleanFlag(parsedValue.welcomeDismissed)
    };
  } catch {
    return createDefaultWorkspaceOnboardingState();
  }
}

export function writeStoredWorkspaceOnboarding(
  state: WorkspaceOnboardingState,
  storage?: WorkspaceOnboardingStorageLike
): boolean {
  const onboardingStorage = getWorkspaceOnboardingStorage(storage);
  if (!onboardingStorage) {
    return false;
  }

  try {
    onboardingStorage.setItem(WORKSPACE_ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function shouldAutoOpenWorkspaceOnboarding({
  hasDocument,
  hasRecoverySnapshot,
  onboarding
}: ShouldAutoOpenWorkspaceOnboardingOptions): boolean {
  return !onboarding.welcomeDismissed && !hasDocument && !hasRecoverySnapshot;
}

export function getWorkspaceGuideTargetSelector(target: WorkspaceGuideTarget): string {
  return target.kind === 'shell'
    ? `[data-guide-target="${target.value}"]`
    : `[data-guide-target="navigator-node:${target.value}"]`;
}

function createShellTarget(value: WorkspaceGuideShellTarget): WorkspaceGuideTarget {
  return { kind: 'shell', value };
}

function createNavigatorTarget(nodeId: string): WorkspaceGuideTarget {
  return { kind: 'navigator-node', value: nodeId };
}

function getMomentumCheckpointCounts(document: WorkspaceDocument | null): number[] {
  return isMomentumDocument(document)
    ? document.map.levels.map((level) => level.checkpoints.length)
    : [];
}

export function captureWorkspaceGuideBaseline(
  document: WorkspaceDocument | null,
  telemetry: WorkspaceGuideTelemetryBaseline = {}
): WorkspaceGuideBaseline {
  return {
    contextMenuOpenNonce: telemetry.contextMenuOpenNonce ?? 0,
    fitGraphNonce: telemetry.fitGraphNonce ?? 0,
    momentumCheckpointCounts: getMomentumCheckpointCounts(document)
  };
}

function selectionMatches(
  selection: EditorSelection | null,
  selectionKinds: EditorSelection['kind'][],
  options?: { levelIndex?: number; checkpointIndex?: number }
): boolean {
  if (!selection || !selectionKinds.includes(selection.kind)) {
    return false;
  }

  if (options?.levelIndex !== undefined && (!('levelIndex' in selection) || selection.levelIndex !== options.levelIndex)) {
    return false;
  }

  if (
    options?.checkpointIndex !== undefined &&
    (!('checkpointIndex' in selection) || selection.checkpointIndex !== options.checkpointIndex)
  ) {
    return false;
  }

  return true;
}

function scopeMatches(
  scope: WorkspaceScope,
  requirement: Extract<WorkspaceGuideCompletion, { kind: 'scope' }>
): boolean {
  if (scope.kind !== requirement.scopeKind) {
    return false;
  }

  if (requirement.levelIndex !== undefined && ('levelIndex' in scope ? scope.levelIndex !== requirement.levelIndex : true)) {
    return false;
  }

  if (
    requirement.checkpointIndex !== undefined &&
    ('checkpointIndex' in scope ? scope.checkpointIndex !== requirement.checkpointIndex : true)
  ) {
    return false;
  }

  return true;
}

function selectedCheckpointHasCompletePosition(
  selection: EditorSelection | null,
  document: WorkspaceDocument | null
): boolean {
  if (!selection || selection.kind !== 'checkpoint' || !isMomentumDocument(document)) {
    return false;
  }

  const level = document.map.levels[selection.levelIndex];
  const checkpoint = level?.checkpoints[selection.checkpointIndex];
  return Boolean(checkpoint && isCompleteDraftVec3(checkpoint.position));
}

export function evaluateWorkspaceGuideStepCompletion(
  step: WorkspaceGuideStep,
  state: WorkspaceGuideEvaluationState,
  baseline: WorkspaceGuideBaseline
): boolean {
  switch (step.completion.kind) {
    case 'none':
      return true;
    case 'command-palette-open':
      return state.isCommandPaletteOpen;
    case 'context-menu-open':
      return (
        state.lastContextMenuOpenNonce > baseline.contextMenuOpenNonce &&
        state.lastContextMenuNodeId === step.completion.nodeId
      );
    case 'document-format':
      return state.document?.format === step.completion.format;
    case 'fit-graph-triggered':
      return state.lastFitGraphNonce > baseline.fitGraphNonce;
    case 'overlay-open':
      return state.openOverlayPanel === step.completion.overlay;
    case 'render-ready':
      return state.renderReadiness.isRenderReady;
    case 'selection-kind':
      return selectionMatches(state.selection, step.completion.selectionKinds, {
        levelIndex: step.completion.levelIndex,
        checkpointIndex: step.completion.checkpointIndex
      });
    case 'selected-checkpoint-has-complete-position':
      return selectedCheckpointHasCompletePosition(state.selection, state.document);
    case 'shortcut-help-open':
      return state.isShortcutHelpOpen;
    case 'scope':
      return scopeMatches(state.workspaceScope, step.completion);
    case 'checkpoint-count-increase': {
      if (!isMomentumDocument(state.document)) {
        return false;
      }

      const currentCount = state.document.map.levels[step.completion.levelIndex]?.checkpoints.length ?? 0;
      const baselineCount = baseline.momentumCheckpointCounts[step.completion.levelIndex] ?? 0;
      return currentCount >= baselineCount + step.completion.minimumDelta;
    }
  }
}

function createGuideDefinitions(): WorkspaceGuideDefinition[] {
  return [
    {
      id: 'core',
      label: 'Navigation and Scope',
      description: 'Practice selection, double-click drill-in, breadcrumbs, shortcuts, and fit controls.',
      defaultFormat: 'momentum',
      formatMode: 'always-example',
      tag: 'Shared',
      steps: [
        {
          id: 'select-level',
          title: 'Select a Level',
          instruction: 'Click Level 1 in the navigator to see how selection drives the inspector.',
          successHint: 'This step completes when Level 1 is selected.',
          target: createNavigatorTarget('level-0'),
          setup: {
            overlay: 'close',
            workspaceScope: { kind: 'document' }
          },
          completion: {
            kind: 'selection-kind',
            levelIndex: 0,
            selectionKinds: ['level']
          }
        },
        {
          id: 'enter-level-scope',
          title: 'Double-Click into Level View',
          instruction: 'Double-click the selected Level 1 node to enter level scope.',
          successHint: 'The scope header should switch to Level 1.',
          target: createShellTarget('selected-canvas-node'),
          setup: {
            overlay: 'close',
            selection: { kind: 'level', levelIndex: 0 },
            workspaceScope: { kind: 'document' }
          },
          completion: {
            kind: 'scope',
            scopeKind: 'level',
            levelIndex: 0
          }
        },
        {
          id: 'enter-checkpoint-scope',
          title: 'Double-Click into Checkpoint View',
          instruction: 'Double-click Checkpoint 1 to move from level scope into checkpoint scope.',
          successHint: 'The scope header should switch to Checkpoint 1.',
          target: createShellTarget('selected-canvas-node'),
          setup: {
            overlay: 'close',
            selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
            workspaceScope: { kind: 'level', levelIndex: 0 }
          },
          completion: {
            kind: 'scope',
            scopeKind: 'checkpoint',
            levelIndex: 0,
            checkpointIndex: 0
          }
        },
        {
          id: 'return-document',
          title: 'Use the Breadcrumbs',
          instruction: 'Use the breadcrumb trail to return to Spawn View.',
          successHint: 'This step completes when the scope header returns to Spawn View.',
          target: createShellTarget('scope-header'),
          setup: {
            overlay: 'close',
            selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
            workspaceScope: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }
          },
          completion: {
            kind: 'scope',
            scopeKind: 'document'
          }
        },
        {
          id: 'open-command-palette',
          title: 'Open the Command Palette',
          instruction: 'Press Ctrl/Cmd+K or use the command button to open the command palette.',
          successHint: 'This step completes when the palette is open.',
          target: createShellTarget('command-palette-trigger'),
          setup: {
            overlay: 'close',
            workspaceScope: { kind: 'document' }
          },
          completion: { kind: 'command-palette-open' }
        },
        {
          id: 'open-shortcut-help',
          title: 'Open Canvas Shortcuts',
          instruction: 'Click the ? button to open the canvas shortcut popover.',
          successHint: 'This step completes when the shortcut popover is open.',
          target: createShellTarget('canvas-help-button'),
          setup: {
            overlay: 'close'
          },
          completion: { kind: 'shortcut-help-open' }
        },
        {
          id: 'fit-graph',
          title: 'Use Fit Graph',
          instruction: 'Click Fit Graph or press F while the canvas is focused to recenter the current scope.',
          successHint: 'This step completes when Fit Graph runs.',
          target: createShellTarget('fit-graph-button'),
          setup: {
            overlay: 'close'
          },
          completion: { kind: 'fit-graph-triggered' }
        }
      ]
    },
    {
      id: 'momentum',
      label: 'Momentum Workflow',
      description: 'Practice right-click checkpoint creation, position editing, and output readiness.',
      defaultFormat: 'momentum',
      formatMode: 'always-example',
      tag: 'Momentum',
      steps: [
        {
          id: 'enter-level-scope',
          title: 'Enter Level Scope',
          instruction: 'Double-click Level 1 to switch from Spawn View into Level 1.',
          successHint: 'The scope header should switch to Level 1.',
          target: createShellTarget('selected-canvas-node'),
          setup: {
            overlay: 'close',
            selection: { kind: 'level', levelIndex: 0 },
            workspaceScope: { kind: 'document' }
          },
          completion: {
            kind: 'scope',
            scopeKind: 'level',
            levelIndex: 0
          }
        },
        {
          id: 'open-level-actions',
          title: 'Right-Click the Level Node',
          instruction: 'Right-click the selected Level 1 node to open its context menu. That is where checkpoint creation lives in Level view.',
          successHint: 'This step completes when the Level 1 context menu opens.',
          target: createShellTarget('selected-canvas-node'),
          setup: {
            overlay: 'close',
            selection: { kind: 'level', levelIndex: 0 },
            workspaceScope: { kind: 'level', levelIndex: 0 }
          },
          completion: {
            kind: 'context-menu-open',
            nodeId: 'level-0'
          }
        },
        {
          id: 'add-checkpoint',
          title: 'Add a Checkpoint',
          instruction: 'Choose Add Checkpoint from the level context menu.',
          successHint: 'This step completes when Level 1 has one more checkpoint than it started with.',
          target: createShellTarget('selected-canvas-node'),
          completion: {
            kind: 'checkpoint-count-increase',
            levelIndex: 0,
            minimumDelta: 1
          }
        },
        {
          id: 'fill-checkpoint-position',
          title: 'Fill the New Checkpoint Position',
          instruction: 'With the new checkpoint selected, fill its X, Y, and Z fields in the inspector.',
          successHint: 'The step completes when the selected checkpoint has a full position again.',
          target: createShellTarget('inspector-panel'),
          completion: { kind: 'selected-checkpoint-has-complete-position' }
        },
        {
          id: 'open-output',
          title: 'Open Output',
          instruction: 'Open Output to confirm the draft is ready to render again.',
          successHint: 'This step completes when the Output overlay is open.',
          target: createShellTarget('output-overlay'),
          setup: {
            overlay: 'close'
          },
          completion: { kind: 'overlay-open', overlay: 'output' }
        }
      ]
    },
    {
      id: 'hax',
      label: 'Hax Workflow and Conversion',
      description: 'Practice wrapper discovery, effect-oriented editing, and Convert to Momentum.',
      defaultFormat: 'hax',
      formatMode: 'always-example',
      tag: 'Hax',
      steps: [
        {
          id: 'select-spawn-effects',
          title: 'Select Spawn Effects',
          instruction: 'Click Spawn Effects in the navigator to inspect document-level Hax effects.',
          successHint: 'This step completes when the Spawn Effects wrapper is selected.',
          target: createNavigatorTarget('root-haxEffects'),
          setup: {
            overlay: 'close',
            workspaceScope: { kind: 'document' }
          },
          completion: {
            kind: 'selection-kind',
            selectionKinds: ['haxSpawnEffects']
          }
        },
        {
          id: 'enter-checkpoint-scope',
          title: 'Double-Click into Checkpoint Scope',
          instruction: 'Double-click Level 1 and then double-click Checkpoint 1 to reach checkpoint scope.',
          successHint: 'The step completes when Checkpoint 1 scope is active.',
          target: createShellTarget('selected-canvas-node'),
          setup: {
            overlay: 'close',
            selection: { kind: 'level', levelIndex: 0 },
            workspaceScope: { kind: 'document' }
          },
          completion: {
            kind: 'scope',
            scopeKind: 'checkpoint',
            levelIndex: 0,
            checkpointIndex: 0
          }
        },
        {
          id: 'open-effects-wrapper-actions',
          title: 'Right-Click the Effects Wrapper',
          instruction: 'Select the Effects wrapper if needed, then right-click it to open the add-effect menu for Checkpoint 1.',
          successHint: 'This step completes when the Checkpoint 1 Effects wrapper context menu opens.',
          target: createShellTarget('selected-canvas-node'),
          setup: {
            overlay: 'close',
            selection: { kind: 'haxEffects', levelIndex: 0, checkpointIndex: 0 },
            workspaceScope: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }
          },
          completion: {
            kind: 'context-menu-open',
            nodeId: 'level-0-cp-1-haxEffects'
          }
        },
        {
          id: 'select-existing-content',
          title: 'Select Existing Hax Content',
          instruction: 'Select an existing effect or mission node to open its dedicated editor in the inspector.',
          successHint: 'This step completes when an effect or mission is selected.',
          target: createShellTarget('selected-canvas-node'),
          setup: {
            overlay: 'close',
            selection: { kind: 'haxEffects', levelIndex: 0, checkpointIndex: 0 },
            workspaceScope: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }
          },
          completion: {
            kind: 'selection-kind',
            levelIndex: 0,
            checkpointIndex: 0,
            selectionKinds: ['haxEffect', 'haxMission']
          }
        },
        {
          id: 'convert-hax',
          title: 'Convert to Momentum',
          instruction: 'Open Output and use Convert to Momentum when you are ready.',
          successHint: 'This step completes when the document format switches to Project Momentum.',
          target: createShellTarget('output-overlay'),
          setup: {
            overlay: 'output'
          },
          completion: {
            kind: 'document-format',
            format: 'momentum'
          }
        }
      ]
    }
  ];
}

const WORKSPACE_GUIDES = createGuideDefinitions();
const WORKSPACE_GUIDES_BY_ID = Object.fromEntries(
  WORKSPACE_GUIDES.map((guide) => [guide.id, guide])
) as Record<WorkspaceGuideId, WorkspaceGuideDefinition>;

export function getWorkspaceGuides(): WorkspaceGuideDefinition[] {
  return WORKSPACE_GUIDES;
}

export function getWorkspaceGuide(guideId: WorkspaceGuideId): WorkspaceGuideDefinition {
  return WORKSPACE_GUIDES_BY_ID[guideId];
}

export function getWorkspaceGuideIds(): WorkspaceGuideId[] {
  return [...WORKSPACE_GUIDE_IDS];
}

export function resolveWorkspaceGuideFormat(
  guideId: WorkspaceGuideId,
  currentFormat: WorkspaceOnboardingFormat | null
): WorkspaceOnboardingFormat {
  const guide = getWorkspaceGuide(guideId);
  if (guide.formatMode === 'current-or-example' && currentFormat) {
    return currentFormat;
  }

  return guide.defaultFormat;
}

export function createWorkspaceGuideRun(
  guideId: WorkspaceGuideId,
  currentFormat: WorkspaceOnboardingFormat | null = null
): WorkspaceGuideRunState {
  return {
    guideFormat: resolveWorkspaceGuideFormat(guideId, currentFormat),
    guideId,
    stepIndex: 0
  };
}

export function getWorkspaceGuideActiveStep(run: WorkspaceGuideRunState | null): WorkspaceGuideStep | null {
  if (!run) {
    return null;
  }

  return getWorkspaceGuide(run.guideId).steps[run.stepIndex] ?? null;
}

export function getNextWorkspaceGuideRun(run: WorkspaceGuideRunState): WorkspaceGuideRunState | null {
  const guide = getWorkspaceGuide(run.guideId);
  if (run.stepIndex >= guide.steps.length - 1) {
    return null;
  }

  return {
    ...run,
    stepIndex: run.stepIndex + 1
  };
}

export function getPreviousWorkspaceGuideRun(run: WorkspaceGuideRunState): WorkspaceGuideRunState | null {
  if (run.stepIndex === 0) {
    return null;
  }

  return {
    ...run,
    stepIndex: run.stepIndex - 1
  };
}
