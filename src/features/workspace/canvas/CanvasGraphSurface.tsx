import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { hitTestCanvasScene, buildCanvasSceneSnapshot } from '@/features/workspace/canvas/buildCanvasSceneSnapshot';
import {
  mixCanvasColors,
  resolveCanvasThemeColors,
  withCanvasAlpha
} from '@/features/workspace/canvas/canvasColors';
import type {
  CanvasInteractionVisualState,
  CanvasSceneHitTarget,
  CanvasSceneNode,
  CanvasSceneSnapshot
} from '@/features/workspace/canvas/sceneTypes';
import type { SelectionBox } from '@/features/workspace/canvas/useCanvasInteractions';
import { getViewportMetricsFromRect } from '@/features/workspace/canvas/useCanvasViewport';
import { getCanvasFont } from '@/features/workspace/graph/textMeasure';
import type { EditorGraphModel, EditorViewState } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';

const DEFAULT_ACCENT = '#95d9ff';
const DEFAULT_ACCENT_SOFT = 'rgba(95, 217, 255, 0.18)';
const TITLE_FONT_SIZE = 12.8;
const SUBTITLE_FONT_SIZE = 9.92;
const CHIP_FONT_SIZE = 9.28;

function snapTextCoordinate(value: number): number {
  return Math.round(value);
}

function snapStrokeCoordinate(value: number, lineWidth: number): number {
  const rounded = Math.round(value);
  return Math.round(lineWidth) % 2 === 1 ? rounded + 0.5 : rounded;
}

interface CanvasGraphSurfaceProps {
  graph: EditorGraphModel | null;
  graphBounds: { height: number; width: number } | null;
  interactionState: CanvasInteractionVisualState;
  multiSelectionSet: Set<string>;
  readNoteNodeIds: Set<string>;
  selection: EditorSelection | null;
  selectionBox: SelectionBox | null;
  viewState: EditorViewState;
  onSnapshotChange?: (snapshot: CanvasSceneSnapshot | null) => void;
}

export interface CanvasGraphSurfaceHandle {
  getHitTargetAtClientPoint: (clientX: number, clientY: number) => CanvasSceneHitTarget | null;
}

function syncCanvasSize(canvas: HTMLCanvasElement, width: number, height: number, devicePixelRatio: number): CanvasRenderingContext2D | null {
  const scaledWidth = Math.max(1, Math.round(width * devicePixelRatio));
  const scaledHeight = Math.max(1, Math.round(height * devicePixelRatio));
  if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  return context;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.roundRect(left, top, width, height, radius);
}

function resolveNodeVisuals(node: CanvasSceneNode, theme: ReturnType<typeof resolveCanvasThemeColors>) {
  const accent = node.node.accentColor ?? DEFAULT_ACCENT;
  const accentSoft = node.node.accentSoftColor ?? DEFAULT_ACCENT_SOFT;
  const emphasizedNode =
    node.node.kind === 'level' ||
    node.node.kind === 'checkpoint' ||
    node.node.kind === 'touchOrb' ||
    node.node.kind === 'abilityOrb' ||
    node.node.kind === 'lavaOrb' ||
    node.node.kind === 'bot' ||
    node.node.kind === 'impulse' ||
    node.node.kind === 'portal' ||
    node.node.kind === 'haxEffect' ||
    node.node.kind === 'haxEffectPair' ||
    node.node.kind === 'haxEffects' ||
    node.node.kind === 'haxMissions' ||
    node.node.kind === 'haxMission';
  const strongNode = node.node.kind === 'checkpoint';
  let fill = strongNode ? theme.nodeBaseFillStrong : theme.nodeBaseFill;
  let stroke = theme.nodeBaseStroke;
  let lineWidth = node.isSelected ? 2.2 : node.isMultiSelected ? 1.7 : node.node.kind === 'level' ? 1.35 : 1.25;

  if (emphasizedNode) {
    fill = mixCanvasColors(accent, fill, node.node.kind === 'level' ? 0.18 : 0.14);
    stroke = mixCanvasColors(accent, stroke, node.node.kind === 'level' ? 0.4 : 0.32);
  }

  if (node.isHovered) {
    fill = mixCanvasColors(accent, theme.nodeHoverFill, 0.22);
  }

  if (node.isMultiSelected) {
    stroke = mixCanvasColors(accent, theme.countChipText, 0.64);
  }

  if (node.isSelected) {
    stroke = accent;
    lineWidth = 2.25;
  }

  return { accent, accentSoft, fill, lineWidth, stroke };
}

