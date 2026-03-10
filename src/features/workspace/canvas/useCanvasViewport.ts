import {
  EDITOR_MAX_SCALE,
  EDITOR_MIN_SCALE
} from '@/features/workspace/graph/layoutConstants';
import type { EditorNodeSummary, EditorViewState } from '@/features/workspace/graph/types';

export interface ViewportMetrics {
  rect: DOMRect;
  renderScale: number;
  offsetLeft: number;
  offsetTop: number;
}

export interface SelectionBoxLike {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface GraphContentBounds {
  centerX: number;
  centerY: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

interface BoundsNodeLike {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface FitGraphLike {
  height: number;
  nodes: BoundsNodeLike[];
  width: number;
}

export const DEFAULT_VIEW_STATE: EditorViewState = { scale: 1, offsetX: 0, offsetY: 0 };

export function clampScale(value: number): number {
  return Math.max(EDITOR_MIN_SCALE, Math.min(EDITOR_MAX_SCALE, value));
}

export function getAdaptiveZoomDelta(currentScale: number, requestedDelta: number): number {
  const direction = Math.sign(requestedDelta);
  const magnitude = Math.abs(requestedDelta);

  if (direction === 0 || magnitude === 0) {
    return 0;
  }

  if (currentScale >= 3.2) {
    return direction * Math.min(magnitude, 0.06);
  }

  if (currentScale >= 2.4) {
    return direction * Math.min(magnitude, 0.09);
  }

  if (currentScale >= 1.8) {
    return direction * Math.min(magnitude, 0.12);
  }

  return requestedDelta;
}

export function getViewportMetrics(
  viewportElement: HTMLDivElement | null,
  graph: { width: number; height: number } | null
): ViewportMetrics | null {
  const rect = viewportElement?.getBoundingClientRect();
  return getViewportMetricsFromRect(rect ?? null, graph);
}

export function getViewportMetricsFromRect(
  rect: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'> | null,
  graph: { width: number; height: number } | null
): ViewportMetrics | null {
  if (!graph || !rect || rect.width === 0 || rect.height === 0) {
    return null;
  }

  const renderScale = Math.min(rect.width / graph.width, rect.height / graph.height);
  const renderedWidth = graph.width * renderScale;
  const renderedHeight = graph.height * renderScale;

  return {
    rect: rect as DOMRect,
    renderScale,
    offsetLeft: (rect.width - renderedWidth) / 2,
    offsetTop: (rect.height - renderedHeight) / 2
  };
}

export function getNodeScreenPosition(
  node: EditorNodeSummary,
  viewState: EditorViewState,
  metrics: ViewportMetrics
): { x: number; y: number; metrics: ViewportMetrics } {
  const renderX = viewState.offsetX + node.x * viewState.scale;
  const renderY = viewState.offsetY + node.y * viewState.scale;

  return {
    x: metrics.offsetLeft + renderX * metrics.renderScale,
    y: metrics.offsetTop + renderY * metrics.renderScale,
    metrics
  };
}

export function getViewportCenterPoint(
  viewState: EditorViewState,
  metrics: ViewportMetrics
): { x: number; y: number } {
  const viewportCenterX = (metrics.rect.width / 2 - metrics.offsetLeft) / metrics.renderScale;
  const viewportCenterY = (metrics.rect.height / 2 - metrics.offsetTop) / metrics.renderScale;

  return {
    x: (viewportCenterX - viewState.offsetX) / viewState.scale,
    y: (viewportCenterY - viewState.offsetY) / viewState.scale
  };
}

export function getContentBounds(graph: { nodes: BoundsNodeLike[] } | null): GraphContentBounds | null {
  if (!graph || graph.nodes.length === 0) {
    return null;
  }

  const left = graph.nodes.reduce((value, node) => Math.min(value, node.x), Number.POSITIVE_INFINITY);
  const top = graph.nodes.reduce((value, node) => Math.min(value, node.y - node.height / 2), Number.POSITIVE_INFINITY);
  const right = graph.nodes.reduce((value, node) => Math.max(value, node.x + node.width), Number.NEGATIVE_INFINITY);
  const bottom = graph.nodes.reduce((value, node) => Math.max(value, node.y + node.height / 2), Number.NEGATIVE_INFINITY);
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);

