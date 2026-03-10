import type { ViewportMetrics } from '@/features/workspace/canvas/useCanvasViewport';
import type { EditorEdge, EditorNodeSummary } from '@/features/workspace/graph/types';

export interface CanvasSceneNodeChip {
  centerX: number;
  centerY: number;
  height: number;
  left: number;
  text: string;
  top: number;
  width: number;
}

export interface CanvasSceneNodeMarker {
  centerX: number;
  centerY: number;
  radius: number;
}

export interface CanvasSceneNodeLabel {
  text: string;
  x: number;
  y: number;
}

export interface CanvasSceneNode {
  bounds: {
    height: number;
    left: number;
    radius: number;
    top: number;
    width: number;
  };
  chip: CanvasSceneNodeChip | null;
  drawOrder: number;
  effectiveY: number;
  id: string;
  isDimmed: boolean;
  isHovered: boolean;
  isMultiSelected: boolean;
  isSelected: boolean;
  marker: CanvasSceneNodeMarker | null;
  node: EditorNodeSummary;
  subtitle: CanvasSceneNodeLabel | null;
  title: CanvasSceneNodeLabel;
}

export interface CanvasSceneEdge {
  edge: EditorEdge;
  id: string;
  isDimmed: boolean;
  points: EditorEdge['bezier'];
}

export interface CanvasSceneSnapshot {
  edges: CanvasSceneEdge[];
  metrics: ViewportMetrics;
  nodes: CanvasSceneNode[];
}

export type CanvasDragPreviewState = Record<string, number>;

export interface CanvasInteractionVisualState {
  dragPreviewOffsets: CanvasDragPreviewState;
  hoveredNodeId: string | null;
}

export type CanvasSceneHitTarget =
  | { kind: 'node'; node: CanvasSceneNode }
  | { kind: 'noteMarker'; node: CanvasSceneNode };
