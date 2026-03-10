import { describe, expect, it } from 'vitest';
import { resolveEntitySpawnPosition } from '../features/workspace/canvas/resolveEntitySpawnPosition';
import { EDITOR_CHILD_INDENT, EDITOR_CHILD_ROW_GAP } from '../features/workspace/graph/buildEditorGraph';
import { withEditorGraphIndexes } from '../features/workspace/graph/graphIndexes';
import type { EditorGraphModel, EditorNodeSummary } from '../features/workspace/graph/types';

function createCheckpointNode(): EditorNodeSummary {
  return {
    id: 'level-0-cp-1',
    kind: 'checkpoint',
    label: 'Checkpoint 1',
    sublabel: 'Start',
    selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
    levelIndex: 0,
    checkpointIndex: 0,
    x: 100,
    y: 200,
    width: 120,
    height: 38,
    portInX: 100,
    portOutX: 220,
    noteMarker: false,
    hasSettings: true
  };
}

function createGraph(nodes: EditorNodeSummary[]): EditorGraphModel {
  return withEditorGraphIndexes({
    nodes,
    edges: [],
    warningsById: {},
    width: 1000,
    height: 1000
  });
}

describe('resolveEntitySpawnPosition', () => {
  it('uses the canonical slot when it is free', () => {
    const parentNode = createCheckpointNode();
    const position = resolveEntitySpawnPosition(createGraph([parentNode]), parentNode, 'touchOrb');

    expect(position).toEqual({
      x: parentNode.x + EDITOR_CHILD_INDENT,
      y: parentNode.y
    });
  });

  it('chooses the nearest free slot when the preferred slot is occupied', () => {
    const parentNode = createCheckpointNode();
    const blockingNode: EditorNodeSummary = {
      id: 'level-0-cp-1-touchOrb-0',
      kind: 'touchOrb',
      label: 'Touch Orb 1',
      sublabel: '',
      selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 },
      levelIndex: 0,
      checkpointIndex: 0,
      orbIndex: 0,
      parentId: parentNode.id,
      x: parentNode.x + EDITOR_CHILD_INDENT,
      y: parentNode.y,
      width: 110,
      height: 34,
      portInX: parentNode.x + EDITOR_CHILD_INDENT,
      portOutX: parentNode.x + EDITOR_CHILD_INDENT + 110,
      noteMarker: false,
      hasSettings: false
    };
    const position = resolveEntitySpawnPosition(createGraph([parentNode, blockingNode]), parentNode, 'touchOrb');

    expect(position.x).toBe(parentNode.x + EDITOR_CHILD_INDENT);
    expect(position.y).toBe(parentNode.y + EDITOR_CHILD_ROW_GAP * 1.5);
  });
});
