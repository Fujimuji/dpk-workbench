import { describe, expect, it } from 'vitest';
import { buildCanvasSceneSnapshot, hitTestCanvasScene } from '../features/workspace/canvas/buildCanvasSceneSnapshot';
import type { ViewportMetrics } from '../features/workspace/canvas/useCanvasViewport';
import { withEditorGraphIndexes } from '../features/workspace/graph/graphIndexes';
import { EMPTY_EDGE_BEZIER, type EditorGraphModel } from '../features/workspace/graph/types';

const METRICS: ViewportMetrics = {
  rect: new DOMRect(0, 0, 400, 240),
  renderScale: 1,
  offsetLeft: 0,
  offsetTop: 0
};

function createGraph(): EditorGraphModel {
  return withEditorGraphIndexes({
    nodes: [
      {
        id: 'root',
        kind: 'start',
        label: 'Spawn',
        sublabel: 'Start position',
        selection: { kind: 'start' },
        x: 20,
        y: 40,
        width: 120,
        height: 38,
        portInX: 20,
        portOutX: 140,
        noteMarker: true,
        hasSettings: false,
        accentColor: '#95d9ff'
      },
      {
        id: 'touch-1',
        kind: 'touchOrb',
        label: 'Touch Orb 1',
        sublabel: '',
        selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 },
        x: 200,
        y: 100,
        width: 120,
        height: 34,
        portInX: 200,
        portOutX: 320,
        noteMarker: false,
        hasSettings: false,
        accentColor: '#358cb5',
        accentSoftColor: 'rgba(53, 140, 181, 0.22)'
      }
    ],
    edges: [
      {
        id: 'edge-root-touch-1',
        fromId: 'root',
        toId: 'touch-1',
        bezier: {
          ...EMPTY_EDGE_BEZIER,
          startX: 140,
          startY: 40,
          control1X: 180,
          control1Y: 40,
          control2X: 180,
          control2Y: 100,
          endX: 200,
          endY: 100
        }
      }
    ],
    warningsById: {
      root: [{ code: 'unsupported_payload', message: 'Root note', targetKind: 'start' }],
      'touch-1': []
    },
    width: 360,
    height: 180
  });
}

describe('canvas scene snapshot', () => {
  it('builds projected node bounds, labels, and note markers', () => {
    const snapshot = buildCanvasSceneSnapshot({
      dragPreviewOffsets: { 'touch-1': 12 },
      graph: createGraph(),
      hoveredNodeId: 'touch-1',
      metrics: METRICS,
      multiSelectionSet: new Set(['touch-1']),
      readNoteNodeIds: new Set<string>(),
      selection: null,
      viewState: { scale: 1, offsetX: 0, offsetY: 0 }
    });

    expect(snapshot.nodes).toHaveLength(2);
    expect(snapshot.nodes[0]?.marker).not.toBeNull();
    expect(snapshot.nodes[1]?.chip).toBeNull();
    expect(snapshot.nodes[1]?.isHovered).toBe(true);
    expect(snapshot.nodes[1]?.effectiveY).toBe(112);
    expect(snapshot.edges[0]?.points.endY).toBe(112);
  });

  it('hit-tests note markers before node bodies', () => {
    const snapshot = buildCanvasSceneSnapshot({
      dragPreviewOffsets: {},
      graph: createGraph(),
      hoveredNodeId: null,
      metrics: METRICS,
      multiSelectionSet: new Set<string>(),
      readNoteNodeIds: new Set<string>(),
      selection: { kind: 'start' },
      viewState: { scale: 1, offsetX: 0, offsetY: 0 }
    });

    const marker = snapshot.nodes[0]?.marker;
    if (!marker) {
      throw new Error('Expected a note marker on the first node.');
    }

    const hit = hitTestCanvasScene(snapshot, marker.centerX, marker.centerY);
    expect(hit?.kind).toBe('noteMarker');
    expect(hit?.node.id).toBe('root');
  });
});
