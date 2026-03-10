import { describe, expect, it } from 'vitest';
import {
  didGraphStructureChange,
  getGraphStructureState
} from '../features/workspace/canvas/useMapCanvasGraph';
import { withEditorGraphIndexes } from '../features/workspace/graph/graphIndexes';
import type {
  EditorGraphModel,
  EditorNodeSummary
} from '../features/workspace/graph/types';

function createNode(id: string): EditorNodeSummary {
  return {
    id,
    kind: 'checkpoint',
    label: id,
    sublabel: '',
    selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
    x: 0,
    y: 0,
    width: 100,
    height: 34,
    portInX: 0,
    portOutX: 100,
    noteMarker: false,
    hasSettings: false
  };
}

function createGraph(nodeIds: string[]): EditorGraphModel {
  return withEditorGraphIndexes({
    nodes: nodeIds.map((nodeId) => createNode(nodeId)),
    edges: [],
    warningsById: {},
    width: 800,
    height: 600
  });
}

describe('useMapCanvasGraph helpers', () => {
  it('tracks ordered node identity signatures', () => {
    const state = getGraphStructureState(createGraph(['root', 'level-0', 'level-0-cp-1']));
    expect(state.nodeCount).toBe(3);
    expect(state.nodeSignature).toBe('root|level-0|level-0-cp-1');
  });

  it('detects first render and structural changes', () => {
    const baseline = getGraphStructureState(createGraph(['root', 'level-0']));

    expect(didGraphStructureChange(null, baseline)).toBe(true);
    expect(didGraphStructureChange(baseline, getGraphStructureState(createGraph(['root', 'level-0'])))).toBe(false);
    expect(didGraphStructureChange(baseline, getGraphStructureState(createGraph(['root', 'level-1'])))).toBe(true);
    expect(didGraphStructureChange(baseline, getGraphStructureState(createGraph(['root'])))).toBe(true);
  });
});