function drawSceneNode(
  context: CanvasRenderingContext2D,
  node: CanvasSceneNode,
  theme: ReturnType<typeof resolveCanvasThemeColors>
): void {
  const visuals = resolveNodeVisuals(node, theme);
  const alpha = node.isDimmed ? 0.42 : 1;
  context.save();
  context.globalAlpha = alpha;

  if (node.isSelected) {
    context.shadowColor = visuals.accentSoft;
    context.shadowBlur = 22;
  } else if (node.isMultiSelected) {
    context.shadowColor = mixCanvasColors(visuals.accentSoft, theme.surfacePanelActive, 0.68);
    context.shadowBlur = 10;
  } else {
    context.shadowColor = withCanvasAlpha('#000000', 0.16);
    context.shadowBlur = 8;
    context.shadowOffsetY = 2;
  }

  drawRoundedRect(
    context,
    snapStrokeCoordinate(node.bounds.left, visuals.lineWidth),
    snapStrokeCoordinate(node.bounds.top, visuals.lineWidth),
    node.bounds.width,
    node.bounds.height,
    node.bounds.radius
  );
  context.fillStyle = visuals.fill;
  context.strokeStyle = visuals.stroke;
  context.lineWidth = visuals.lineWidth;
  context.fill();
  context.stroke();

  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  if (node.isSelected) {
    drawRoundedRect(
      context,
      snapStrokeCoordinate(node.bounds.left - 2, 1),
      snapStrokeCoordinate(node.bounds.top - 2, 1),
      node.bounds.width + 4,
      node.bounds.height + 4,
      node.bounds.radius + 2
    );
    context.strokeStyle = withCanvasAlpha(visuals.accent, 0.55);
    context.lineWidth = 1;
    context.stroke();
  }

  context.fillStyle =
    node.node.kind === 'level' || node.node.kind === 'checkpoint'
      ? mixCanvasColors(visuals.accent, theme.textTitle, 0.16)
      : theme.textTitle;
  context.font = getCanvasFont('title').replace('12.8px', `${TITLE_FONT_SIZE * (node.bounds.height / node.node.height) * 0.8}px`);
  context.textBaseline = 'middle';
  context.fillText(node.title.text, snapTextCoordinate(node.title.x), snapTextCoordinate(node.title.y));

  if (node.subtitle) {
    context.fillStyle =
      node.node.kind === 'level' || node.node.kind === 'checkpoint'
        ? mixCanvasColors(visuals.accent, theme.textSubtitle, 0.18)
        : theme.textSubtitle;
    context.font = getCanvasFont('subtitle').replace('9.92px', `${SUBTITLE_FONT_SIZE * (node.bounds.height / node.node.height) * 0.72}px`);
    context.fillText(node.subtitle.text, snapTextCoordinate(node.subtitle.x), snapTextCoordinate(node.subtitle.y));
  }

  if (node.chip) {
    drawRoundedRect(
      context,
      snapStrokeCoordinate(node.chip.left, 1),
      snapStrokeCoordinate(node.chip.top, 1),
      node.chip.width,
      node.chip.height,
      node.chip.height / 2
    );
    context.fillStyle = mixCanvasColors(visuals.accent, theme.countChipBase, 0.28);
    context.strokeStyle = mixCanvasColors(
      visuals.accent,
      node.isSelected || node.isMultiSelected ? theme.countChipText : theme.countChipStroke,
      node.isSelected || node.isMultiSelected ? 0.74 : 0.52
    );
    context.lineWidth = 1;
    context.fill();
    context.stroke();
    context.fillStyle = mixCanvasColors(visuals.accent, theme.countChipText, 0.18);
    context.font = getCanvasFont('chip').replace('9.28px', `${CHIP_FONT_SIZE * (node.chip.height / 16)}px`);
    context.textAlign = 'center';
    context.fillText(node.chip.text, snapTextCoordinate(node.chip.centerX), snapTextCoordinate(node.chip.centerY));
    context.textAlign = 'start';
  }

  if (node.marker) {
    context.beginPath();
    context.arc(snapTextCoordinate(node.marker.centerX), snapTextCoordinate(node.marker.centerY), node.marker.radius, 0, Math.PI * 2);
    context.fillStyle = node.isHovered ? theme.noteMarkerHover : theme.noteMarker;
    context.strokeStyle = theme.noteMarkerBorder;
    context.lineWidth = 1;
    context.fill();
    context.stroke();
  }

  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  snapshot: CanvasSceneSnapshot,
  hostElement: HTMLDivElement
): void {
  const theme = resolveCanvasThemeColors(hostElement);
  context.clearRect(0, 0, width, height);

  snapshot.edges.forEach((edge) => {
    context.save();
    context.globalAlpha = edge.isDimmed ? 0.24 : edge.edge.accentColor ? 0.74 : 1;
    context.strokeStyle = edge.edge.accentColor ?? theme.edge;
    context.lineWidth = edge.isDimmed ? 1.75 : 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(
      snapStrokeCoordinate(edge.points.startX, context.lineWidth),
      snapStrokeCoordinate(edge.points.startY, context.lineWidth)
    );
    context.bezierCurveTo(
      snapStrokeCoordinate(edge.points.control1X, context.lineWidth),
      snapStrokeCoordinate(edge.points.control1Y, context.lineWidth),
      snapStrokeCoordinate(edge.points.control2X, context.lineWidth),
      snapStrokeCoordinate(edge.points.control2Y, context.lineWidth),
      snapStrokeCoordinate(edge.points.endX, context.lineWidth),
      snapStrokeCoordinate(edge.points.endY, context.lineWidth)
    );
    context.stroke();
    context.restore();
  });

  snapshot.nodes.forEach((node) => drawSceneNode(context, node, theme));
}

