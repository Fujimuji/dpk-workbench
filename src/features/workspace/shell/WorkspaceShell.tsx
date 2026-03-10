import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  ClipboardPaste,
  FileCode2,
  FilePlus2,
  FolderOpen,
  Keyboard,
  MoonStar,
  PencilLine,
  Redo2,
  Save,
  SunMedium,
  Undo2,
  WandSparkles,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { parseWorkspaceSessionSnapshot, serializeWorkspaceSessionSnapshot } from '@/app/workspaceSessionSnapshot';
import { getDocumentDisplayName } from '@/domain/document/types';
import type { ThemePreferenceApi } from '@/app/useThemePreference';
import { useSessionState } from '@/app/useSessionState';
import type { NodeEditorTab } from '@/features/workspace/canvas/CanvasNodeEditor';
import { MapCanvas, type MapCanvasGuideEvent } from '@/features/workspace/canvas/MapCanvas';
import { getNodeIdFromSelection } from '@/features/workspace/canvas/selection';
import { isEditableEventTarget } from '@/features/workspace/canvas/useCanvasKeyboardShortcuts';
import { useCommandPalette } from '@/features/workspace/canvas/useCommandPalette';
import { buildWorkspaceDocumentIndex } from '@/features/workspace/documentIndex';
import { buildWorkspaceScopeGraphBase, materializeWorkspaceScopeGraph } from '@/features/workspace/graph/buildScopeGraph';
import { WorkspaceInspectorPanel } from '@/features/workspace/inspector/WorkspaceInspectorPanel';
import {
  createWorkspaceFloatingVariants,
  workspaceDisclosureVariants,
  workspaceScrimVariants,
  workspaceToastVariants
} from '@/features/workspace/motion/workspaceMotion';
import {
  captureWorkspaceGuideBaseline,
  createWorkspaceGuideRun,
  evaluateWorkspaceGuideStepCompletion,
  getNextWorkspaceGuideRun,
  getPreviousWorkspaceGuideRun,
  getWorkspaceGuideActiveStep,
  getWorkspaceGuide,
  getWorkspaceGuideIds,
  getWorkspaceGuideTargetSelector,
  readStoredWorkspaceOnboarding,
  resolveWorkspaceGuideFormat,
  shouldAutoOpenWorkspaceOnboarding,
  writeStoredWorkspaceOnboarding,
  type WorkspaceGuideId,
  type WorkspaceGuideRunState,
  type WorkspaceGuideBaseline,
  type WorkspaceOnboardingFormat,
  type WorkspaceOnboardingState
} from '@/features/workspace/onboarding/workspaceOnboarding';
import { WorkspaceNavigator } from '@/features/workspace/outline/WorkspaceNavigator';
import { useWorkspaceSelectionState } from '@/features/workspace/useWorkspaceSelectionState';
import type { WorkspaceScope } from '@/features/workspace/types';
import {
  buildWorkspaceScopeBreadcrumbs,
  getDefaultWorkspaceScope,
  getWorkspaceScopeDescription,
  getWorkspaceScopeForNode,
  getWorkspaceScopeForSelection,
  getWorkspaceScopeNodeId
} from '@/features/workspace/workspaceScope';

type OverlayPanel = 'source' | 'output' | null;
interface PendingReplaceAction {
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
}

interface NodeRevealRequest {
  id: string;
  nonce: number;
}

type CommandPaletteBuilders = Pick<
  typeof import('@/features/workspace/canvas/commandPalette'),
  'buildCommandPaletteCommandEntries' | 'createCommandPaletteNodeEntries'
>;

const WORKSPACE_TOAST_DISMISS_MS = 2400;
const WORKSPACE_GUIDE_AUTO_ADVANCE_MS = 900;
const WORKSPACE_GUIDE_PANEL_MARGIN = 16;
const WORKSPACE_GUIDE_PANEL_GAP = 18;
const overlayPanelVariants = createWorkspaceFloatingVariants(10);
const dialogPanelVariants = createWorkspaceFloatingVariants(12);
const recoveryPanelVariants = createWorkspaceFloatingVariants(8);
const LazyCanvasCommandPalette = lazy(async () => {
  const module = await import('@/features/workspace/canvas/CanvasCommandPalette');
  return { default: module.CanvasCommandPalette };
});

interface WorkspaceShellProps {
  theme: ThemePreferenceApi;
}

function CanvasCommandPaletteLoadingState({
  onClose
}: {
  onClose: () => void;
}) {
  return (
    <div
      className="canvas-command-palette-layer"
      onPointerDown={onClose}
    >
      <div
        aria-label="Command palette"
        className="canvas-command-palette"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <p className="canvas-command-palette-empty">Loading command palette...</p>
      </div>
    </div>
  );
}

