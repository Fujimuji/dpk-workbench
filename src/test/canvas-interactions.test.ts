import { describe, expect, it } from 'vitest';
import {
  applySingleNodeDragLayout,
  createRafBatcher,
  applyGroupDragLayout,
  buildDragPreviewOffsets,
  didPointerMoveEnough,
  getNodeDragTargetIds,
  getIntersectedNodes
} from '../features/workspace/canvas/useCanvasInteractions';
import { withEditorGraphIndexes } from '../features/workspace/graph/graphIndexes';
import type { ViewportMetrics } from '../features/workspace/canvas/useCanvasViewport';
import type {
  EditorGraphModel,
  EditorViewState
} from '../features/workspace/graph/types';

const BASE_VIEW_STATE: EditorViewState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0
};

const VIEWPORT_METRICS: ViewportMetrics = {
  rect: { left: 0, top: 0, width: 200, height: 100 } as DOMRect,
  renderScale: 1,
  offsetLeft: 0,
  offsetTop: 0
};

const GRAPH: EditorGraphModel = withEditorGraphIndexes({
  nodes: [
    {
      id: 'cp-1',
      kind: 'checkpoint',
      label: 'Checkpoint 1',
      sublabel: '',
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      x: 10,
      y: 20,
      width: 24,
      height: 12,
      portInX: 10,
      portOutX: 34,
      noteMarker: false,
      hasSettings: true
    },
    {
      id: 'cp-2',
      kind: 'checkpoint',
      label: 'Checkpoint 2',
      sublabel: '',
      selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 1 },
      x: 100,
      y: 60,
      width: 24,
      height: 12,
      portInX: 100,
      portOutX: 124,
      noteMarker: false,
      hasSettings: true
    }
  ],
  edges: [],
  warningsById: {},
  width: 200,
  height: 100
});

describe('canvas interaction helpers', () => {
  it('batches burst updates to the latest value per animation frame and flushes on demand', () => {
    let callback: ((time: number) => void) | null = null;
    const flushed: number[] = [];
    const batcher = createRafBatcher<number>(
      (value) => {
        flushed.push(value);
      },
      (nextCallback) => {
        callback = nextCallback;
        return 1;
      },
      () => {
        callback = null;
      }
    );

    batcher.schedule(1);
    batcher.schedule(2);
    batcher.schedule(3);
    expect(flushed).toEqual([]);

    const scheduledCallback = callback;
    if (!scheduledCallback) {
      throw new Error('Expected a queued animation frame callback.');
    }

    (scheduledCallback as (time: number) => void)(16.7);
    expect(flushed).toEqual([3]);

    batcher.schedule(4);
    batcher.schedule(5);
    batcher.flush();
    expect(flushed).toEqual([3, 5]);
  });

  it('finds nodes intersecting a marquee box', () => {
    const intersected = getIntersectedNodes(
      GRAPH,
      { left: 8, top: 12, width: 32, height: 18 },
      VIEWPORT_METRICS,
      BASE_VIEW_STATE
    );

    expect(intersected.map((node) => node.id)).toEqual(['cp-1']);
  });

  it('applies grouped drag deltas from original positions', () => {
    const nextLayout = applyGroupDragLayout(
      { untouched: { yOffset: 2 } },
      ['cp-1', 'cp-2'],
      {
        'cp-1': 20,
        'cp-2': 40
      },
      -3
    );

    expect(nextLayout).toEqual({
      untouched: { yOffset: 2 },
      'cp-1': { yOffset: 17 },
      'cp-2': { yOffset: 37 }
    });
  });

  it('builds transient drag previews and commits layout only from the drag result', () => {
    expect(buildDragPreviewOffsets('cp-1', 12)).toEqual({ 'cp-1': 12 });
    expect(buildDragPreviewOffsets('cp-1', -4, ['cp-1', 'cp-2'])).toEqual({ 'cp-1': -4, 'cp-2': -4 });
    expect(applySingleNodeDragLayout({ 'cp-1': { yOffset: 6 } }, 'cp-1', 6, -6)).toEqual({});
  });

  it('treats tiny pointer motion as a click but suppresses click after a real drag', () => {
    expect(didPointerMoveEnough(10, 10, 11, 11)).toBe(false);
    expect(didPointerMoveEnough(10, 10, 14, 10)).toBe(true);
  });

  it('drags a node together with its full rendered subtree', () => {
    const graphWithChild: EditorGraphModel = withEditorGraphIndexes({
      ...GRAPH,
      nodes: [
        ...GRAPH.nodes,
        {
          id: 'cp-1-touch-0',
          kind: 'touchOrb',
          label: 'Touch Orb 1',
          sublabel: '',
          selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0,
          orbIndex: 0,
          parentId: 'cp-1',
          x: 60,
          y: 20,
          width: 24,
          height: 12,
          portInX: 60,
          portOutX: 84,
          noteMarker: false,
          hasSettings: false
        },
        {
          id: 'cp-1-effects',
          kind: 'haxEffects',
          label: 'Effects',
          sublabel: '',
          selection: { kind: 'haxEffects', levelIndex: 0, checkpointIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0,
          parentId: 'cp-1',
          x: 60,
          y: 36,
          width: 24,
          height: 12,
          portInX: 60,
          portOutX: 84,
          noteMarker: false,
          hasSettings: false
        },
        {
          id: 'cp-1-effect-0',
          kind: 'haxEffect',
          label: 'Effect 1',
          sublabel: '',
          selection: { kind: 'haxEffect', levelIndex: 0, checkpointIndex: 0, effectIndex: 0 },
          levelIndex: 0,
          checkpointIndex: 0,
          parentId: 'cp-1-effects',
          x: 92,
          y: 36,
          width: 24,
          height: 12,
          portInX: 92,
          portOutX: 116,
          noteMarker: false,
          hasSettings: false
        }
      ]
    });

    expect(
      getNodeDragTargetIds(graphWithChild, graphWithChild.nodes[0], [], false, new Set())
    ).toEqual(['cp-1', 'cp-1-touch-0', 'cp-1-effects', 'cp-1-effect-0']);
  });
});
