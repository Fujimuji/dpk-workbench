import { describe, expect, it } from 'vitest';
import type { StructuralIndexRemap } from '../domain/model/mutators/structure';
import {
  remapChildGroups,
  remapEditorSelection,
  remapFocusedCheckpointId,
  remapLayoutState,
  remapMultiSelection,
  remapNodeIds
} from '../features/workspace/structureRemap';

const REMAP: StructuralIndexRemap = {
  levelIndexMap: [1, 0],
  checkpointIndexMapByLevel: {
    0: [1, 0, 2],
    1: [0]
  }
};

describe('structure remap helpers', () => {
  it('remaps selections and focused checkpoint ids', () => {
    expect(remapEditorSelection({ kind: 'level', levelIndex: 0 }, REMAP)).toEqual({ kind: 'level', levelIndex: 1 });
    expect(
      remapEditorSelection({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 }, REMAP)
    ).toEqual({ kind: 'checkpoint', levelIndex: 1, checkpointIndex: 1 });
    expect(
      remapEditorSelection({ kind: 'haxMission', levelIndex: 0, checkpointIndex: 0, missionIndex: 2 }, REMAP)
    ).toEqual({ kind: 'haxMission', levelIndex: 1, checkpointIndex: 1, missionIndex: 2 });
    expect(remapFocusedCheckpointId('level-0-cp-1', REMAP)).toBe('level-1-cp-2');
  });

  it('remaps layout and multi-selection ids across level and checkpoint moves', () => {
    expect(
      remapLayoutState(
        {
          'level-0': { yOffset: 2 },
          'level-0-cp-1': { yOffset: 4 },
          'level-0-cp-1-haxEffects': { yOffset: 5 },
          'level-0-cp-1-haxMission-0': { yOffset: 7 },
          'level-0-cp-1-touchOrb-0': { yOffset: 6 },
          'level-0-cp-1-touchStack-0-1': { yOffset: 8 }
        },
        REMAP
      )
    ).toEqual({
      'level-1': { yOffset: 2 },
      'level-1-cp-2': { yOffset: 4 },
      'level-1-cp-2-haxEffects': { yOffset: 5 },
      'level-1-cp-2-haxMission-0': { yOffset: 7 },
      'level-1-cp-2-touchOrb-0': { yOffset: 6 },
      'level-1-cp-2-touchStack-0-1': { yOffset: 8 }
    });

    expect(remapMultiSelection(['level-0', 'level-0-cp-1', 'root'], REMAP)).toEqual([
      'level-1',
      'level-1-cp-2',
      'root'
    ]);
    expect(remapNodeIds(['level-0-cp-1-touchStack-0-1', 'level-0-cp-1', 'missing'], REMAP)).toEqual([
      'level-1-cp-2-touchStack-0-1',
      'level-1-cp-2',
      'missing'
    ]);
  });

  it('remaps child groups and drops removed items', () => {
    expect(
      remapChildGroups(
        [
          { levelIndex: 0, checkpointIndex: 0, category: 'touch', orbIndexes: [0, 1] },
          { levelIndex: 1, checkpointIndex: 0, category: 'ability', orbIndexes: [0, 1] }
        ],
        REMAP
      )
    ).toEqual([
      { levelIndex: 1, checkpointIndex: 1, category: 'touch', orbIndexes: [0, 1] },
      { levelIndex: 0, checkpointIndex: 0, category: 'ability', orbIndexes: [0, 1] }
    ]);
  });
});
