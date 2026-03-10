import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction
} from 'react';
import { EDITOR_ZOOM_STEP } from '@/features/workspace/graph/layoutConstants';
import type {
  EditorGraphModel,
  EditorNodeSummary,
  EditorViewState
} from '@/features/workspace/graph/types';
import type {
  EditorLayoutState,
  EditorSelection,
  MultiNodeSelection
} from '@/features/workspace/types';
import type { ViewportMetrics } from '@/features/workspace/canvas/useCanvasViewport';
import { DEFAULT_VIEW_STATE, getAdaptiveZoomDelta, getPointerZoomViewState } from '@/features/workspace/canvas/useCanvasViewport';

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface SelectionBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

type CanvasDragState =
  | { kind: 'canvas'; pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number }
  | {
      kind: 'node';
      didMove: boolean;
      pointerId: number;
      nodeId: string;
      startX: number;
      startY: number;
      originYOffset: number;
      groupNodeIds?: string[];
      originOffsets?: Record<string, number>;
    }
  | { kind: 'panel'; pointerId: number; nodeId: string; startX: number; startY: number; originX: number; originY: number }
  | { kind: 'marquee'; pointerId: number; startX: number; startY: number; currentX: number; currentY: number }
  | null;

interface UseCanvasInteractionsOptions {
  graph: EditorGraphModel | null;
  getViewportMetrics: (nextGraph?: EditorGraphModel | null) => ViewportMetrics | null;
  getViewportPointFromClient: (clientX: number, clientY: number) => { x: number; y: number } | null;
  layout: EditorLayoutState;
  multiSelection: MultiNodeSelection;
  multiSelectionActive: boolean;
  multiSelectionSet: Set<string>;
  onActivateMainTab: () => void;
  onBackgroundClick: () => void;
  onLayoutChange: (layout: EditorLayoutState) => void;
  onMultiSelectionChange: (selection: MultiNodeSelection) => void;
  onSelectionChange: (selection: EditorSelection | null) => void;
  setViewState: Dispatch<SetStateAction<EditorViewState>>;
  viewState: EditorViewState;
  viewStateRef: MutableRefObject<EditorViewState>;
  viewportRef: RefObject<HTMLDivElement | null>;
}

export function createRafBatcher<T>(
  onFlush: (value: T) => void,
  requestFrame: (callback: FrameRequestCallback) => number = (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (handle: number) => void = (handle) => window.cancelAnimationFrame(handle)
) {
  let frameHandle: number | null = null;
  let hasPending = false;
  let latestValue: T;

  function flushPending(): void {
    if (!hasPending) {
      return;
    }

    hasPending = false;
    onFlush(latestValue!);
  }

  return {
    flush() {
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }

      flushPending();
    },
    schedule(value: T) {
      latestValue = value;
      hasPending = true;

      if (frameHandle !== null) {
        return;
      }

      frameHandle = requestFrame(() => {
        frameHandle = null;
        flushPending();
      });
    }
  };
}

export function didPointerMoveEnough(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  threshold = 3
): boolean {
  return Math.hypot(currentX - startX, currentY - startY) >= threshold;
}

export function getIntersectedNodes(
  graph: EditorGraphModel,
  box: SelectionBounds,
  metrics: ViewportMetrics,
  viewState: EditorViewState
): EditorNodeSummary[] {
  const boxLeft = ((box.left - metrics.offsetLeft) / metrics.renderScale - viewState.offsetX) / viewState.scale;
  const boxTop = ((box.top - metrics.offsetTop) / metrics.renderScale - viewState.offsetY) / viewState.scale;
  const boxRight = ((box.left + box.width - metrics.offsetLeft) / metrics.renderScale - viewState.offsetX) / viewState.scale;
  const boxBottom = ((box.top + box.height - metrics.offsetTop) / metrics.renderScale - viewState.offsetY) / viewState.scale;

  return graph.nodes.filter((node) => {
    const nodeLeft = node.x;
    const nodeTop = node.y - node.height / 2;
    const nodeRight = node.x + node.width;
    const nodeBottom = node.y + node.height / 2;

    return !(nodeRight < boxLeft || nodeLeft > boxRight || nodeBottom < boxTop || nodeTop > boxBottom);
  });
}

export function applyGroupDragLayout(
  layout: EditorLayoutState,
  groupNodeIds: string[],
  originOffsets: Record<string, number>,
  deltaY: number
): EditorLayoutState {
  const nextLayout = { ...layout };

  groupNodeIds.forEach((nodeId) => {
    const originYOffset = originOffsets[nodeId];
    if (originYOffset === undefined) {
      return;
    }

    const nextOffset = originYOffset + deltaY;
    if (nextOffset === 0) {
      delete nextLayout[nodeId];
      return;
    }

    nextLayout[nodeId] = { yOffset: nextOffset };
  });

  return nextLayout;
}