interface RectLike {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

interface PositionedRect {
  left: number;
  top: number;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function createRect(left: number, top: number, width: number, height: number): RectLike {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

function expandRect(rect: RectLike, padding: number): RectLike {
  return createRect(rect.left - padding, rect.top - padding, rect.width + padding * 2, rect.height + padding * 2);
}

function getOverlapArea(a: RectLike, b: RectLike): number {
  const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return overlapWidth * overlapHeight;
}

function getRectCenterDistance(a: RectLike, b: RectLike): number {
  const aCenterX = a.left + a.width / 2;
  const aCenterY = a.top + a.height / 2;
  const bCenterX = b.left + b.width / 2;
  const bCenterY = b.top + b.height / 2;
  return Math.hypot(aCenterX - bCenterX, aCenterY - bCenterY);
}

function getDomRectLike(node: Element | null): RectLike | null {
  if (!node) {
    return null;
  }

  const rect = node.getBoundingClientRect();
  return createRect(rect.left, rect.top, rect.width, rect.height);
}

export function WorkspaceShell({ theme }: WorkspaceShellProps) {
  const session = useSessionState();
  const { state } = session;
  const {
    canRedo,
    canUndo,
    isDirty,
    outputText,
    recoverySnapshot,
    renderReadiness,
    sourceReady
  } = session;
  const { resolvedTheme, setTheme } = theme;
  const {
    copyStatus,
    document: workspaceDocument,
    errorMessage,
    inputText,
    layout,
    map,
    multiSelection,
    readNoteNodeIds,
    selection,
    warnings
  } = state;
  const [openOverlayPanel, setOpenOverlayPanel] = useState<OverlayPanel>(null);
  const [pendingReplaceAction, setPendingReplaceAction] = useState<PendingReplaceAction | null>(null);
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [showGuideHub, setShowGuideHub] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showManualSource, setShowManualSource] = useState(false);
  const [guideRun, setGuideRun] = useState<WorkspaceGuideRunState | null>(null);
  const [guideTargetRect, setGuideTargetRect] = useState<DOMRect | null>(null);
  const [guidePanelStyle, setGuidePanelStyle] = useState<CSSProperties | undefined>(undefined);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [onboardingState, setOnboardingState] = useState<WorkspaceOnboardingState>(() => readStoredWorkspaceOnboarding());
  const [workspaceScope, setWorkspaceScope] = useState<WorkspaceScope>(getDefaultWorkspaceScope());
  const [requestedCenterNode, setRequestedCenterNode] = useState<NodeRevealRequest | null>(null);
  const [requestedCloseTransientUiNonce, setRequestedCloseTransientUiNonce] = useState(0);
  const [navigatorRevealRequest, setNavigatorRevealRequest] = useState<NodeRevealRequest | null>(null);
  const [requestedFitGraphNonce, setRequestedFitGraphNonce] = useState(0);
  const [requestedShowShortcutHelpNonce, setRequestedShowShortcutHelpNonce] = useState(0);
  const [lastContextMenuNodeId, setLastContextMenuNodeId] = useState<string | null>(null);
  const [lastContextMenuOpenNonce, setLastContextMenuOpenNonce] = useState(0);
  const [lastFitGraphNonce, setLastFitGraphNonce] = useState(0);
  const [overlayAnchorRect, setOverlayAnchorRect] = useState<DOMRect | null>(null);
  const commandDockRef = useRef<HTMLDivElement | null>(null);
  const guideAutoAdvanceTimeoutRef = useRef<number | null>(null);
  const guidePanelRef = useRef<HTMLElement | null>(null);
  const overlayActionGroupRef = useRef<HTMLDivElement | null>(null);
  const overlayPanelRef = useRef<HTMLDivElement | null>(null);
  const sessionFileInputRef = useRef<HTMLInputElement | null>(null);
  const statusClusterRef = useRef<HTMLDivElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const requestNonceRef = useRef(0);
  const guideStepBaselinesRef = useRef<Record<string, WorkspaceGuideBaseline>>({});
  const appliedGuideStepSetupKeyRef = useRef<string | null>(null);
  const [commandPaletteBuilders, setCommandPaletteBuilders] = useState<CommandPaletteBuilders | null>(null);

  const documentIndex = useMemo(
    () =>
      workspaceDocument
        ? buildWorkspaceDocumentIndex(workspaceDocument, warnings)
        : null,
    [workspaceDocument, warnings]
  );
  const scopedGraphBase = useMemo(
    () => buildWorkspaceScopeGraphBase(documentIndex, workspaceScope),
    [documentIndex, workspaceScope]
  );
  const scopedGraph = useMemo(
    () => materializeWorkspaceScopeGraph(scopedGraphBase, layout),
    [layout, scopedGraphBase]
  );

  const selectionState = useWorkspaceSelectionState({
    graph: scopedGraph,
    multiSelection,
    onMarkNodeNotesAsRead: session.markNodeNotesAsRead,
    onMultiSelectionChange: session.setMultiSelection,
    onSelectionChange: session.setSelection,
    readNoteNodeIds,
    selection,
    documentIndex
  });
  const {
    activeEditorTab,
    multiSelectionActive,
    selectedLookupNode,
    selectedNode,
    selectedWarnings,
    selectNode,
    setActiveEditorTab
  } =
    selectionState;

  const totalCheckpoints = useMemo(
    () =>
      workspaceDocument?.format === 'hax'
        ? workspaceDocument.checkpoints.length + 1
        : map?.levels.reduce((total, level) => total + level.checkpoints.length, 0) ?? 0,
    [workspaceDocument, map]
  );
  const unreadNoteCount = useMemo(() => {
    if (!documentIndex) {
      return 0;
    }

    const readNodeIdSet = new Set(readNoteNodeIds);
    return Object.entries(documentIndex.warningsById).reduce((count, [nodeId, nodeWarnings]) => {
      if (nodeWarnings.length === 0 || readNodeIdSet.has(nodeId)) {
        return count;
      }

      return count + 1;
    }, 0);
  }, [documentIndex, readNoteNodeIds]);
  const toastMessage = errorMessage ?? copyStatus;
  const documentDisplayName = getDocumentDisplayName(workspaceDocument);
  const overlayPanelStyle = useMemo<CSSProperties | undefined>(() => {
    if (!overlayAnchorRect) {
      return undefined;
    }

    const left = Math.max(12, Math.min(Math.round(overlayAnchorRect.left), window.innerWidth - 572));
    const top = Math.round(overlayAnchorRect.bottom + 8);
    const maxHeight = Math.max(220, window.innerHeight - top - 12);

    return {
      left,
      maxHeight,
      top
    };
  }, [overlayAnchorRect]);
  const scopeBreadcrumbs = useMemo(() => buildWorkspaceScopeBreadcrumbs(workspaceScope), [workspaceScope]);
  const scopeDescription = useMemo(
    () => getWorkspaceScopeDescription(workspaceScope, workspaceDocument?.format ?? null),
    [workspaceDocument?.format, workspaceScope]
  );
  const isFirefox =
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('firefox');
  const guideDefinitions = useMemo(() => getWorkspaceGuideIds().map((guideId) => getWorkspaceGuide(guideId)), []);
  const activeGuide = useMemo(() => (guideRun ? getWorkspaceGuide(guideRun.guideId) : null), [guideRun]);
  const activeGuideStep = useMemo(() => getWorkspaceGuideActiveStep(guideRun), [guideRun]);
  const activeGuideStepKey = guideRun && activeGuideStep ? `${guideRun.guideId}:${activeGuideStep.id}:${guideRun.stepIndex}` : null;
  const activeGuideBaseline = useMemo(
    () =>
      activeGuideStepKey
        ? guideStepBaselinesRef.current[activeGuideStepKey] ??
          captureWorkspaceGuideBaseline(workspaceDocument, {
            contextMenuOpenNonce: lastContextMenuOpenNonce,
            fitGraphNonce: lastFitGraphNonce
          })
        : null,
    [activeGuideStepKey, lastContextMenuOpenNonce, lastFitGraphNonce, workspaceDocument]
  );

  useEffect(() => {
    if (!documentIndex) {
      if (workspaceScope.kind !== 'document') {
        setWorkspaceScope(getDefaultWorkspaceScope());
      }
      return;
    }

    const scopeNodeId = getWorkspaceScopeNodeId(workspaceScope);
    if (documentIndex.nodeById[scopeNodeId]) {
      return;
    }

    const nextScope = getWorkspaceScopeForSelection(selection);
    const nextScopeNodeId = getWorkspaceScopeNodeId(nextScope);
    setWorkspaceScope(
      documentIndex.nodeById[nextScopeNodeId]
        ? nextScope
        : getDefaultWorkspaceScope()
    );
  }, [documentIndex, selection, workspaceScope]);

  useEffect(() => {
    writeStoredWorkspaceOnboarding(onboardingState);
  }, [onboardingState]);

  useEffect(() => {
    if (
      shouldAutoOpenWorkspaceOnboarding({
        hasDocument: Boolean(workspaceDocument),
        hasRecoverySnapshot: Boolean(recoverySnapshot),
        onboarding: onboardingState
      })
    ) {
      setShowWelcomeDialog(true);
      return;
    }

    setShowWelcomeDialog(false);
  }, [onboardingState, recoverySnapshot, workspaceDocument]);

  function nextRequestNonce(): number {
    requestNonceRef.current += 1;
    return requestNonceRef.current;
  }

  function clearGuideAutoAdvanceTimer(): void {
    if (guideAutoAdvanceTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(guideAutoAdvanceTimeoutRef.current);
    guideAutoAdvanceTimeoutRef.current = null;
  }

  function requestCanvasCenter(nodeId: string): void {
    setRequestedCenterNode({ id: nodeId, nonce: nextRequestNonce() });
  }

  function requestNavigatorReveal(nodeId: string): void {
    setNavigatorRevealRequest({ id: nodeId, nonce: nextRequestNonce() });
  }

  function requestCloseCanvasTransientUi(): void {
    setRequestedCloseTransientUiNonce(nextRequestNonce());
  }

  function requestFitGraph(): void {
    setRequestedFitGraphNonce(nextRequestNonce());
  }

  function requestShowShortcutHelp(): void {
    setRequestedShowShortcutHelpNonce(nextRequestNonce());
  }

  function revealNodeInWorkspace(nodeId: string): void {
    requestNavigatorReveal(nodeId);
    requestCanvasCenter(nodeId);
  }

  function handleScopeChange(nextScope: WorkspaceScope): void {
    setWorkspaceScope(nextScope);
  }

  function handleCanvasGuideEvent(event: MapCanvasGuideEvent): void {
    switch (event.kind) {
      case 'shortcut-help-open-state':
        setIsShortcutHelpOpen(event.isOpen);
        return;
      case 'context-menu-open':
        setLastContextMenuNodeId(event.nodeId);
        setLastContextMenuOpenNonce(event.nonce);
        return;
      case 'context-menu-close':
        return;
      case 'fit-graph':
        setLastFitGraphNonce(event.nonce);
        return;
    }
  }

  function handleNavigatorNodeSelect(node: Parameters<typeof selectNode>[0]): void {
    selectNode(node, 'main');
    revealNodeInWorkspace(node.id);
  }

  function revealAndFollowSelection(nextSelection: NonNullable<typeof selection>, tab: NodeEditorTab = 'main'): void {
    selectionState.selectNodeBySelection(nextSelection, tab);
    setWorkspaceScope(getWorkspaceScopeForSelection(nextSelection));
    revealNodeInWorkspace(getNodeIdFromSelection(nextSelection));
  }

  function revealSelectionInCurrentScope(
    nextSelection: NonNullable<typeof selection>,
    tab: NodeEditorTab = 'main'
  ): void {
    selectionState.selectNodeBySelection(nextSelection, tab);
    requestNavigatorReveal(getNodeIdFromSelection(nextSelection));
    requestCanvasCenter(getNodeIdFromSelection(nextSelection));
  }

  function handleSelectionReveal(
    nextSelection: NonNullable<typeof selection>,
    options?: { preserveScope?: boolean },
    tab: NodeEditorTab = 'main'
  ): void {
    if (options?.preserveScope) {
      revealSelectionInCurrentScope(nextSelection, tab);
      return;
    }

    revealAndFollowSelection(nextSelection, tab);
  }

  function handleCanvasNodeDrill(node: Parameters<typeof selectNode>[0]): void {
    if (node.kind !== 'level' && node.kind !== 'checkpoint') {
      return;
    }

    const nextScope = getWorkspaceScopeForNode(node);
    setWorkspaceScope(nextScope);
    requestNavigatorReveal(node.id);
    requestCanvasCenter(node.id);
  }

  function handleReturnToCheckpoint(levelIndex: number, checkpointIndex: number): void {
    selectionState.returnToCheckpoint(levelIndex, checkpointIndex);
    const nextSelection = { kind: 'checkpoint', levelIndex, checkpointIndex } as const;
    setWorkspaceScope({ kind: 'checkpoint', levelIndex, checkpointIndex });
    revealNodeInWorkspace(getNodeIdFromSelection(nextSelection));
  }

  function toggleOverlay(nextPanel: Exclude<OverlayPanel, null>): void {
    setOverlayAnchorRect(overlayActionGroupRef.current?.getBoundingClientRect() ?? null);
    setOpenOverlayPanel((current) => {
      const nextValue = current === nextPanel ? null : nextPanel;
      if (nextValue !== 'source') {
        setShowManualSource(false);
      }
      return nextValue;
    });
  }

  function openOverlay(nextPanel: Exclude<OverlayPanel, null>): void {
    setOverlayAnchorRect(overlayActionGroupRef.current?.getBoundingClientRect() ?? null);
    setOpenOverlayPanel(nextPanel);
    if (nextPanel !== 'source') {
      setShowManualSource(false);
    }
  }

  function closeOverlayPanel(): void {
    setOpenOverlayPanel(null);
    setShowManualSource(false);
  }

  useLayoutEffect(() => {
    const commandDock = commandDockRef.current;
    const overlayActionGroup = overlayActionGroupRef.current;

    if (!commandDock || !overlayActionGroup) {
      return;
    }

    const updateOverlayAnchorRect = () => {
      setOverlayAnchorRect(overlayActionGroup.getBoundingClientRect());
    };

    updateOverlayAnchorRect();

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      updateOverlayAnchorRect();
    });

    resizeObserver?.observe(commandDock);
    resizeObserver?.observe(overlayActionGroup);
    window.addEventListener('resize', updateOverlayAnchorRect);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateOverlayAnchorRect);
    };
  }, []);

  useEffect(() => {
    if (!copyStatus || errorMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      session.setStatusMessage(null);
    }, WORKSPACE_TOAST_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyStatus, errorMessage, session]);

  useEffect(() => {
    if (!guideRun || !activeGuideStep || !activeGuideStepKey) {
      return;
    }

    if (!guideStepBaselinesRef.current[activeGuideStepKey]) {
      guideStepBaselinesRef.current[activeGuideStepKey] = captureWorkspaceGuideBaseline(workspaceDocument, {
        contextMenuOpenNonce: lastContextMenuOpenNonce,
        fitGraphNonce: lastFitGraphNonce
      });
    }

    if (appliedGuideStepSetupKeyRef.current === activeGuideStepKey) {
      return;
    }

    appliedGuideStepSetupKeyRef.current = activeGuideStepKey;
    requestCloseCanvasTransientUi();

    if (activeGuideStep.setup?.overlay === 'source') {
      openOverlay('source');
    } else if (activeGuideStep.setup?.overlay === 'output') {
      openOverlay('output');
    } else if (activeGuideStep.setup?.overlay === 'close') {
      closeOverlayPanel();
    }

    if (activeGuideStep.setup?.selection) {
      handleSelectionReveal(
        activeGuideStep.setup.selection,
        activeGuideStep.setup.workspaceScope ? { preserveScope: true } : undefined,
        activeGuideStep.setup.tab ?? 'main'
      );
    }

    if (activeGuideStep.setup?.workspaceScope) {
      setWorkspaceScope(activeGuideStep.setup.workspaceScope);
    }

    if (activeGuideStep.setup?.tab) {
      setActiveEditorTab(activeGuideStep.setup.tab);
    }
  }, [
    activeGuideStep,
    activeGuideStepKey,
    guideRun,
    lastContextMenuOpenNonce,
    lastFitGraphNonce,
    setActiveEditorTab,
    workspaceDocument
  ]);

  useEffect(() => {
    if (guideRun) {
      return;
    }

    appliedGuideStepSetupKeyRef.current = null;
  }, [guideRun]);

  useEffect(() => {
    if (!guideRun || !activeGuideStep) {
      setGuideTargetRect(null);
      return;
    }

    let frameId = 0;
    const updateGuideTargetRect = () => {
      const element = document.querySelector<HTMLElement>(getWorkspaceGuideTargetSelector(activeGuideStep.target));
      setGuideTargetRect((current) => {
        if (!element) {
          return current === null ? current : null;
        }

        const nextRect = element.getBoundingClientRect();
        if (
          current &&
          current.left === nextRect.left &&
          current.top === nextRect.top &&
          current.width === nextRect.width &&
          current.height === nextRect.height
        ) {
          return current;
        }

        return nextRect;
      });
      frameId = window.requestAnimationFrame(updateGuideTargetRect);
    };

    frameId = window.requestAnimationFrame(updateGuideTargetRect);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeGuideStep, guideRun]);

  useLayoutEffect(() => {
    if (!guideRun || !guidePanelRef.current) {
      setGuidePanelStyle(undefined);
      return;
    }

    const computePanelStyle = () => {
      const panelRect = getDomRectLike(guidePanelRef.current);
      if (!panelRect) {
        setGuidePanelStyle(undefined);
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxLeft = Math.max(WORKSPACE_GUIDE_PANEL_MARGIN, viewportWidth - panelRect.width - WORKSPACE_GUIDE_PANEL_MARGIN);
      const maxTop = Math.max(WORKSPACE_GUIDE_PANEL_MARGIN, viewportHeight - panelRect.height - WORKSPACE_GUIDE_PANEL_MARGIN);
      const targetRect = guideTargetRect
        ? createRect(guideTargetRect.left, guideTargetRect.top, guideTargetRect.width, guideTargetRect.height)
        : null;
      const obstacleRects = [
        getDomRectLike(overlayPanelRef.current),
        getDomRectLike(commandDockRef.current),
        getDomRectLike(statusClusterRef.current),
        getDomRectLike(toastRef.current)
      ].filter(Boolean) as RectLike[];

      const positionedCandidates: PositionedRect[] = targetRect ? [
        {
          left: targetRect.right + WORKSPACE_GUIDE_PANEL_GAP,
          top: targetRect.top + targetRect.height / 2 - panelRect.height / 2
        },
        {
          left: targetRect.left - panelRect.width - WORKSPACE_GUIDE_PANEL_GAP,
          top: targetRect.top + targetRect.height / 2 - panelRect.height / 2
        },
        {
          left: targetRect.left + targetRect.width / 2 - panelRect.width / 2,
          top: targetRect.bottom + WORKSPACE_GUIDE_PANEL_GAP
        },
        {
          left: targetRect.left + targetRect.width / 2 - panelRect.width / 2,
          top: targetRect.top - panelRect.height - WORKSPACE_GUIDE_PANEL_GAP
        }
      ] : [];

      const fallbackCandidates: PositionedRect[] = [
        {
          left: WORKSPACE_GUIDE_PANEL_MARGIN,
          top: viewportHeight - panelRect.height - WORKSPACE_GUIDE_PANEL_MARGIN
        },
        {
          left: viewportWidth - panelRect.width - WORKSPACE_GUIDE_PANEL_MARGIN,
          top: WORKSPACE_GUIDE_PANEL_MARGIN
        },
        {
          left: WORKSPACE_GUIDE_PANEL_MARGIN,
          top: WORKSPACE_GUIDE_PANEL_MARGIN
        },
        {
          left: viewportWidth - panelRect.width - WORKSPACE_GUIDE_PANEL_MARGIN,
          top: viewportHeight - panelRect.height - WORKSPACE_GUIDE_PANEL_MARGIN
        }
      ];

      const candidates = [...positionedCandidates, ...fallbackCandidates]
        .map((candidate) => {
          const rect = createRect(
            clampValue(candidate.left, WORKSPACE_GUIDE_PANEL_MARGIN, maxLeft),
            clampValue(candidate.top, WORKSPACE_GUIDE_PANEL_MARGIN, maxTop),
            panelRect.width,
            panelRect.height
          );
          const targetPenalty = targetRect ? getOverlapArea(rect, expandRect(targetRect, 8)) * 100 : 0;
          const obstaclePenalty = obstacleRects.reduce((total, obstacleRect) => total + getOverlapArea(rect, obstacleRect) * 20, 0);
          const distancePenalty = targetRect ? getRectCenterDistance(rect, targetRect) : 0;

          return {
            rect,
            score: targetPenalty + obstaclePenalty + distancePenalty
          };
        })
        .sort((leftCandidate, rightCandidate) => leftCandidate.score - rightCandidate.score);

      const bestCandidate = candidates[0]?.rect ?? createRect(maxLeft, maxTop, panelRect.width, panelRect.height);
      setGuidePanelStyle({
        bottom: 'auto',
        left: `${Math.round(bestCandidate.left)}px`,
        right: 'auto',
        top: `${Math.round(bestCandidate.top)}px`
      });
    };

    computePanelStyle();
    window.addEventListener('resize', computePanelStyle);
    return () => {
      window.removeEventListener('resize', computePanelStyle);
    };
  }, [guideRun, guideTargetRect, openOverlayPanel, toastMessage, activeGuideStepKey]);

  useEffect(() => () => {
    clearGuideAutoAdvanceTimer();
  }, []);

  function closeReplacePrompt(): void {
    setPendingReplaceAction(null);
  }

  function requestSessionReplacement(action: PendingReplaceAction): void {
    if (!isDirty) {
      action.onConfirm();
      return;
    }

    setPendingReplaceAction(action);
  }

  function handleSaveSession(): void {
    try {
      const snapshot = session.buildManualSaveSnapshot();
      const fileName = `parkour-session-${snapshot.savedAt.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}.json`;
      const blob = new Blob([serializeWorkspaceSessionSnapshot(snapshot)], { type: 'application/json' });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(objectUrl);

      session.markCurrentSessionAsSaved();
      session.setErrorMessage(null);
      session.setStatusMessage('Session saved as JSON.');
    } catch {
      session.setErrorMessage('The session could not be saved.');
      session.setStatusMessage(null);
    }
  }

  function handleOpenSessionRequest(): void {
    sessionFileInputRef.current?.click();
  }

  function applyOpenedSessionSnapshot(fileText: string): void {
    try {
      const snapshot = parseWorkspaceSessionSnapshot(fileText);
      requestSessionReplacement({
        title: 'Replace current session?',
        description: 'Opening a saved session will replace the current workspace state.',
        confirmLabel: 'Open Session',
        onConfirm: () => {
          session.hydrateFromSnapshot(snapshot);
          setWorkspaceScope(getDefaultWorkspaceScope());
          session.setErrorMessage(null);
          session.setStatusMessage('Session opened.');
          closeReplacePrompt();
        }
      });
    } catch (error) {
      session.setErrorMessage(error instanceof Error ? error.message : 'The session file is invalid.');
      session.setStatusMessage(null);
    }
  }

  async function handleSessionFileChange(file: File | null): Promise<void> {
    if (!file) {
      return;
    }

    try {
      applyOpenedSessionSnapshot(await file.text());
    } catch {
      session.setErrorMessage('The session file could not be read.');
      session.setStatusMessage(null);
    }
  }

  function requestNewMap(): void {
    setShowNewMapDialog(true);
  }

  function closeNewMapDialog(): void {
    setShowNewMapDialog(false);
  }

  function updateOnboardingState(
    updater: (current: WorkspaceOnboardingState) => WorkspaceOnboardingState
  ): void {
    setOnboardingState((current) => updater(current));
  }

  function dismissWelcomeDialog(): void {
    updateOnboardingState((current) => ({
      ...current,
      welcomeDismissed: true
    }));
    setShowWelcomeDialog(false);
  }

  function openGuideHub(): void {
    setShowGuideHub(true);
  }

  function closeGuideHub(): void {
    setShowGuideHub(false);
  }

  function stopGuide(markCompleted = false): void {
    clearGuideAutoAdvanceTimer();
    if (markCompleted && guideRun) {
      updateOnboardingState((current) => ({
        ...current,
        completedGuideIds: current.completedGuideIds.includes(guideRun.guideId)
          ? current.completedGuideIds
          : [...current.completedGuideIds, guideRun.guideId],
        lastCompletedGuideId: guideRun.guideId
      }));
    }

    guideStepBaselinesRef.current = {};
    appliedGuideStepSetupKeyRef.current = null;
    setGuideRun(null);
    setGuidePanelStyle(undefined);
    setGuideTargetRect(null);
  }

  function loadGuideExample(format: WorkspaceOnboardingFormat): void {
    session.handleUseExample(format);
    setWorkspaceScope(getDefaultWorkspaceScope());
    closeOverlayPanel();
    session.setErrorMessage(null);
    session.setStatusMessage(`${format === 'hax' ? 'Hax' : 'Momentum'} guide example loaded for the interactive guide.`);
  }

  function beginGuideRun(guideId: WorkspaceGuideId, format: WorkspaceOnboardingFormat): void {
    clearGuideAutoAdvanceTimer();
    const nextRun = createWorkspaceGuideRun(guideId, format);
    guideStepBaselinesRef.current = {};
    appliedGuideStepSetupKeyRef.current = null;
    setGuideRun(nextRun);
    setShowGuideHub(false);
  }

  function startGuide(guideId: WorkspaceGuideId): void {
    const guide = getWorkspaceGuide(guideId);
    const nextFormat = resolveWorkspaceGuideFormat(guideId, workspaceDocument?.format ?? null);
    const shouldReuseCurrentDocument = guide.formatMode === 'current-or-example' && Boolean(workspaceDocument);
    if (shouldReuseCurrentDocument) {
      beginGuideRun(guideId, nextFormat);
      return;
    }

    requestSessionReplacement({
      title: 'Start interactive guide?',
      description: `The ${guide.label} guide uses a clean bundled ${nextFormat === 'hax' ? 'Hax' : 'Momentum'} example so you can practice on predictable data.`,
      confirmLabel: 'Start Guide',
      onConfirm: () => {
        loadGuideExample(nextFormat);
        beginGuideRun(guideId, nextFormat);
        closeReplacePrompt();
      }
    });
  }

  function goToPreviousGuideStep(): void {
    if (!guideRun) {
      return;
    }

    clearGuideAutoAdvanceTimer();
    const previousRun = getPreviousWorkspaceGuideRun(guideRun);
    if (!previousRun) {
      return;
    }

    setGuideRun(previousRun);
  }

  function skipGuideStep(): void {
    if (!guideRun) {
      return;
    }

    clearGuideAutoAdvanceTimer();
    const nextRun = getNextWorkspaceGuideRun(guideRun);
    if (!nextRun) {
      stopGuide(true);
      return;
    }

    setGuideRun(nextRun);
  }

  function createNewMap(format: 'momentum' | 'hax'): void {
    session.handleNewMap(format);
    setWorkspaceScope(getDefaultWorkspaceScope());
    session.setErrorMessage(null);
    closeNewMapDialog();
  }

  function requestLoadExampleForFormat(format: 'momentum' | 'hax'): void {
    const formatLabel = format === 'hax' ? 'Hax Example' : 'Momentum Example';
    requestSessionReplacement({
      title: 'Replace current session?',
      description: `Loading the ${formatLabel.toLowerCase()} will replace the current workspace state.`,
      confirmLabel: `Load ${formatLabel}`,
      onConfirm: () => {
        session.handleUseExample(format);
        setWorkspaceScope(getDefaultWorkspaceScope());
        closeReplacePrompt();
      }
    });
  }

  function requestLoadHaxExample(): void {
    requestLoadExampleForFormat('hax');
  }

  function requestLoadMomentumExample(): void {
    requestLoadExampleForFormat('momentum');
  }

  function requestLoadClipboard(): void {
    requestSessionReplacement({
      title: 'Replace current session?',
      description: 'Loading from the clipboard will replace the current workspace state.',
      confirmLabel: 'Load Clipboard',
      onConfirm: () => {
        void session.handlePasteSource();
        setWorkspaceScope(getDefaultWorkspaceScope());
        closeReplacePrompt();
      }
    });
  }

  function requestManualImport(): void {
    requestSessionReplacement({
      title: 'Replace current session?',
      description: 'Importing text from the textbox will replace the current workspace state.',
      confirmLabel: 'Import Text',
      onConfirm: () => {
        session.handleConvert();
        setWorkspaceScope(getDefaultWorkspaceScope());
        closeReplacePrompt();
      }
    });
  }

  function requestRestoreRecovery(): void {
    if (!recoverySnapshot) {
      return;
    }

    requestSessionReplacement({
      title: 'Restore recovery snapshot?',
      description: 'Restoring recovery will replace the current workspace state with the stored autosave snapshot.',
      confirmLabel: 'Restore Recovery',
      onConfirm: () => {
        session.restoreRecoverySnapshot();
        setWorkspaceScope(getDefaultWorkspaceScope());
        session.setErrorMessage(null);
        session.setStatusMessage('Recovery restored.');
        closeReplacePrompt();
      }
    });
  }

  function formatRecoveryTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'unknown time';
    }

    return date.toLocaleString();
  }

  function requestConvertCurrentHaxDocument(): void {
    if (workspaceDocument?.format !== 'hax') {
      return;
    }

    if (!renderReadiness.isRenderReady) {
      session.setErrorMessage(
        `Finish the incomplete Hax draft before converting. ${renderReadiness.blockingReasons[0] ?? 'Fill every required position vector and try again.'}`
      );
      session.setStatusMessage(null);
      return;
    }

    setPendingReplaceAction({
      title: 'Convert to Project Momentum?',
      description: 'This will replace the current Hax document with a Project Momentum document built from the current Hax state.',
      confirmLabel: 'Convert',
      onConfirm: () => {
        const converted = session.handleConvertCurrentHaxDocument();
        if (converted) {
          setWorkspaceScope(getDefaultWorkspaceScope());
        }
        closeReplacePrompt();
      }
    });
  }

  const commandEntries = useMemo(
    () =>
      commandPaletteBuilders?.buildCommandPaletteCommandEntries({
        actions: {
        onSwitchToDarkTheme: () => setTheme('dark'),
        onSwitchToLightTheme: () => setTheme('light'),
        onCopyOutput: () => {
          void session.handleCopy();
        },
        onFitGraph: requestFitGraph,
        onLoadHaxExample: requestLoadHaxExample,
        onLoadClipboard: requestLoadClipboard,
        onLoadMomentumExample: requestLoadMomentumExample,
        onNewMap: requestNewMap,
        onOpenSession: handleOpenSessionRequest,
        onOpenOutput: () => openOverlay('output'),
        onOpenSource: () => openOverlay('source'),
        onRedo: session.handleRedo,
        onRestoreRecovery: requestRestoreRecovery,
        onSaveSession: handleSaveSession,
        onOpenGuide: openGuideHub,
        onShowShortcuts: requestShowShortcutHelp,
        onUndo: session.handleUndo
      },
        canSwitchToDarkTheme: resolvedTheme !== 'dark',
        canSwitchToLightTheme: resolvedTheme !== 'light',
        canCopyOutput: Boolean(outputText) && renderReadiness.isRenderReady,
        canFitGraph: Boolean(scopedGraph),
        canOpenOutput: Boolean(workspaceDocument),
        canRedo,
        canRestoreRecovery: Boolean(recoverySnapshot),
        canSaveSession: Boolean(inputText.trim() || workspaceDocument),
        canShowShortcuts: true,
        canUndo
      }) ?? [],
    [
      canRedo,
      canUndo,
      commandPaletteBuilders,
      workspaceDocument,
      scopedGraph,
      inputText,
      outputText,
      recoverySnapshot,
      resolvedTheme,
      renderReadiness.isRenderReady,
      setTheme,
      session
    ]
  );

  const nodeEntries = useMemo(
    () =>
      documentIndex && commandPaletteBuilders
        ? commandPaletteBuilders.createCommandPaletteNodeEntries(documentIndex.nodes).map((entry) => ({
            ...entry,
            onSelect: () => {
              selectNode(entry.node, 'main');
              setWorkspaceScope(getWorkspaceScopeForSelection(entry.node.selection));
              revealNodeInWorkspace(entry.node.id);
            }
          }))
        : [],
    [commandPaletteBuilders, documentIndex, selectNode]
  );

  const commandPalette = useCommandPalette({
    commands: commandEntries,
    nodes: nodeEntries
  });
  const nextGuideRun = useMemo(
    () => (guideRun ? getNextWorkspaceGuideRun(guideRun) : null),
    [guideRun]
  );
  const activeGuideStepComplete = useMemo(
    () =>
      activeGuideStep && activeGuideBaseline
        ? evaluateWorkspaceGuideStepCompletion(
            activeGuideStep,
            {
              document: workspaceDocument,
              isCommandPaletteOpen: commandPalette.isOpen,
              isShortcutHelpOpen,
              lastContextMenuNodeId,
              lastContextMenuOpenNonce,
              lastFitGraphNonce,
              openOverlayPanel,
              renderReadiness,
              selection,
              workspaceScope
            },
            activeGuideBaseline
          )
        : false,
    [
      activeGuideBaseline,
      activeGuideStep,
      commandPalette.isOpen,
      isShortcutHelpOpen,
      lastContextMenuNodeId,
      lastContextMenuOpenNonce,
      lastFitGraphNonce,
      openOverlayPanel,
      renderReadiness,
      selection,
      workspaceDocument,
      workspaceScope
    ]
  );

  useEffect(() => {
    clearGuideAutoAdvanceTimer();

    if (!guideRun || !activeGuideStepKey || !activeGuideStepComplete) {
      return;
    }

    guideAutoAdvanceTimeoutRef.current = window.setTimeout(() => {
      guideAutoAdvanceTimeoutRef.current = null;
      if (nextGuideRun) {
        setGuideRun(nextGuideRun);
        return;
      }

      stopGuide(true);
    }, WORKSPACE_GUIDE_AUTO_ADVANCE_MS);

    return () => {
      clearGuideAutoAdvanceTimer();
    };
  }, [activeGuideStepComplete, activeGuideStepKey, guideRun, nextGuideRun]);

  useEffect(() => {
    if (!commandPalette.isOpen || commandPaletteBuilders) {
      return;
    }

    let cancelled = false;

    void import('@/features/workspace/canvas/commandPalette').then((module) => {
      if (!cancelled) {
        setCommandPaletteBuilders({
          buildCommandPaletteCommandEntries: module.buildCommandPaletteCommandEntries,
          createCommandPaletteNodeEntries: module.createCommandPaletteNodeEntries
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [commandPalette.isOpen, commandPaletteBuilders]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const key = event.key.toLowerCase();
      const allowWhileEditing = commandPalette.isOpen && key === 'escape';
      if (!allowWhileEditing && isEditableEventTarget(event.target)) {
        return;
      }

      if (commandPalette.isOpen && key === 'escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        commandPalette.closePalette();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (commandPalette.isOpen) {
          commandPalette.closePalette();
        } else {
          commandPalette.openPalette();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [commandPalette]);

  return (
    <div className="workspace-shell workspace-canvas-shell">
      <div className="workspace-command-dock" data-guide-target="command-dock" ref={commandDockRef}>
        <div className="workspace-command-group" role="group" aria-label="New map action">
          <button
            className="button button-ghost button-mini"
            onClick={requestNewMap}
            type="button"
          >
            <FilePlus2 aria-hidden="true" className="button-icon" />
            New Map
          </button>
        </div>
        <div className="workspace-command-group" role="group" aria-label="Session actions">
          <button
            className="button button-ghost button-mini"
            onClick={handleOpenSessionRequest}
            type="button"
          >
            <FolderOpen aria-hidden="true" className="button-icon" />
            Open Session
          </button>
          <button
            className="button button-ghost button-mini"
            onClick={handleSaveSession}
            type="button"
          >
            <Save aria-hidden="true" className="button-icon" />
            Save Session
          </button>
        </div>
        <div className="workspace-command-group" role="group" aria-label="History actions">
          <button
            className="button button-ghost button-mini"
            disabled={!canUndo}
            onClick={session.handleUndo}
            type="button"
          >
            <Undo2 aria-hidden="true" className="button-icon" />
            Undo
          </button>
          <button
            className="button button-ghost button-mini"
            disabled={!canRedo}
            onClick={session.handleRedo}
            type="button"
          >
            <Redo2 aria-hidden="true" className="button-icon" />
            Redo
          </button>
        </div>
        <div className="workspace-command-group" ref={overlayActionGroupRef} role="group" aria-label="Overlay actions">
          <button
            className={`button button-ghost button-mini${openOverlayPanel === 'source' ? ' is-active' : ''}`}
            onClick={() => {
              toggleOverlay('source');
            }}
            type="button"
          >
            <FileCode2 aria-hidden="true" className="button-icon" />
            Source
          </button>
          <button
            className={`button button-ghost button-mini${openOverlayPanel === 'output' ? ' is-active' : ''}`}
            onClick={() => {
              toggleOverlay('output');
            }}
            type="button"
          >
            <FileCode2 aria-hidden="true" className="button-icon" />
            Output
          </button>
        </div>
      </div>

      <div className="workspace-status-cluster" data-guide-target="status-cluster" ref={statusClusterRef}>
        <span className={`workspace-status-chip${sourceReady ? ' is-live' : ''}`}>
          {sourceReady ? 'Source loaded' : 'No source'}
        </span>
        <span className="workspace-status-chip">
          {workspaceDocument?.format === 'hax'
            ? documentIndex?.nodes.filter((node) => node.kind === 'level').length ?? 0
            : map?.levels.length ?? 0}{' '}
          levels
        </span>
        <span className="workspace-status-chip">{totalCheckpoints} checkpoints</span>
        {workspaceDocument ? <span className="workspace-status-chip">{documentDisplayName}</span> : null}
        {unreadNoteCount > 0 ? (
          <span className="workspace-status-chip">{unreadNoteCount} unread notes</span>
        ) : null}
        {workspaceDocument && !renderReadiness.isRenderReady ? (
          <span className="workspace-status-chip is-draft">Draft incomplete</span>
        ) : null}
        <div className="workspace-status-theme-toggle" aria-label="Theme" role="group">
          <button
            className={`workspace-status-theme-button${resolvedTheme === 'light' ? ' is-active' : ''}`}
            onClick={() => setTheme('light')}
            type="button"
          >
            <SunMedium aria-hidden="true" className="button-icon" />
            Light
          </button>
          <button
            className={`workspace-status-theme-button${resolvedTheme === 'dark' ? ' is-active' : ''}`}
            onClick={() => setTheme('dark')}
            type="button"
          >
            <MoonStar aria-hidden="true" className="button-icon" />
            Dark
          </button>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {openOverlayPanel === 'source' ? (
          <motion.div
            animate="animate"
            className="workspace-overlay-panel is-source"
            data-guide-target="source-overlay"
            exit="exit"
            initial="initial"
            key="source-overlay"
            ref={overlayPanelRef}
            style={overlayPanelStyle}
            variants={overlayPanelVariants}
          >
            <div className="workspace-overlay-panel-head">
              <div>
                <h2>Source</h2>
                <p className="workspace-overlay-copy">Clipboard and clean bundled examples are the fastest path.</p>
              </div>
              <button
                aria-label="Close source panel"
                className="button button-ghost button-mini"
                onClick={() => {
                  closeOverlayPanel();
                }}
                title="Close source panel"
                type="button"
              >
                <X aria-hidden="true" className="button-icon" />
              </button>
            </div>
            <div className="workspace-overlay-hero-actions">
              <button
                className="button button-ghost workspace-overlay-hero-button is-primary"
                onClick={requestLoadClipboard}
                type="button"
              >
                <ClipboardPaste aria-hidden="true" className="button-icon" />
                Load from Clipboard
              </button>
              <button className="button button-ghost workspace-overlay-hero-button" onClick={requestLoadHaxExample} type="button">
                <FileCode2 aria-hidden="true" className="button-icon" />
                Load Hax Example
              </button>
              <button className="button button-ghost workspace-overlay-hero-button" onClick={requestLoadMomentumExample} type="button">
                <FileCode2 aria-hidden="true" className="button-icon" />
                Load Momentum Example
              </button>
            </div>
            <div className="workspace-overlay-secondary">
              <button
                className={`button button-ghost button-mini workspace-overlay-toggle${showManualSource ? ' is-active' : ''}`}
                onClick={() => {
                  setShowManualSource((current) => !current);
                }}
                type="button"
              >
                <Keyboard aria-hidden="true" className="button-icon" />
                Manual Text
                {showManualSource ? (
                  <ChevronUp aria-hidden="true" className="button-icon" />
                ) : (
                  <ChevronDown aria-hidden="true" className="button-icon" />
                )}
              </button>
              <span className="workspace-overlay-secondary-copy">
                {sourceReady
                  ? 'Text loaded and ready to import.'
                  : isFirefox
                    ? 'Firefox may show a native Paste prompt. Use Manual Text if clipboard access gets in the way.'
                    : 'Paste text only when you need manual import.'}
              </span>
            </div>
            <AnimatePresence initial={false}>
              {showManualSource ? (
                <motion.div
                  animate="expanded"
                  className="workspace-overlay-manual"
                  exit="collapsed"
                  initial="collapsed"
                  key="source-manual"
                  style={{ overflow: 'hidden' }}
                  variants={workspaceDisclosureVariants}
                >
                  <textarea
                    className="workspace-textarea workspace-overlay-textarea"
                    onChange={(event) => {
                      session.setInputText(event.target.value);
                    }}
                    spellCheck={false}
                    value={inputText}
                  />
                  <div className="workspace-overlay-actions">
                    <button className="button button-ghost button-mini workspace-overlay-action-button is-primary" disabled={!sourceReady} onClick={requestManualImport} type="button">
                      <WandSparkles aria-hidden="true" className="button-icon" />
                      Import from Textbox
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}

        {openOverlayPanel === 'output' ? (
          <motion.div
            animate="animate"
            className="workspace-overlay-panel is-output"
            data-guide-target="output-overlay"
            exit="exit"
            initial="initial"
            key="output-overlay"
            ref={overlayPanelRef}
            style={overlayPanelStyle}
            variants={overlayPanelVariants}
          >
            <div className="workspace-overlay-panel-head">
              <div>
                <h2>Output</h2>
                <p className="workspace-overlay-copy">Copy to clipboard or inspect the current {documentDisplayName} output.</p>
              </div>
              <button
                aria-label="Close output panel"
                className="button button-ghost button-mini"
                onClick={() => {
                  closeOverlayPanel();
                }}
                title="Close output panel"
                type="button"
              >
                <X aria-hidden="true" className="button-icon" />
              </button>
            </div>
            <div className="workspace-code-preview" role="region" aria-label={`${documentDisplayName} output preview`}>
              {workspaceDocument && !renderReadiness.isRenderReady ? (
                <div className="workspace-code-preview-blocked">
                  <p className="workspace-code-preview-empty">
                    Output is unavailable until this draft is complete.
                  </p>
                  <ul className="workspace-code-preview-blockers">
                    {renderReadiness.blockingReasons.map((reason) => (
                      <li key={reason}>
                        <AlertCircle aria-hidden="true" className="button-icon" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : outputText ? (
                <pre>{outputText}</pre>
              ) : (
                <p className="workspace-code-preview-empty">No output yet.</p>
              )}
            </div>
            <div className="workspace-overlay-actions">
              {workspaceDocument?.format === 'hax' ? (
                <button
                  className="button button-ghost button-mini workspace-overlay-action-button"
                  disabled={!renderReadiness.isRenderReady}
                  onClick={requestConvertCurrentHaxDocument}
                  type="button"
                >
                  <PencilLine aria-hidden="true" className="button-icon" />
                  Convert to Momentum
                </button>
              ) : null}
              <button
                className="button button-ghost button-mini workspace-overlay-action-button is-primary"
                disabled={!outputText || !renderReadiness.isRenderReady}
                onClick={() => {
                  void session.handleCopy();
                }}
                type="button"
              >
                <ClipboardCopy aria-hidden="true" className="button-icon" />
                Copy Output
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="workspace-canvas-stage is-canvas-layout">
        <input
          accept=".json,application/json"
          className="workspace-hidden-input"
          onChange={(event) => {
            void handleSessionFileChange(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
          ref={sessionFileInputRef}
          type="file"
        />
        <div className="workspace-main workspace-workbench workspace-scoped-layout">
          <aside className="workspace-left-rail workspace-left-rail-wide">
            <WorkspaceNavigator
              currentScope={workspaceScope}
              documentIndex={documentIndex}
              onScopeChange={handleScopeChange}
              onSelectNode={handleNavigatorNodeSelect}
              readNoteNodeIds={readNoteNodeIds}
              revealRequest={navigatorRevealRequest}
              selection={selection}
              selectedNode={selectedLookupNode}
            />
          </aside>

          <section className="workspace-center workspace-scoped-center">
            <section className="workspace-panel workspace-scope-panel">
              <div className="workspace-panel-header workspace-scope-panel-header" data-guide-target="scope-header">
                <div>
                  <div className="workspace-scope-breadcrumbs" role="navigation" aria-label="Workspace scope">
                    {scopeBreadcrumbs.map((breadcrumb, index) => (
                      <button
                        className={`workspace-scope-crumb${index === scopeBreadcrumbs.length - 1 ? ' is-active' : ''}`}
                        key={breadcrumb.id}
                        onClick={() => {
                          handleScopeChange(breadcrumb.scope);
                        }}
                        type="button"
                      >
                        {breadcrumb.label}
                      </button>
                    ))}
                  </div>
                  <p className="workspace-scope-status">
                    {scopeDescription}
                    {scopedGraph ? ` · ${scopedGraph.nodes.length} visible nodes` : ''}
                  </p>
                </div>
              </div>
              <div className="workspace-scope-canvas">
                <MapCanvas
                  currentScope={workspaceScope}
                  graph={scopedGraph}
                  isCommandPaletteOpen={commandPalette.isOpen}
                  onCanvasBackgroundClick={closeOverlayPanel}
                  onCloseCommandPalette={commandPalette.closePalette}
                  onDrillNode={handleCanvasNodeDrill}
                  onGuideEvent={handleCanvasGuideEvent}
                  onOpenCommandPalette={commandPalette.openPalette}
                  onOpenGuide={openGuideHub}
                  onRevealSelection={handleSelectionReveal}
                  requestedCenterNode={requestedCenterNode}
                  requestedCloseTransientUiNonce={requestedCloseTransientUiNonce}
                  requestedFitGraphNonce={requestedFitGraphNonce}
                  requestedShowShortcutHelpNonce={requestedShowShortcutHelpNonce}
                  selectionState={selectionState}
                  showEmptyWorkspaceHint
                  showEditorOverlay={false}
                />
              </div>
            </section>
          </section>

          <aside className="workspace-right-rail">
            <WorkspaceInspectorPanel
              activeTab={activeEditorTab}
              document={workspaceDocument}
              map={map}
              multiSelectionActive={multiSelectionActive}
              onClearSelection={selectionState.clearSelection}
              onDocumentChange={session.setDocument}
              onNotesViewed={selectionState.markNodeNotesAsRead}
              onReturnToCheckpoint={handleReturnToCheckpoint}
              onSelectNodeBySelection={revealAndFollowSelection}
              onTabChange={setActiveEditorTab}
              selectedNode={selectedLookupNode}
              selectedWarnings={selectedWarnings}
            />
          </aside>
        </div>
      </main>

      <AnimatePresence>
        {commandPalette.isOpen ? (
          commandPaletteBuilders ? (
            <Suspense
              fallback={<CanvasCommandPaletteLoadingState onClose={commandPalette.closePalette} />}
            >
              <LazyCanvasCommandPalette
                highlightedEntry={commandPalette.highlightedEntry}
                isOpen={commandPalette.isOpen}
                onClose={commandPalette.closePalette}
                onEntryHover={commandPalette.setHighlightedEntry}
                onEntrySelect={commandPalette.executeEntry}
                onExecuteHighlightedEntry={commandPalette.executeHighlightedEntry}
                onMoveHighlight={commandPalette.moveHighlight}
                onQueryChange={commandPalette.setQuery}
                query={commandPalette.query}
                results={commandPalette.results}
              />
            </Suspense>
          ) : (
            <CanvasCommandPaletteLoadingState onClose={commandPalette.closePalette} />
          )
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {guideRun && activeGuide && activeGuideStep ? (
          <>
            {guideTargetRect ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="workspace-guide-spotlight"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="guide-spotlight"
                style={{
                  left: Math.max(0, guideTargetRect.left),
                  top: Math.max(0, guideTargetRect.top),
                  width: guideTargetRect.width,
                  height: guideTargetRect.height
                }}
              />
            ) : null}
            <motion.aside
              animate="animate"
              className="workspace-guide-panel"
              exit="exit"
              initial="initial"
              key="guide-panel"
              role="dialog"
              aria-label="Interactive guide"
              ref={guidePanelRef}
              style={guidePanelStyle}
              variants={dialogPanelVariants}
            >
              <div className="workspace-guide-panel-head">
                <div>
                  <p className="workspace-guide-panel-eyebrow">
                    {activeGuide.tag}
                  </p>
                  <h2>{activeGuide.label}</h2>
                  <p className="workspace-overlay-copy">
                    Step {guideRun.stepIndex + 1} of {activeGuide.steps.length}
                  </p>
                </div>
                <button className="button button-ghost button-mini" onClick={() => stopGuide(false)} type="button">
                  <X aria-hidden="true" className="button-icon" />
                </button>
              </div>
              <div className="workspace-guide-panel-body">
                <h3>{activeGuideStep.title}</h3>
                <p className="workspace-guide-panel-description">{activeGuideStep.instruction}</p>
                <div className="workspace-guide-callout">
                  <strong>{activeGuideStepComplete ? 'Step complete' : 'How this step completes'}</strong>
                  <p>
                    {activeGuideStepComplete
                      ? nextGuideRun
                        ? `Advancing to the next step in ${Math.round(WORKSPACE_GUIDE_AUTO_ADVANCE_MS / 100) / 10} seconds.`
                        : `Finishing the guide in ${Math.round(WORKSPACE_GUIDE_AUTO_ADVANCE_MS / 100) / 10} seconds.`
                      : activeGuideStep.successHint}
                  </p>
                </div>
              </div>
              <div className="workspace-guide-panel-actions">
                <button
                  className="button button-ghost button-mini"
                  disabled={!getPreviousWorkspaceGuideRun(guideRun)}
                  onClick={goToPreviousGuideStep}
                  type="button"
                >
                  Previous
                </button>
                <button className="button button-ghost button-mini" onClick={skipGuideStep} type="button">
                  Skip Step
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {recoverySnapshot ? (
          <motion.div
            animate="animate"
            className="workspace-dialog-panel workspace-recovery-panel"
            exit="exit"
            initial="initial"
            key="recovery-panel"
            role="dialog"
            aria-label="Recovery available"
            variants={recoveryPanelVariants}
          >
            <div>
              <h2>Recovery available</h2>
              <p className="workspace-overlay-copy">
                A local autosave snapshot from {formatRecoveryTimestamp(recoverySnapshot.savedAt)} is available.
              </p>
            </div>
            <div className="workspace-dialog-actions">
              <button className="button button-mini" onClick={requestRestoreRecovery} type="button">
                Restore Recovery
              </button>
              <button
                className="button button-ghost button-mini"
                onClick={() => {
                  session.dismissRecoverySnapshot();
                  session.setStatusMessage('Recovery discarded.');
                }}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showWelcomeDialog ? (
          <motion.div
            animate="animate"
            className="workspace-dialog-scrim"
            exit="exit"
            initial="initial"
            key="welcome-dialog"
            role="presentation"
            variants={workspaceScrimVariants}
          >
            <motion.div
              animate="animate"
              className="workspace-dialog-panel workspace-onboarding-dialog"
              exit="exit"
              initial="initial"
              role="dialog"
              aria-label="Welcome"
              variants={dialogPanelVariants}
            >
              <div>
                <h2>Welcome</h2>
                <p className="workspace-overlay-copy">
                  Open the interactive guide, create a blank map, or jump straight into either bundled example.
                </p>
              </div>
              <div className="workspace-onboarding-action-grid">
                <button className="button button-ghost workspace-onboarding-action" onClick={() => {
                  dismissWelcomeDialog();
                  openGuideHub();
                }} type="button">
                  <strong>Interactive Guide</strong>
                  <span>Practice the real right-click, double-click, edit, and conversion workflows.</span>
                </button>
                <button className="button button-ghost workspace-onboarding-action" onClick={() => {
                  dismissWelcomeDialog();
                  requestNewMap();
                }} type="button">
                  <strong>Create Map</strong>
                  <span>Start a blank Momentum or Hax draft.</span>
                </button>
                <button className="button button-ghost workspace-onboarding-action" onClick={() => {
                  dismissWelcomeDialog();
                  requestLoadHaxExample();
                }} type="button">
                  <strong>Load Hax Example</strong>
                  <span>Open the bundled Hax example immediately.</span>
                </button>
                <button className="button button-ghost workspace-onboarding-action" onClick={() => {
                  dismissWelcomeDialog();
                  requestLoadMomentumExample();
                }} type="button">
                  <strong>Load Momentum Example</strong>
                  <span>Open the bundled Project Momentum example immediately.</span>
                </button>
              </div>
              <div className="workspace-dialog-actions">
                <button className="button button-ghost button-mini" onClick={dismissWelcomeDialog} type="button">
                  Skip
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showGuideHub ? (
          <motion.div
            animate="animate"
            className="workspace-dialog-scrim"
            exit="exit"
            initial="initial"
            key="guide-hub-dialog"
            role="presentation"
            variants={workspaceScrimVariants}
          >
            <motion.div
              animate="animate"
              className="workspace-dialog-panel workspace-onboarding-dialog"
              exit="exit"
              initial="initial"
              role="dialog"
              aria-label="Guide hub"
              variants={dialogPanelVariants}
            >
              <div className="workspace-overlay-panel-head">
                <div>
                  <h2>Interactive Guide</h2>
                  <p className="workspace-overlay-copy">
                    Pick a workflow guide that teaches the real editor interactions.
                  </p>
                </div>
                <button
                  aria-label="Close guide hub"
                  className="button button-ghost button-mini"
                  onClick={closeGuideHub}
                  type="button"
                >
                  <X aria-hidden="true" className="button-icon" />
                </button>
              </div>
              <div className="workspace-guide-topic-grid">
                {guideDefinitions.map((guide) => (
                  <button
                    className="workspace-guide-topic-card"
                    key={guide.id}
                    onClick={() => startGuide(guide.id)}
                    type="button"
                  >
                    <div>
                      <div className="workspace-guide-topic-card-head">
                        <strong>{guide.label}</strong>
                        <span className="workspace-guide-topic-tag">{guide.tag}</span>
                      </div>
                      <p className="workspace-overlay-copy">{guide.description}</p>
                      <span className="workspace-guide-topic-meta">
                        {guide.steps.length} steps{onboardingState.completedGuideIds.includes(guide.id) ? ' · Completed' : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="workspace-dialog-actions">
                <button className="button button-mini" onClick={() => startGuide('core')} type="button">
                  Start Navigation Guide
                </button>
                <button className="button button-ghost button-mini" onClick={closeGuideHub} type="button">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingReplaceAction ? (
          <motion.div
            animate="animate"
            className="workspace-dialog-scrim"
            exit="exit"
            initial="initial"
            key="replace-dialog"
            role="presentation"
            variants={workspaceScrimVariants}
          >
            <motion.div
              animate="animate"
              className="workspace-dialog-panel"
              exit="exit"
              initial="initial"
              role="dialog"
              aria-label={pendingReplaceAction.title}
              variants={dialogPanelVariants}
            >
              <div>
                <h2>{pendingReplaceAction.title}</h2>
                <p className="workspace-overlay-copy">{pendingReplaceAction.description}</p>
              </div>
              <div className="workspace-dialog-actions">
                <button
                  className="button button-mini"
                  onClick={pendingReplaceAction.onConfirm}
                  type="button"
                >
                  {pendingReplaceAction.confirmLabel}
                </button>
                <button className="button button-ghost button-mini" onClick={closeReplacePrompt} type="button">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showNewMapDialog ? (
          <motion.div
            animate="animate"
            className="workspace-dialog-scrim"
            exit="exit"
            initial="initial"
            key="new-map-dialog"
            role="presentation"
            variants={workspaceScrimVariants}
          >
            <motion.div
              animate="animate"
              className="workspace-dialog-panel"
              exit="exit"
              initial="initial"
              role="dialog"
              aria-label="Create new map"
              variants={dialogPanelVariants}
            >
              <div>
                <h2>Create new map</h2>
                <p className="workspace-overlay-copy">
                  {isDirty
                    ? 'Choose a format for the new map. This will replace the current workspace state.'
                    : 'Choose a format for the new map.'}
                </p>
              </div>
              <div className="workspace-dialog-actions">
                <button
                  className="button button-mini"
                  onClick={() => {
                    createNewMap('momentum');
                  }}
                  type="button"
                >
                  Project Momentum
                </button>
                <button
                  className="button button-mini"
                  onClick={() => {
                    createNewMap('hax');
                  }}
                  type="button"
                >
                  Hax Framework
                </button>
                <button className="button button-ghost button-mini" onClick={closeNewMapDialog} type="button">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            animate="animate"
            className={`workspace-toast${errorMessage ? ' is-error' : ''}`}
            exit="exit"
            initial="initial"
            key={errorMessage ? `error-${toastMessage}` : `status-${toastMessage}`}
            ref={toastRef}
            variants={workspaceToastVariants}
          >
            {toastMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
