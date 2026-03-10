import {
  CircleHelp,
  Command,
  ScanSearch,
  Redo2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { useSessionState } from '@/app/useSessionState';
import {
  CanvasGraphSurface,
  type CanvasGraphSurfaceHandle
} from '@/features/workspace/canvas/CanvasGraphSurface';
import { CanvasContextMenu } from '@/features/workspace/canvas/CanvasContextMenu';
import { MapCanvasOverlay } from '@/features/workspace/canvas/MapCanvasOverlay';
import { buildNodeContextMenu } from '@/features/workspace/canvas/buildNodeContextMenu';
import { useCanvasContextMenu } from '@/features/workspace/canvas/useCanvasContextMenu';
import { useCanvasInteractions } from '@/features/workspace/canvas/useCanvasInteractions';
import { useCanvasKeyboardShortcuts } from '@/features/workspace/canvas/useCanvasKeyboardShortcuts';
import { didGraphStructureChange, getGraphStructureState } from '@/features/workspace/canvas/useMapCanvasGraph';
import { useMapStructureActions } from '@/features/workspace/canvas/useMapStructureActions';
import {
  createWorkspaceFloatingVariants,
  workspaceScrimVariants
} from '@/features/workspace/motion/workspaceMotion';
import {
  DEFAULT_VIEW_STATE,
  getAdaptiveZoomDelta,
  getCenteredViewStateForWorldPoint,
  getCenteredScaledViewState,
  getFitViewState,
  getNodeScreenPosition as getCanvasNodeScreenPosition,
  getViewportMetrics as getCanvasViewportMetrics,
  getViewportPointFromClient as getCanvasViewportPointFromClient
} from '@/features/workspace/canvas/useCanvasViewport';
import {
  EDITOR_ZOOM_STEP
} from '@/features/workspace/graph/buildEditorGraph';
import type {
  EditorGraphModel,
  EditorNodeSummary,
  EditorViewState
} from '@/features/workspace/graph/types';
import type { WorkspaceSelectionState } from '@/features/workspace/useWorkspaceSelectionState';
import type { EditorSelection, WorkspaceScope } from '@/features/workspace/types';

export type MapCanvasGuideEvent =
  | { kind: 'context-menu-close'; nonce: number }
  | { kind: 'context-menu-open'; nodeId: string; nonce: number }
  | { kind: 'fit-graph'; nonce: number }
  | { kind: 'shortcut-help-open-state'; isOpen: boolean };

interface MapCanvasProps {
  currentScope: WorkspaceScope;
  graph: EditorGraphModel | null;
  isCommandPaletteOpen: boolean;
  onCanvasBackgroundClick: () => void;
  onCloseCommandPalette: () => void;
  onDrillNode?: (node: EditorNodeSummary) => void;
  onGuideEvent?: (event: MapCanvasGuideEvent) => void;
  onOpenCommandPalette: () => void;
  onOpenGuide?: () => void;
  onRevealSelection?: (selection: EditorSelection, options?: { preserveScope?: boolean }) => void;
  requestedCenterNode: { id: string; nonce: number } | null;
  requestedCloseTransientUiNonce: number;
  requestedFitGraphNonce: number;
  requestedShowShortcutHelpNonce: number;
  selectionState: WorkspaceSelectionState;
  showEmptyWorkspaceHint?: boolean;
  showEditorOverlay?: boolean;
}

interface ShortcutHelpRow {
  id: string;
  icon: typeof CircleHelp;
  keys: string[];
  label: string;
}

const shortcutPopoverVariants = createWorkspaceFloatingVariants(8);
const bulkDeleteDialogVariants = createWorkspaceFloatingVariants(12);

function isRemovableNode(node: EditorNodeSummary, graph: EditorGraphModel | null, documentFormat: 'momentum' | 'hax' | null): boolean {
  if (!graph || !documentFormat) {
    return false;
  }

  switch (node.kind) {
    case 'level':
      return true;
    case 'checkpoint':
      return true;
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
    case 'bot':
    case 'impulse':
    case 'portal':
    case 'haxEffect':
    case 'haxEffectPair':
    case 'haxMission':
      return true;
    case 'haxEffects':
    case 'haxMissions':
    case 'start':
      return false;
    default:
      return false;
  }
}

export function MapCanvas({
  currentScope,
  graph,
  isCommandPaletteOpen,
  onCanvasBackgroundClick,
  onCloseCommandPalette,
  onDrillNode,
  onGuideEvent,
  onOpenCommandPalette,
  onOpenGuide,
  onRevealSelection,
  requestedCenterNode,
  requestedCloseTransientUiNonce,
  requestedFitGraphNonce,
  requestedShowShortcutHelpNonce,
  selectionState,
  showEmptyWorkspaceHint = false,
  showEditorOverlay = true
}: MapCanvasProps) {
  const session = useSessionState();
  const {
    canRedo,
    canUndo,
    handleRedo,
    handleUndo
  } = session;
  const {
    document: workspaceDocument,
    layout,
    map,
    multiSelection,
    readNoteNodeIds: savedReadNoteNodeIds,
    selection
  } = session.state;
  const isMomentumSession = workspaceDocument?.format === 'momentum';
  const documentFormat = workspaceDocument?.format ?? null;
  const {
    setDocument,
    setLayout,
    setMultiSelection,
    setReadNoteNodeIds,
    setSelection
  } = session;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<CanvasGraphSurfaceHandle | null>(null);
  const viewStateRef = useRef<EditorViewState>(DEFAULT_VIEW_STATE);
  const [, setViewportReadyTick] = useState(0);
  const [viewState, setViewState] = useState<EditorViewState>(DEFAULT_VIEW_STATE);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [pendingBulkDeleteNodes, setPendingBulkDeleteNodes] = useState<EditorNodeSummary[] | null>(null);
  const { closeContextMenu, menu, openContextMenu } = useCanvasContextMenu();
  const previousGraphStructureRef = useRef<ReturnType<typeof getGraphStructureState> | null>(null);
  const previousFitGraphNonceRef = useRef(0);
  const previousShowShortcutHelpNonceRef = useRef(0);
  const previousCenterNodeNonceRef = useRef(0);
  const previousCloseTransientUiNonceRef = useRef(0);
  const guideEventNonceRef = useRef(0);
  const previousContextMenuOpenRef = useRef(false);
  const previousContextMenuNodeIdRef = useRef<string | null>(null);
  const contextMenuNodeIdRef = useRef<string | null>(null);

  function nextGuideEventNonce(): number {
    guideEventNonceRef.current += 1;
    return guideEventNonceRef.current;
  }

  const fitGraph = useCallback((nextGraph: EditorGraphModel | null = null, options?: { notifyGuide?: boolean }): void => {
    if (!nextGraph) {
      setViewState(DEFAULT_VIEW_STATE);
      return;
    }

    const metrics = getCanvasViewportMetrics(viewportRef.current, nextGraph);
    setViewState(metrics ? getFitViewState(nextGraph, metrics) : DEFAULT_VIEW_STATE);
    closeContextMenu();
    setShowShortcutHelp(false);
    if (options?.notifyGuide) {
      onGuideEvent?.({ kind: 'fit-graph', nonce: nextGuideEventNonce() });
    }
  }, [closeContextMenu, onGuideEvent]);

  const {
    activeEditorTab,
    clearSelection,
    closeEditor,
    markNodeNotesAsRead,
    multiSelectionActive,
    multiSelectionSet,
    readNoteNodeIds: readNoteNodeIdSet,
    returnToCheckpoint,
    selectNode,
    selectNodeBySelection,
    selectedNode,
    selectedWarnings,
    selectionStatusLabel,
    setActiveEditorTab,
    toggleNodeInMultiSelection
  } = selectionState;

  const structureActions = useMapStructureActions({
    clearCanvasSelection: clearSelection,
    closeEditor,
    currentScope,
    graph,
    layout,
    document: workspaceDocument,
    map: isMomentumSession ? map : null,
    onDocumentChange: setDocument,
    onLayoutChange: setLayout,
    onMultiSelectionChange: setMultiSelection,
    onReadNoteNodeIdsChange: setReadNoteNodeIds,
    onRevealSelection: (nextSelection, options) => {
      if (onRevealSelection) {
        onRevealSelection(nextSelection, options);
        return;
      }

      selectNodeBySelection(nextSelection);
    },
    onSelectionChange: setSelection,
    readNoteNodeIds: savedReadNoteNodeIds,
    returnToCheckpoint,
    selectNodeBySelection,
    selection
  });

  useEffect(() => {
    if (!graph || !viewportRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => setViewportReadyTick((value) => value + 1));
    return () => window.cancelAnimationFrame(frameId);
  }, [graph]);

  useEffect(() => {
    if (!graph) {
      previousGraphStructureRef.current = null;
      return;
    }

    const nextStructure = getGraphStructureState(graph);
    if (didGraphStructureChange(previousGraphStructureRef.current, nextStructure)) {
      fitGraph(graph);
    }

    previousGraphStructureRef.current = nextStructure;
  }, [fitGraph, graph]);

  const viewportGraphBounds = graph ? { width: graph.width, height: graph.height } : null;

  function getViewportMetrics(nextGraph = graph):
    | { rect: DOMRect; renderScale: number; offsetLeft: number; offsetTop: number }
    | null {
    return getCanvasViewportMetrics(viewportRef.current, viewportGraphBounds ?? nextGraph);
  }

  function getNodeScreenPosition(node: EditorNodeSummary) {
    const metrics = getViewportMetrics();
    if (!metrics) {
      return null;
    }

    return getCanvasNodeScreenPosition(node, viewState, metrics);
  }

  function getViewportPointFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
    return getCanvasViewportPointFromClient(viewportRef.current, clientX, clientY);
  }

  function updateScale(delta: number): void {
    if (!graph) {
      return;
    }

    const metrics = getViewportMetrics();
    if (!metrics) {
      return;
    }

    setViewState((currentView) => getCenteredScaledViewState(currentView, metrics, getAdaptiveZoomDelta(currentView.scale, delta)));
    closeContextMenu();
    setShowShortcutHelp(false);
  }

  const {
    consumeNodeClickSuppression,
    handleViewportPointerDown,
    dragPreviewOffsets,
    isDraggingNode,
    panelOffsets,
    selectionBox,
    startNodeDrag,
    startPanelDrag
  } = useCanvasInteractions({
    graph,
    getViewportMetrics,
    getViewportPointFromClient,
    layout,
    multiSelection,
    multiSelectionActive,
    multiSelectionSet,
    onActivateMainTab: () => setActiveEditorTab('main'),
    onBackgroundClick: () => {
      clearSelection();
      onCanvasBackgroundClick();
    },
    onLayoutChange: setLayout,
    onMultiSelectionChange: setMultiSelection,
    onSelectionChange: setSelection,
    setViewState,
    viewState,
    viewStateRef,
    viewportRef
  });

  const selectedMultiDeleteNodes = useMemo(() => {
    if (!documentFormat || !graph || multiSelection.length < 2) {
      return [];
    }

    const nodes = multiSelection
      .map((nodeId) => graph.nodeById[nodeId] ?? null)
      .filter((node): node is EditorNodeSummary => Boolean(node));

    if (nodes.length !== multiSelection.length) {
      return [];
    }

    return nodes.every((node) => isRemovableNode(node, graph, documentFormat)) ? nodes : [];
  }, [documentFormat, graph, multiSelection]);
  const singleDeleteNode =
    documentFormat && graph && multiSelection.length === 0 && selectedNode && isRemovableNode(selectedNode, graph, documentFormat)
      ? selectedNode
      : null;
  const canDeleteSelection = Boolean(singleDeleteNode || selectedMultiDeleteNodes.length >= 2);

  function closeTransientUi(): void {
    closeContextMenu();
    setShowShortcutHelp(false);
  }

  useEffect(() => {
    onGuideEvent?.({ kind: 'shortcut-help-open-state', isOpen: showShortcutHelp });
  }, [onGuideEvent, showShortcutHelp]);

  useEffect(() => {
    const isMenuOpen = Boolean(menu);
    const currentContextMenuNodeId = contextMenuNodeIdRef.current;
    if (
      isMenuOpen &&
      currentContextMenuNodeId &&
      (!previousContextMenuOpenRef.current || previousContextMenuNodeIdRef.current !== currentContextMenuNodeId)
    ) {
      onGuideEvent?.({
        kind: 'context-menu-open',
        nodeId: currentContextMenuNodeId,
        nonce: nextGuideEventNonce()
      });
    }

    if (!isMenuOpen && previousContextMenuOpenRef.current) {
      onGuideEvent?.({
        kind: 'context-menu-close',
        nonce: nextGuideEventNonce()
      });
    }

    previousContextMenuOpenRef.current = isMenuOpen;
    previousContextMenuNodeIdRef.current = currentContextMenuNodeId;
  }, [menu, onGuideEvent]);

  useEffect(() => {
    if (requestedCloseTransientUiNonce === previousCloseTransientUiNonceRef.current) {
      return;
    }

    previousCloseTransientUiNonceRef.current = requestedCloseTransientUiNonce;
    closeTransientUi();
  }, [requestedCloseTransientUiNonce]);

  useEffect(() => {
    if (requestedFitGraphNonce === previousFitGraphNonceRef.current) {
      return;
    }

    previousFitGraphNonceRef.current = requestedFitGraphNonce;
    fitGraph(graph, { notifyGuide: true });
  }, [fitGraph, graph, requestedFitGraphNonce]);

  useEffect(() => {
    if (requestedShowShortcutHelpNonce === previousShowShortcutHelpNonceRef.current) {
      return;
    }

    previousShowShortcutHelpNonceRef.current = requestedShowShortcutHelpNonce;
    closeContextMenu();
    setShowShortcutHelp(true);
  }, [requestedShowShortcutHelpNonce, closeContextMenu]);

  useEffect(() => {
    if (!requestedCenterNode || requestedCenterNode.nonce === previousCenterNodeNonceRef.current || !graph) {
      return;
    }

    previousCenterNodeNonceRef.current = requestedCenterNode.nonce;
    const targetNode = graph.nodeById[requestedCenterNode.id];
    if (!targetNode) {
      return;
    }

    centerOnWorldPoint({
      x: targetNode.x + targetNode.width / 2,
      y: targetNode.y
    });
    closeTransientUi();
  }, [graph, requestedCenterNode]);

  function isCanvasFocused(): boolean {
    const viewport = viewportRef.current;
    return Boolean(viewport && document.activeElement === viewport);
  }

  function handleDeleteSelection(): void {
    if (!documentFormat || !graph) {
      return;
    }

    if (selectedMultiDeleteNodes.length >= 2) {
      setPendingBulkDeleteNodes(selectedMultiDeleteNodes);
      return;
    }

    if (!singleDeleteNode) {
      return;
    }

    switch (singleDeleteNode.kind) {
      case 'level':
        structureActions.handleRemoveLevel(singleDeleteNode.levelIndex!);
        return;
      case 'checkpoint':
        structureActions.handleRemoveCheckpoint(singleDeleteNode.levelIndex!, singleDeleteNode.checkpointIndex!);
        return;
      case 'touchOrb':
      case 'abilityOrb':
      case 'lavaOrb':
      case 'bot':
      case 'impulse':
      case 'portal':
      case 'haxEffect':
      case 'haxEffectPair':
        structureActions.handleRemoveEntity(singleDeleteNode);
        return;
      case 'start':
        return;
    }
  }

  function closeBulkDeletePrompt(): void {
    setPendingBulkDeleteNodes(null);
  }

  function confirmBulkDelete(): void {
    if (!pendingBulkDeleteNodes?.length) {
      return;
    }

    structureActions.handleDeleteNodes(pendingBulkDeleteNodes);
    setPendingBulkDeleteNodes(null);
  }

  function handleSelectAllNodes(): void {
    if (!graph) {
      return;
    }

    setMultiSelection(graph.nodes.map((node) => node.id));
    setSelection(null);
  }

  function centerOnWorldPoint(point: { x: number; y: number }): void {
    const metrics = getViewportMetrics();
    if (!graph || !metrics) {
      return;
    }

    setViewState((current) => getCenteredViewStateForWorldPoint(current, metrics, point));
  }

  const shortcutRows: ShortcutHelpRow[] = [
    { id: 'palette', icon: Command, keys: ['Ctrl/Cmd', 'K'], label: 'Open command palette' },
    { id: 'undo', icon: Undo2, keys: ['Ctrl', 'Z'], label: 'Undo last change' },
    { id: 'redo', icon: Redo2, keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo last change' },
    { id: 'delete', icon: Trash2, keys: ['Delete', 'Backspace'], label: 'Remove selected node or selection' },
    { id: 'fit', icon: ScanSearch, keys: ['F'], label: 'Fit graph to viewport' },
    { id: 'select-all', icon: Command, keys: ['Ctrl', 'A'], label: 'Select all visible nodes' },
    { id: 'toggle-node', icon: CircleHelp, keys: ['Ctrl', 'Click'], label: 'Add or remove a node in multi-select' },
    { id: 'marquee', icon: CircleHelp, keys: ['Ctrl', 'Drag'], label: 'Marquee multi-select' },
    { id: 'context', icon: CircleHelp, keys: ['Right Click'], label: 'Open node actions' },
    { id: 'drill', icon: CircleHelp, keys: ['Double Click'], label: 'Drill into a level or checkpoint' },
    { id: 'move', icon: CircleHelp, keys: ['Drag Node'], label: 'Move the selected node or selection' },
    { id: 'pan', icon: CircleHelp, keys: ['Drag Canvas'], label: 'Pan the map' }
  ];

  useCanvasKeyboardShortcuts({
    canDeleteSelection,
    canRedo,
    canUndo,
    hasSelection: Boolean(selection || multiSelection.length > 0),
    isCanvasFocused,
    onClearSelection: clearSelection,
    onCloseTransientUi: closeTransientUi,
    onDeleteSelection: handleDeleteSelection,
    onFitGraph: () => fitGraph(graph, { notifyGuide: true }),
    onRedo: handleRedo,
    onSelectAll: handleSelectAllNodes,
    onUndo: handleUndo
  });

  function handleNodeSelect(node: EditorNodeSummary, options?: { additive?: boolean; tab?: 'main' | 'notes' }): void {
    closeContextMenu();
    setShowShortcutHelp(false);
    if (consumeNodeClickSuppression()) {
      return;
    }

    if (options?.additive) {
      toggleNodeInMultiSelection(node);
      return;
    }

    selectNode(node, options?.tab ?? 'main');
  }

  function handleNodeContextMenu(event: ReactMouseEvent<HTMLElement | HTMLDivElement>, node: EditorNodeSummary): void {
    event.preventDefault();
    event.stopPropagation();
    setShowShortcutHelp(false);
    contextMenuNodeIdRef.current = node.id;
    openContextMenu(event.clientX, event.clientY, buildNodeContextMenu({
      actions: structureActions,
      currentScope,
      graph,
      document: workspaceDocument,
      map,
      multiSelection,
      multiSelectionActive,
      multiSelectionSet,
      node,
      onCloseContextMenu: closeContextMenu
    }));
  }

  function handleNodeDoubleClick(event: ReactMouseEvent<HTMLElement | HTMLDivElement>, node: EditorNodeSummary): void {
    event.preventDefault();
    event.stopPropagation();
    closeContextMenu();
    if (node.kind === 'level' || node.kind === 'checkpoint') {
      selectNode(node, 'main');
      onDrillNode?.(node);
      return;
    }

    selectNode(node, 'main');
  }

  const screenPosition =
    graph && selectedNode
      ? getNodeScreenPosition({
          ...selectedNode,
          y: selectedNode.y + (dragPreviewOffsets[selectedNode.id] ?? 0)
        })
      : null;
  const selectedNodeGuideTargetStyle =
    selectedNode && screenPosition
      ? {
          left: `${screenPosition.x}px`,
          top: `${screenPosition.y - selectedNode.height * viewState.scale * screenPosition.metrics.renderScale * 0.5}px`,
          width: `${selectedNode.width * viewState.scale * screenPosition.metrics.renderScale}px`,
          height: `${selectedNode.height * viewState.scale * screenPosition.metrics.renderScale}px`
        }
      : null;
  const panelOffset = selectedNode ? panelOffsets[selectedNode.id] ?? { x: 0, y: 0 } : { x: 0, y: 0 };
  const showEditorPanel = showEditorOverlay && Boolean(graph && selectedNode) && !multiSelectionActive && !menu;

  return (
    <section className="map-panel map-panel-canvas" data-guide-target="canvas-panel">
      <div className="map-toolbar map-toolbar-floating">
        <div className="map-toolbar-help">
          <button
            aria-expanded={showShortcutHelp}
            aria-label="Show canvas shortcuts"
            className={`button button-ghost button-mini${showShortcutHelp ? ' is-active' : ''}`}
            onClick={() => setShowShortcutHelp((current) => !current)}
            data-guide-target="canvas-help-button"
            type="button"
          >
            <CircleHelp className="button-icon" />
          </button>
          <AnimatePresence>
            {showShortcutHelp ? (
              <motion.div
                animate="animate"
                className="map-shortcut-popover"
                data-guide-target="canvas-help-popover"
                exit="exit"
                initial="initial"
                key="shortcut-popover"
                role="dialog"
                aria-label="Canvas shortcuts"
                variants={shortcutPopoverVariants}
              >
                <strong>Canvas shortcuts</strong>
                <div className="map-shortcut-list">
                  {shortcutRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div className="map-shortcut-row" key={row.id}>
                        <span className="map-shortcut-row-icon">
                          <Icon aria-hidden="true" className="button-icon" />
                        </span>
                        <span className="map-shortcut-row-label">{row.label}</span>
                        <span className="map-shortcut-row-keys">
                          {row.keys.map((key) => (
                            <span className="map-shortcut-pill" key={`${row.id}-${key}`}>{key}</span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {onOpenGuide ? (
                  <button
                    className="button button-ghost button-mini map-shortcut-guide-button"
                    onClick={() => {
                      setShowShortcutHelp(false);
                      onOpenGuide();
                    }}
                    type="button"
                  >
                    Open Interactive Guide
                  </button>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <button
          aria-label="Open command palette"
          data-guide-target="command-palette-trigger"
          className={`button button-ghost button-mini${isCommandPaletteOpen ? ' is-active' : ''}`}
          onClick={() => {
            if (isCommandPaletteOpen) {
              onCloseCommandPalette();
              return;
            }

            onOpenCommandPalette();
          }}
          title="Open command palette (Ctrl/Cmd+K)"
          type="button"
        >
          <Command className="button-icon" />
        </button>
        <button
          aria-label="Fit graph"
          className="button button-ghost button-mini"
          data-guide-target="fit-graph-button"
          disabled={!graph}
          onClick={() => fitGraph(graph, { notifyGuide: true })}
          title="Fit graph"
          type="button"
        >
          <ScanSearch className="button-icon" />
        </button>
        <button
          aria-label="Zoom out"
          className="button button-ghost button-mini"
          disabled={!graph}
          onClick={() => updateScale(-EDITOR_ZOOM_STEP)}
          title="Zoom out"
          type="button"
        >
          <ZoomOut className="button-icon" />
        </button>
        <button
          aria-label="Zoom in"
          className="button button-ghost button-mini"
          disabled={!graph}
          onClick={() => updateScale(EDITOR_ZOOM_STEP)}
          title="Zoom in"
          type="button"
        >
          <ZoomIn className="button-icon" />
        </button>
      </div>
      <div className="map-statusbar map-statusbar-floating">
        <span>{graph?.nodes.length ?? 0} nodes</span>
        <span>{Math.round(viewState.scale * 100)}%</span>
        {selectionStatusLabel ? <span>{selectionStatusLabel}</span> : null}
      </div>
      {menu ? <CanvasContextMenu items={menu.items} x={menu.x} y={menu.y} /> : null}
      <AnimatePresence>
        {pendingBulkDeleteNodes ? (
          <motion.div
            animate="animate"
            className="workspace-dialog-scrim"
            exit="exit"
            initial="initial"
            key="bulk-delete-dialog"
            role="presentation"
            variants={workspaceScrimVariants}
          >
            <motion.div
              animate="animate"
              className="workspace-dialog-panel"
              exit="exit"
              initial="initial"
              role="dialog"
              aria-label="Delete selected nodes"
              variants={bulkDeleteDialogVariants}
            >
              <div>
                <h2>{`Delete Selected (${pendingBulkDeleteNodes.length})?`}</h2>
                <p className="workspace-overlay-copy">
                  Delete {pendingBulkDeleteNodes.length} selected nodes from the map.
                </p>
              </div>
              <div className="workspace-dialog-actions">
                <button className="button button-mini" onClick={confirmBulkDelete} type="button">
                  {`Delete Selected (${pendingBulkDeleteNodes.length})`}
                </button>
                <button className="button button-ghost button-mini" onClick={closeBulkDeletePrompt} type="button">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div
        className="map-viewport"
        onClick={(event) => {
          if (!graph) {
            return;
          }

          const hitTarget = surfaceRef.current?.getHitTargetAtClientPoint(event.clientX, event.clientY);
          if (!hitTarget) {
            return;
          }

          if (hitTarget.kind === 'noteMarker') {
            handleNodeSelect(hitTarget.node.node, { tab: 'notes' });
            return;
          }

          handleNodeSelect(hitTarget.node.node, { additive: event.ctrlKey });
        }}
        onContextMenu={(event) => {
          if (!graph) {
            return;
          }

          const hitTarget = surfaceRef.current?.getHitTargetAtClientPoint(event.clientX, event.clientY);
          if (!hitTarget) {
            return;
          }

          handleNodeContextMenu(event, hitTarget.node.node);
        }}
        onDoubleClick={(event) => {
          if (!graph) {
            return;
          }

          const hitTarget = surfaceRef.current?.getHitTargetAtClientPoint(event.clientX, event.clientY);
          if (!hitTarget) {
            return;
          }

          handleNodeDoubleClick(event, hitTarget.node.node);
        }}
        onPointerLeave={() => {
          setHoveredNodeId(null);
        }}
        onPointerDown={(event) => {
          viewportRef.current?.focus();
          closeContextMenu();
          setShowShortcutHelp(false);
          if (graph) {
            const hitTarget = surfaceRef.current?.getHitTargetAtClientPoint(event.clientX, event.clientY);
            if (event.button === 0 && hitTarget) {
              startNodeDrag(event, hitTarget.node.node);
              return;
            }

            handleViewportPointerDown(event);
          }
        }}
        onPointerMove={(event) => {
          if (!graph || isDraggingNode) {
            if (hoveredNodeId !== null) {
              setHoveredNodeId(null);
            }
            return;
          }

          const hitTarget = surfaceRef.current?.getHitTargetAtClientPoint(event.clientX, event.clientY);
          const nextHoveredNodeId = hitTarget?.node.node.id ?? null;
          setHoveredNodeId((current) => current === nextHoveredNodeId ? current : nextHoveredNodeId);
        }}
        ref={viewportRef}
        tabIndex={0}
      >
        {selectedNodeGuideTargetStyle ? (
          <div
            aria-hidden="true"
            className="map-guide-selected-node-target"
            data-guide-target="selected-canvas-node"
            style={selectedNodeGuideTargetStyle}
          />
        ) : null}
        {graph ? (
          <>
            <CanvasGraphSurface
              graph={graph}
              graphBounds={viewportGraphBounds}
              interactionState={{ dragPreviewOffsets, hoveredNodeId }}
              multiSelectionSet={multiSelectionSet}
              readNoteNodeIds={readNoteNodeIdSet}
              ref={surfaceRef}
              selection={selection}
              selectionBox={selectionBox}
              viewState={viewState}
            />
            <MapCanvasOverlay
              activeTab={activeEditorTab}
              document={workspaceDocument!}
              editorRef={editorRef}
              map={map}
              onClose={closeEditor}
              onDocumentChange={setDocument}
              onNotesViewed={markNodeNotesAsRead}
              onReturnToCheckpoint={returnToCheckpoint}
              onSelectNodeBySelection={selectNodeBySelection}
              onStartPanelDrag={(event) => {
                if (!selectedNode) {
                  return;
                }
                closeContextMenu();
                setShowShortcutHelp(false);
                startPanelDrag(event, selectedNode.id, panelOffset);
              }}
              onTabChange={setActiveEditorTab}
              panelOffset={panelOffset}
              screenPosition={screenPosition}
              selectedNode={selectedNode}
              selectedWarnings={selectedWarnings}
              showEditorPanel={showEditorPanel}
              viewScale={viewState.scale}
            />
          </>
        ) : (
          <div className="workspace-empty-state map-empty-state" onClick={onCanvasBackgroundClick}>
            <div>
              <strong>No map loaded.</strong>
              <p>Open the Source panel, paste Workshop data, and convert it to build the graph.</p>
              {showEmptyWorkspaceHint ? (
                <>
                  <p>Or start with New Map, Load Hax Example, Load Momentum Example, or the guide.</p>
                  {onOpenGuide ? (
                    <div className="map-empty-state-actions">
                      <button className="button button-ghost button-mini" onClick={onOpenGuide} type="button">
                        Open Guide
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
