import type { EditorGraphModel, EditorViewState } from '@/features/workspace/graph/types';
import { selectionMatchesNode } from '@/features/workspace/canvas/selection';
import type {
  CanvasDragPreviewState,
  CanvasSceneEdge,
  CanvasSceneHitTarget,
  CanvasSceneNode,
  CanvasSceneSnapshot
} from '@/features/workspace/canvas/sceneTypes';
import type { ViewportMetrics } from '@/features/workspace/canvas/useCanvasViewport';
import type { EditorSelection } from '@/features/workspace/types';
import { measureWithPerf } from '@/shared/devPerf';

interface BuildCanvasSceneSnapshotInput {
  dragPreviewOffsets: CanvasDragPreviewState;
  graph: EditorGraphModel;
  hoveredNodeId: string | null;
  metrics: ViewportMetrics;
  multiSelectionSet: Set<string>;
  readNoteNodeIds: Set<string>;
  selection: EditorSelection | null;
  viewState: EditorViewState;
}

function projectX(worldX: number, viewState: EditorViewState, metrics: ViewportMetrics): number {
  return metrics.offsetLeft + (viewState.offsetX + worldX * viewState.scale) * metrics.renderScale;
}

function projectY(worldY: number, viewState: EditorViewState, metrics: ViewportMetrics): number {
  return metrics.offsetTop + (viewState.offsetY + worldY * viewState.scale) * metrics.renderScale;
}

function buildSceneNode(
  node: EditorGraphModel['nodes'][number],
  index: number,
  input: BuildCanvasSceneSnapshotInput
): CanvasSceneNode {
  const previewOffset = input.dragPreviewOffsets[node.id] ?? 0;
  const effectiveY = node.y + previewOffset;
  const scaledWidth = node.width * input.viewState.scale * input.metrics.renderScale;
  const scaledHeight = node.height * input.viewState.scale * input.metrics.renderScale;
  const centerX = projectX(node.x, input.viewState, input.metrics);
  const centerY = projectY(effectiveY, input.viewState, input.metrics);
  const left = centerX;
  const top = centerY - scaledHeight / 2;
  const showSubtitle = node.kind !== 'checkpoint' && Boolean(node.sublabel);
  const markerRadius = 4 * input.viewState.scale * input.metrics.renderScale;

  return {
    bounds: {
      left,
      top,
      width: scaledWidth,
      height: scaledHeight,
      radius: scaledHeight / 2
    },
    chip: null,
    drawOrder: index,
    effectiveY,
    id: node.id,
    isDimmed: Boolean(node.isDimmed),
    isHovered: input.hoveredNodeId === node.id,
    isMultiSelected: input.multiSelectionSet.has(node.id),
    isSelected: selectionMatchesNode(input.selection, node),
    marker:
      node.noteMarker && !input.readNoteNodeIds.has(node.id)
        ? {
            centerX: left + scaledWidth - 10 * input.viewState.scale * input.metrics.renderScale,
            centerY: top + 10 * input.viewState.scale * input.metrics.renderScale,
            radius: markerRadius
          }
        : null,
    node,
    subtitle:
      showSubtitle
        ? {
            text: node.sublabel,
            x: left + 12 * input.viewState.scale * input.metrics.renderScale,
            y: centerY + 10 * input.viewState.scale * input.metrics.renderScale
          }
        : null,
    title: {
      text: node.label,
      x: left + 12 * input.viewState.scale * input.metrics.renderScale,
      y: showSubtitle ? centerY - 2 * input.viewState.scale * input.metrics.renderScale : centerY
    }
  };
}

function buildSceneEdge(
  edge: EditorGraphModel['edges'][number],
  input: BuildCanvasSceneSnapshotInput
): CanvasSceneEdge {
  const sourcePreview = input.dragPreviewOffsets[edge.fromId] ?? 0;
  const targetPreview = input.dragPreviewOffsets[edge.toId] ?? 0;

  return {
    edge,
    id: edge.id,
    isDimmed: Boolean(edge.isDimmed),
    points: {
      startX: projectX(edge.bezier.startX, input.viewState, input.metrics),
      startY: projectY(edge.bezier.startY + sourcePreview, input.viewState, input.metrics),
      control1X: projectX(edge.bezier.control1X, input.viewState, input.metrics),
      control1Y: projectY(edge.bezier.control1Y + sourcePreview, input.viewState, input.metrics),
      control2X: projectX(edge.bezier.control2X, input.viewState, input.metrics),
      control2Y: projectY(edge.bezier.control2Y + targetPreview, input.viewState, input.metrics),
      endX: projectX(edge.bezier.endX, input.viewState, input.metrics),
      endY: projectY(edge.bezier.endY + targetPreview, input.viewState, input.metrics)
    }
  };
}

export function buildCanvasSceneSnapshot(input: BuildCanvasSceneSnapshotInput): CanvasSceneSnapshot {
  return measureWithPerf('canvas-scene-snapshot', () => ({
    metrics: input.metrics,
    edges: input.graph.edges.map((edge) => buildSceneEdge(edge, input)),
    nodes: input.graph.nodes.map((node, index) => buildSceneNode(node, index, input))
  }));
}

function isWithinRect(
  x: number,
  y: number,
  rect: { height: number; left: number; top: number; width: number }
): boolean {
  return x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
}

export function hitTestCanvasScene(
  snapshot: CanvasSceneSnapshot | null,
  localX: number,
  localY: number
): CanvasSceneHitTarget | null {
  if (!snapshot) {
    return null;
  }

  for (let index = snapshot.nodes.length - 1; index >= 0; index -= 1) {
    const node = snapshot.nodes[index];
    if (node.marker) {
      const markerDistance = Math.hypot(localX - node.marker.centerX, localY - node.marker.centerY);
      if (markerDistance <= node.marker.radius + 2) {
        return { kind: 'noteMarker', node };
      }
    }

    if (isWithinRect(localX, localY, node.bounds)) {
      return { kind: 'node', node };
    }
  }

  return null;
}