export function applySingleNodeDragLayout(
  layout: EditorLayoutState,
  nodeId: string,
  originYOffset: number,
  deltaY: number
): EditorLayoutState {
  const nextOffset = originYOffset + deltaY;
  const nextLayout = { ...layout };

  if (nextOffset === 0) {
    delete nextLayout[nodeId];
    return nextLayout;
  }

  nextLayout[nodeId] = { yOffset: nextOffset };
  return nextLayout;
}

export function buildDragPreviewOffsets(
  nodeId: string,
  deltaY: number,
  groupNodeIds?: string[]
): Record<string, number> {
  if (groupNodeIds?.length) {
    return Object.fromEntries(groupNodeIds.map((groupNodeId) => [groupNodeId, deltaY] as const));
  }

  return { [nodeId]: deltaY };
}

export function getNodeDragTargetIds(
  graph: EditorGraphModel | null,
  node: EditorNodeSummary,
  multiSelection: MultiNodeSelection,
  multiSelectionActive: boolean,
  multiSelectionSet: Set<string>
): string[] | null {
  if (multiSelectionActive && multiSelectionSet.has(node.id)) {
    return [...multiSelection];
  }

  if (!graph) {
    return null;
  }

  const descendantIds: string[] = [];
  const pendingParentIds = [node.id];

  while (pendingParentIds.length > 0) {
    const parentId = pendingParentIds.shift();
    if (!parentId) {
      continue;
    }

    const childIds = graph.childrenById[parentId] ?? [];

    descendantIds.push(...childIds);
    pendingParentIds.push(...childIds);
  }

  if (descendantIds.length > 0) {
    return [node.id, ...descendantIds];
  }

  return null;
}

