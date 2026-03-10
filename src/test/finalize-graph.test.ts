import { describe, expect, it } from 'vitest';
import {
  applyFocusMode,
  buildEdgeGeometry,
  getGraphDimensions,
  resolveEdgeGeometryWithCache
} from '../features/workspace/graph/finalizeGraph';
import { buildEditorGraphIndexes } from '../features/workspace/graph/graphIndexes';
import { EMPTY_EDGE_BEZIER, type EditorEdge, type EditorNodeSummary } from '../features/workspace/graph/types';

function createNode(overrides: Partial<EditorNodeSummary> & Pick<EditorNodeSummary, 'id' | 'kind'>): EditorNodeSummary {
  return {
    label: overrides.label ?? overrides.id,
    sublabel: overrides.sublabel ?? '',
    selection: overrides.selection ?? { kind: 'start' },
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 20,
    height: overrides.height ?? 10,
    portInX: overrides.portInX ?? (overrides.x ?? 0),
    portOutX: overrides.portOutX ?? ((overrides.x ?? 0) + (overrides.width ?? 20)),
    noteMarker: overrides.noteMarker ?? false,
    hasSettings: overrides.hasSettings ?? false,
    ...overrides,
    id: overrides.id,
    kind: overrides.kind
  };
}

describe('finalizeGraph helpers', () => {
  it('dims nodes and edges outside the focus cluster', () => {
    const root = createNode({ id: 'root', kind: 'start' });
    const level = createNode({ id: 'level-0', kind: 'level', levelIndex: 0 });
    const checkpoint = createNode({
      id: 'level-0-cp-1',
      kind: 'checkpoint',
      levelIndex: 0,
      checkpointIndex: 0
    });
    const child = createNode({
      id: 'level-0-cp-1-touchOrb-0',
      kind: 'touchOrb',
      parentId: 'level-0-cp-1'
    });
    const otherLevel = createNode({ id: 'level-1', kind: 'level', levelIndex: 1 });
    const nodes = [root, level, checkpoint, child, otherLevel];
    const edges: EditorEdge[] = [
      { id: 'edge-1', fromId: 'level-0', toId: 'level-0-cp-1', bezier: { ...EMPTY_EDGE_BEZIER } },
      { id: 'edge-2', fromId: 'root', toId: 'level-1', bezier: { ...EMPTY_EDGE_BEZIER } }
    ];
    const { childrenById, nodeById } = buildEditorGraphIndexes(nodes);

    applyFocusMode(nodes, edges, nodeById, childrenById, 'level-0-cp-1', true);

    expect(root.isDimmed).toBe(false);
    expect(level.isDimmed).toBe(false);
    expect(checkpoint.isDimmed).toBe(false);
    expect(child.isDimmed).toBe(false);
    expect(otherLevel.isDimmed).toBe(true);
    expect(edges[0].isDimmed).toBe(false);
    expect(edges[1].isDimmed).toBe(false);
  });

  it('keeps nested wrapper descendants visible for focused checkpoints', () => {
    const root = createNode({ id: 'root', kind: 'start' });
    const level = createNode({ id: 'level-0', kind: 'level', levelIndex: 0, parentId: 'root' });
    const checkpoint = createNode({
      id: 'level-0-cp-1',
      kind: 'checkpoint',
      levelIndex: 0,
      checkpointIndex: 0,
      parentId: 'level-0'
    });
    const effectsWrapper = createNode({
      id: 'level-0-cp-1-haxEffects',
      kind: 'haxEffects',
      levelIndex: 0,
      checkpointIndex: 0,
      parentId: 'level-0-cp-1'
    });
    const effectNode = createNode({
      id: 'level-0-cp-1-haxEffect-0',
      kind: 'haxEffect',
      levelIndex: 0,
      checkpointIndex: 0,
      parentId: 'level-0-cp-1-haxEffects'
    });
    const missionsWrapper = createNode({
      id: 'level-0-cp-1-haxMissions',
      kind: 'haxMissions',
      levelIndex: 0,
      checkpointIndex: 0,
      parentId: 'level-0-cp-1'
    });
    const missionNode = createNode({
      id: 'level-0-cp-1-haxMission-0',
      kind: 'haxMission',
      levelIndex: 0,
      checkpointIndex: 0,
      parentId: 'level-0-cp-1-haxMissions'
    });
    const otherLevel = createNode({ id: 'level-1', kind: 'level', levelIndex: 1, parentId: 'root' });
    const nodes = [root, level, checkpoint, effectsWrapper, effectNode, missionsWrapper, missionNode, otherLevel];
    const edges: EditorEdge[] = [
      { id: 'edge-1', fromId: 'root', toId: 'level-0', bezier: { ...EMPTY_EDGE_BEZIER } },
      { id: 'edge-2', fromId: 'level-0', toId: 'level-0-cp-1', bezier: { ...EMPTY_EDGE_BEZIER } },
      { id: 'edge-3', fromId: 'level-0-cp-1', toId: 'level-0-cp-1-haxEffects', bezier: { ...EMPTY_EDGE_BEZIER } },
      { id: 'edge-4', fromId: 'level-0-cp-1-haxEffects', toId: 'level-0-cp-1-haxEffect-0', bezier: { ...EMPTY_EDGE_BEZIER } },
      { id: 'edge-5', fromId: 'level-0-cp-1', toId: 'level-0-cp-1-haxMissions', bezier: { ...EMPTY_EDGE_BEZIER } },
      { id: 'edge-6', fromId: 'level-0-cp-1-haxMissions', toId: 'level-0-cp-1-haxMission-0', bezier: { ...EMPTY_EDGE_BEZIER } }
    ];
    const { childrenById, nodeById } = buildEditorGraphIndexes(nodes);

    applyFocusMode(nodes, edges, nodeById, childrenById, 'level-0-cp-1', true);

    expect(root.isDimmed).toBe(false);
    expect(level.isDimmed).toBe(false);
    expect(checkpoint.isDimmed).toBe(false);
    expect(effectsWrapper.isDimmed).toBe(false);
    expect(effectNode.isDimmed).toBe(false);
    expect(missionsWrapper.isDimmed).toBe(false);
    expect(missionNode.isDimmed).toBe(false);
    expect(otherLevel.isDimmed).toBe(true);
  });

  it('computes edge bezier geometry and graph bounds from node positions', () => {
    const from = createNode({ id: 'root', kind: 'start', x: 10, y: 10, width: 20 });
    const to = createNode({
      id: 'level-0',
      kind: 'level',
      selection: { kind: 'level', levelIndex: 0 },
      x: 100,
      y: 30,
      width: 40,
      overlayWidth: 300
    });

    expect(buildEdgeGeometry(from, to)).toMatchObject({
      startX: 30,
      startY: 10,
      endX: 100,
      endY: 30
    });

    const dimensions = getGraphDimensions([from, to]);
    expect(dimensions.width).toBeGreaterThan(130);
    expect(dimensions.height).toBeGreaterThan(30);
  });

  it('reuses cached edge geometry until endpoint coordinates change', () => {
    const from = createNode({ id: 'from', kind: 'start', x: 20, y: 40, width: 30 });
    const to = createNode({ id: 'to', kind: 'level', x: 120, y: 60, width: 30 });
    const first = resolveEdgeGeometryWithCache('edge-cache-test', from, to);
    const second = resolveEdgeGeometryWithCache('edge-cache-test', from, to);

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.bezier).toEqual(first.bezier);

    const movedTarget = createNode({ ...to, x: 150, portInX: 150, portOutX: 180 });
    const third = resolveEdgeGeometryWithCache('edge-cache-test', from, movedTarget);
    expect(third.reused).toBe(false);
    expect(third.bezier).not.toEqual(second.bezier);
  });
});