function drawSelectionHud(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  selectionBox: SelectionBox | null,
  hostElement: HTMLDivElement
): void {
  context.clearRect(0, 0, width, height);
  if (!selectionBox) {
    return;
  }

  const theme = resolveCanvasThemeColors(hostElement);
  const left = Math.min(selectionBox.startX, selectionBox.currentX);
  const top = Math.min(selectionBox.startY, selectionBox.currentY);
  const boxWidth = Math.abs(selectionBox.currentX - selectionBox.startX);
  const boxHeight = Math.abs(selectionBox.currentY - selectionBox.startY);

  context.save();
  context.fillStyle = theme.selectionBg;
  context.strokeStyle = theme.selectionBorder;
  context.lineWidth = 1;
  context.shadowColor = theme.selectionShadow;
  context.shadowBlur = 10;
  context.beginPath();
  context.roundRect(left, top, boxWidth, boxHeight, 6);
  context.fill();
  context.stroke();
  context.restore();
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hostElement: HTMLDivElement
): void {
  const theme = resolveCanvasThemeColors(hostElement);
  context.clearRect(0, 0, width, height);
  context.fillStyle = theme.canvasBg;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = theme.canvasGridLine;
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += 24) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += 24) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
    context.stroke();
  }
}

export const CanvasGraphSurface = forwardRef<CanvasGraphSurfaceHandle, CanvasGraphSurfaceProps>(function CanvasGraphSurface(
  {
    graph,
    graphBounds,
    interactionState,
    multiSelectionSet,
    onSnapshotChange,
    readNoteNodeIds,
    selection,
    selectionBox,
    viewState
  },
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef<CanvasSceneSnapshot | null>(null);
  const gridCacheKeyRef = useRef('');
  const [surfaceRect, setSurfaceRect] = useState<{ height: number; width: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getHitTargetAtClientPoint(clientX: number, clientY: number): CanvasSceneHitTarget | null {
      const host = hostRef.current;
      if (!host) {
        return null;
      }

      const rect = host.getBoundingClientRect();
      return hitTestCanvasScene(snapshotRef.current, clientX - rect.left, clientY - rect.top);
    }
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setSurfaceRect({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const gridCanvas = gridCanvasRef.current;
    const sceneCanvas = sceneCanvasRef.current;
    const hudCanvas = hudCanvasRef.current;
    if (!host || !gridCanvas || !sceneCanvas || !hudCanvas || !surfaceRect) {
      return;
    }

    const width = surfaceRect.width;
    const height = surfaceRect.height;
    const devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const gridContext = syncCanvasSize(gridCanvas, width, height, devicePixelRatio);
    const sceneContext = syncCanvasSize(sceneCanvas, width, height, devicePixelRatio);
    const hudContext = syncCanvasSize(hudCanvas, width, height, devicePixelRatio);
    if (!gridContext || !sceneContext || !hudContext) {
      return;
    }

    const rect = host.getBoundingClientRect();
    const metrics = getViewportMetricsFromRect(rect, graphBounds ?? graph);
    const theme = resolveCanvasThemeColors(host);
    const gridCacheKey = `${width}:${height}:${devicePixelRatio}:${theme.canvasBg}:${theme.canvasGridLine}`;
    if (gridCacheKeyRef.current !== gridCacheKey) {
      drawGrid(gridContext, width, height, host);
      gridCacheKeyRef.current = gridCacheKey;
    }

    if (!graph || !metrics) {
      snapshotRef.current = null;
      onSnapshotChange?.(null);
      sceneContext.clearRect(0, 0, width, height);
      drawSelectionHud(hudContext, width, height, selectionBox, host);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const snapshot = buildCanvasSceneSnapshot({
        dragPreviewOffsets: interactionState.dragPreviewOffsets,
        graph,
        hoveredNodeId: interactionState.hoveredNodeId,
        metrics,
        multiSelectionSet,
        readNoteNodeIds,
        selection,
        viewState
      });
      snapshotRef.current = snapshot;
      onSnapshotChange?.(snapshot);
      drawScene(sceneContext, width, height, snapshot, host);
      drawSelectionHud(hudContext, width, height, selectionBox, host);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    graph,
    graphBounds,
    interactionState.dragPreviewOffsets,
    interactionState.hoveredNodeId,
    multiSelectionSet,
    onSnapshotChange,
    readNoteNodeIds,
    selection,
    selectionBox,
    surfaceRect,
    viewState
  ]);

  return (
    <div className="map-canvas-stack" ref={hostRef}>
      <canvas aria-hidden="true" className="map-canvas-layer map-canvas-layer-grid" ref={gridCanvasRef} />
      <canvas aria-hidden="true" className="map-canvas-layer map-canvas-layer-scene" ref={sceneCanvasRef} />
      <canvas aria-hidden="true" className="map-canvas-layer map-canvas-layer-hud" ref={hudCanvasRef} />
    </div>
  );
});
