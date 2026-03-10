import { describe, expect, it } from 'vitest';
import { getCompatibleChildGroupsFromNodes } from '../features/workspace/childGroups';
import type { EditorNodeSummary } from '../features/workspace/graph/types';

function createNode(
  id: string,
  kind: EditorNodeSummary['kind'],
  levelIndex: number,
  checkpointIndex: number,
  orbIndex?: number
): EditorNodeSummary {
  return {
    id,
    kind,
    label: id,
    sublabel: '',
    selection:
      kind === 'touchOrb'
        ? { kind: 'touchOrb', levelIndex, checkpointIndex, orbIndex: orbIndex ?? 0 }
        : kind === 'abilityOrb'
          ? { kind: 'abilityOrb', levelIndex, checkpointIndex, orbIndex: orbIndex ?? 0 }
          : kind === 'lavaOrb'
            ? { kind: 'lavaOrb', levelIndex, checkpointIndex, orbIndex: orbIndex ?? 0 }
            : { kind: 'checkpoint', levelIndex, checkpointIndex },
    levelIndex,
    checkpointIndex,
    orbIndex,
    x: 0,
    y: 0,
    width: 100,
    height: 24,
    portInX: 0,
    portOutX: 100,
    noteMarker: false,
    hasSettings: false
  };
}

describe('child group helpers', () => {
  it('builds separate compatible groups from one mixed selection', () => {
    const groups = getCompatibleChildGroupsFromNodes([
      createNode('lava-0', 'lavaOrb', 0, 0, 0),
      createNode('ability-0', 'abilityOrb', 0, 0, 0),
      createNode('lava-1', 'lavaOrb', 0, 0, 1),
      createNode('ability-1', 'abilityOrb', 0, 0, 1)
    ]);

    expect(groups).toEqual([
      { levelIndex: 0, checkpointIndex: 0, category: 'lava', orbIndexes: [0, 1] },
      { levelIndex: 0, checkpointIndex: 0, category: 'ability', orbIndexes: [0, 1] }
    ]);
  });

  it('ignores incompatible leftovers instead of blocking valid groups', () => {
    const groups = getCompatibleChildGroupsFromNodes([
      createNode('ability-0', 'abilityOrb', 0, 0, 0),
      createNode('ability-1', 'abilityOrb', 0, 0, 1),
      createNode('touch-0', 'touchOrb', 0, 0, 0)
    ]);

    expect(groups).toEqual([
      { levelIndex: 0, checkpointIndex: 0, category: 'ability', orbIndexes: [0, 1] }
    ]);
  });
});