  return {
    centerX: left + width / 2,
    centerY: top + height / 2,
    height,
    left,
    right,
    top,
    width
  };
}

export function getViewportPointFromClient(
  viewportElement: HTMLDivElement | null,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  const rect = viewportElement?.getBoundingClientRect();
  if (!rect) {
    return null;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

export function normalizeSelectionBox(box: SelectionBoxLike): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const left = Math.min(box.startX, box.currentX);
  const top = Math.min(box.startY, box.currentY);
  const width = Math.abs(box.currentX - box.startX);
  const height = Math.abs(box.currentY - box.startY);

  return { left, top, width, height };
}

export function getCenteredScaledViewState(
  currentView: EditorViewState,
  metrics: ViewportMetrics,
  delta: number
): EditorViewState {
  const nextScale = clampScale(currentView.scale + delta);
  if (nextScale === currentView.scale) {
    return currentView;
  }

  const viewportCenterX = (metrics.rect.width / 2 - metrics.offsetLeft) / metrics.renderScale;
  const viewportCenterY = (metrics.rect.height / 2 - metrics.offsetTop) / metrics.renderScale;
  const worldCenter = getViewportCenterPoint(currentView, metrics);

  return {
    scale: nextScale,
    offsetX: viewportCenterX - worldCenter.x * nextScale,
    offsetY: viewportCenterY - worldCenter.y * nextScale
  };
}

export function getPointerZoomViewState(
  currentView: EditorViewState,
  metrics: ViewportMetrics,
  clientX: number,
  clientY: number,
  delta: number
): EditorViewState {
  const nextScale = clampScale(currentView.scale + delta);
  if (nextScale === currentView.scale) {
    return currentView;
  }

  const pointerX = (clientX - metrics.rect.left - metrics.offsetLeft) / metrics.renderScale;
  const pointerY = (clientY - metrics.rect.top - metrics.offsetTop) / metrics.renderScale;
  const worldX = (pointerX - currentView.offsetX) / currentView.scale;
  const worldY = (pointerY - currentView.offsetY) / currentView.scale;

  return {
    scale: nextScale,
    offsetX: pointerX - worldX * nextScale,
    offsetY: pointerY - worldY * nextScale
  };
}

export function getCenteredViewStateForWorldPoint(
  currentView: EditorViewState,
  metrics: ViewportMetrics,
  point: { x: number; y: number }
): EditorViewState {
  const viewportCenterX = (metrics.rect.width / 2 - metrics.offsetLeft) / metrics.renderScale;
  const viewportCenterY = (metrics.rect.height / 2 - metrics.offsetTop) / metrics.renderScale;

  return {
    ...currentView,
    offsetX: viewportCenterX - point.x * currentView.scale,
    offsetY: viewportCenterY - point.y * currentView.scale
  };
}

export function getFitViewState(
  graph: FitGraphLike,
  metrics: ViewportMetrics,
  padding = 28
): EditorViewState {
  const bounds = getContentBounds(graph);
  if (!bounds) {
    return DEFAULT_VIEW_STATE;
  }

  const usableWidth = Math.max(1, metrics.rect.width - padding * 2);
  const usableHeight = Math.max(1, metrics.rect.height - padding * 2);
  const nextScale = clampScale(
    Math.min(
      usableWidth / (bounds.width * metrics.renderScale),
      usableHeight / (bounds.height * metrics.renderScale)
    )
  );
  const viewportCenterX = (metrics.rect.width / 2 - metrics.offsetLeft) / metrics.renderScale;
  const viewportCenterY = (metrics.rect.height / 2 - metrics.offsetTop) / metrics.renderScale;

  return {
    scale: nextScale,
    offsetX: viewportCenterX - bounds.centerX * nextScale,
    offsetY: viewportCenterY - bounds.centerY * nextScale
  };
}