export function useCanvasInteractions({
  graph,
  getViewportMetrics,
  getViewportPointFromClient,
  layout,
  multiSelection,
  multiSelectionActive,
  multiSelectionSet,
  onActivateMainTab,
  onBackgroundClick,
  onLayoutChange,
  onMultiSelectionChange,
  onSelectionChange,
  setViewState,
  viewState,
  viewStateRef,
  viewportRef
}: UseCanvasInteractionsOptions) {
  const dragStateRef = useRef<CanvasDragState>(null);
  const graphRef = useRef<EditorGraphModel | null>(graph);
  const layoutRef = useRef<EditorLayoutState>(layout);
  const dragPreviewOffsetsRef = useRef<Record<string, number>>({});
  const suppressNodeClickRef = useRef(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragPreviewOffsets, setDragPreviewOffsets] = useState<Record<string, number>>({});
  const [panelOffsets, setPanelOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const panelOffsetsRef = useRef<Record<string, { x: number; y: number }>>({});
  const pendingViewStateRef = useRef<EditorViewState | null>(null);
  const pendingSelectionBoxRef = useRef<SelectionBox | null | undefined>(undefined);
  const pendingPanelOffsetsRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  const pendingDragPreviewOffsetsRef = useRef<Record<string, number> | null>(null);
  const frameRef = useRef<number | null>(null);

  function commitPendingState(): void {
    if (pendingViewStateRef.current) {
      setViewState(pendingViewStateRef.current);
      pendingViewStateRef.current = null;
    }

    if (pendingSelectionBoxRef.current !== undefined) {
      setSelectionBox(pendingSelectionBoxRef.current);
      pendingSelectionBoxRef.current = undefined;
    }

    if (pendingPanelOffsetsRef.current) {
      setPanelOffsets(pendingPanelOffsetsRef.current);
      pendingPanelOffsetsRef.current = null;
    }

    if (pendingDragPreviewOffsetsRef.current) {
      setDragPreviewOffsets(pendingDragPreviewOffsetsRef.current);
      pendingDragPreviewOffsetsRef.current = null;
    }
  }

  function scheduleFrame(): void {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      commitPendingState();
    });
  }

  function flushScheduledFrame(): void {
    if (frameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    commitPendingState();
  }

  function queueViewState(nextViewState: EditorViewState): void {
    viewStateRef.current = nextViewState;
    pendingViewStateRef.current = nextViewState;
    scheduleFrame();
  }

  function queueSelectionBox(nextSelectionBox: SelectionBox | null): void {
    pendingSelectionBoxRef.current = nextSelectionBox;
    scheduleFrame();
  }

  function queuePanelOffsets(nextPanelOffsets: Record<string, { x: number; y: number }>): void {
    panelOffsetsRef.current = nextPanelOffsets;
    pendingPanelOffsetsRef.current = nextPanelOffsets;
    scheduleFrame();
  }

  function queueDragPreviewOffsets(nextDragPreviewOffsets: Record<string, number>): void {
    dragPreviewOffsetsRef.current = nextDragPreviewOffsets;
    pendingDragPreviewOffsetsRef.current = nextDragPreviewOffsets;
    scheduleFrame();
  }

  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState, viewStateRef]);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    dragPreviewOffsetsRef.current = dragPreviewOffsets;
  }, [dragPreviewOffsets]);

  useEffect(() => {
    panelOffsetsRef.current = panelOffsets;
  }, [panelOffsets]);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!graph) {
      flushScheduledFrame();
      viewStateRef.current = DEFAULT_VIEW_STATE;
      dragPreviewOffsetsRef.current = {};
      panelOffsetsRef.current = {};
      pendingViewStateRef.current = null;
      pendingSelectionBoxRef.current = undefined;
      pendingPanelOffsetsRef.current = null;
      pendingDragPreviewOffsetsRef.current = null;
      setViewState(DEFAULT_VIEW_STATE);
      setDragPreviewOffsets({});
      setPanelOffsets({});
      setSelectionBox(null);
    }
  }, [graph, setViewState, viewStateRef]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element || !graph) {
      return;
    }

    const graphModel = graph;
    function handleWheel(event: WheelEvent): void {
      event.preventDefault();
      event.stopPropagation();

      const metrics = getViewportMetrics(graphModel);
      if (!metrics) {
        return;
      }

      const currentView = viewStateRef.current;
      queueViewState(
        getPointerZoomViewState(
          currentView,
          metrics,
          event.clientX,
          event.clientY,
          getAdaptiveZoomDelta(currentView.scale, event.deltaY < 0 ? EDITOR_ZOOM_STEP : -EDITOR_ZOOM_STEP)
        )
      );
    }

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [getViewportMetrics, graph, setViewState, viewStateRef, viewportRef]);

  useEffect(() => {
    function stopDragging(event?: PointerEvent): void {
      flushScheduledFrame();
      const dragState = dragStateRef.current;
      const currentGraph = graphRef.current;
      if (dragState && currentGraph) {
        if (dragState.kind === 'marquee') {
          const box = {
            left: Math.min(dragState.startX, dragState.currentX),
            top: Math.min(dragState.startY, dragState.currentY),
            width: Math.abs(dragState.currentX - dragState.startX),
            height: Math.abs(dragState.currentY - dragState.startY)
          };
          const metrics = getViewportMetrics(currentGraph);

          if (metrics && box.width > 0 && box.height > 0) {
            const intersectedNodes = getIntersectedNodes(currentGraph, box, metrics, viewStateRef.current);

            if (intersectedNodes.length >= 2) {
              onMultiSelectionChange(intersectedNodes.map((node) => node.id));
              onSelectionChange(null);
            } else if (intersectedNodes.length === 1) {
              onMultiSelectionChange([]);
              onSelectionChange(intersectedNodes[0].selection);
              onActivateMainTab();
            } else {
              onMultiSelectionChange([]);
              onSelectionChange(null);
            }
          } else {
            onMultiSelectionChange([]);
            onSelectionChange(null);
          }

          setSelectionBox(null);
        } else if (dragState.kind === 'canvas' && event) {
          const movedDistance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
          if (movedDistance < 4) {
            onBackgroundClick();
          }
        } else if (dragState.kind === 'node' && dragState.didMove) {
          const deltaY =
            dragState.groupNodeIds?.length
              ? dragPreviewOffsetsRef.current[dragState.groupNodeIds[0]!] ?? 0
              : dragPreviewOffsetsRef.current[dragState.nodeId] ?? 0;

          if (dragState.groupNodeIds?.length && dragState.originOffsets) {
            onLayoutChange(
              applyGroupDragLayout(
                layoutRef.current,
                dragState.groupNodeIds,
                dragState.originOffsets,
                deltaY
              )
            );
          } else {
            onLayoutChange(applySingleNodeDragLayout(layoutRef.current, dragState.nodeId, dragState.originYOffset, deltaY));
          }

          suppressNodeClickRef.current = true;
        }
      }

      dragStateRef.current = null;
      setIsDraggingNode(false);
      pendingDragPreviewOffsetsRef.current = null;
      dragPreviewOffsetsRef.current = {};
      setDragPreviewOffsets({});
    }

    function handlePointerMove(event: PointerEvent): void {
      const dragState = dragStateRef.current;
      const currentGraph = graphRef.current;
      if (!dragState || !currentGraph || event.pointerId !== dragState.pointerId) {
        return;
      }

      const metrics = getViewportMetrics(currentGraph);
      if (!metrics) {
        return;
      }

      if (dragState.kind === 'canvas') {
        const deltaX = (event.clientX - dragState.startX) / metrics.renderScale;
        const deltaY = (event.clientY - dragState.startY) / metrics.renderScale;
        queueViewState({
          ...viewStateRef.current,
          offsetX: dragState.offsetX + deltaX,
          offsetY: dragState.offsetY + deltaY
        });
        return;
      }

      if (dragState.kind === 'marquee') {
        const point = getViewportPointFromClient(event.clientX, event.clientY);
        if (!point) {
          return;
        }

        dragStateRef.current = {
          ...dragState,
          currentX: point.x,
          currentY: point.y
        };
        queueSelectionBox({
          startX: dragState.startX,
          startY: dragState.startY,
          currentX: point.x,
          currentY: point.y
        });
        return;
      }

      if (dragState.kind === 'panel') {
        queuePanelOffsets({
          ...panelOffsetsRef.current,
          [dragState.nodeId]: {
            x: dragState.originX + (event.clientX - dragState.startX),
            y: dragState.originY + (event.clientY - dragState.startY)
          }
        });
        return;
      }

      const deltaY = (event.clientY - dragState.startY) / (metrics.renderScale * viewStateRef.current.scale);
      const movedEnough = didPointerMoveEnough(dragState.startX, dragState.startY, event.clientX, event.clientY);
      if (!dragState.didMove && movedEnough) {
        dragStateRef.current = {
          ...dragState,
          didMove: true
        };
      }
      if (!dragState.didMove && !movedEnough) {
        return;
      }

      queueDragPreviewOffsets(buildDragPreviewOffsets(dragState.nodeId, deltaY, dragState.groupNodeIds));
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [
    getViewportMetrics,
    getViewportPointFromClient,
    onActivateMainTab,
    onBackgroundClick,
    onLayoutChange,
    onMultiSelectionChange,
    onSelectionChange,
    setViewState,
    viewStateRef
  ]);

  function startNodeDrag(event: ReactPointerEvent<Element>, node: EditorNodeSummary): void {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    const dragTargetIds = getNodeDragTargetIds(graph, node, multiSelection, multiSelectionActive, multiSelectionSet);
    const groupDrag = Boolean(dragTargetIds && dragTargetIds.length > 1);
    const originOffsets =
      groupDrag
        ? Object.fromEntries(
            dragTargetIds!
              .map((nodeId) => [nodeId, layoutRef.current[nodeId]?.yOffset ?? 0] as const)
          )
        : undefined;

    if (!groupDrag && multiSelectionActive) {
      onMultiSelectionChange([]);
      onSelectionChange(node.selection);
      onActivateMainTab();
    }

    dragStateRef.current = {
      kind: 'node',
      didMove: false,
      pointerId: event.pointerId,
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      originYOffset: layoutRef.current[node.id]?.yOffset ?? 0,
      groupNodeIds: groupDrag ? dragTargetIds! : undefined,
      originOffsets
    };
    setIsDraggingNode(true);
  }

  function handleViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as Element | null;
    if (target?.closest('.canvas-node-editor')) {
      return;
    }

    if (event.ctrlKey) {
      const point = getViewportPointFromClient(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      dragStateRef.current = {
        kind: 'marquee',
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y
      };
      setSelectionBox({
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y
      });
      return;
    }

    dragStateRef.current = {
      kind: 'canvas',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: viewStateRef.current.offsetX,
      offsetY: viewStateRef.current.offsetY
    };
  }

  function startPanelDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    nodeId: string,
    origin: { x: number; y: number }
  ): void {
    event.stopPropagation();
    dragStateRef.current = {
      kind: 'panel',
      pointerId: event.pointerId,
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y
    };
  }

  return {
    consumeNodeClickSuppression() {
      if (!suppressNodeClickRef.current) {
        return false;
      }

      suppressNodeClickRef.current = false;
      return true;
    },
    handleViewportPointerDown,
    dragPreviewOffsets,
    isDraggingNode,
    panelOffsets,
    selectionBox,
    startNodeDrag,
    startPanelDrag
  };
}
