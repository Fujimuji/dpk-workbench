import { describe, expect, it } from 'vitest';
import type { StructuralIndexRemap } from '../domain/model/mutators/structure';
import {
  getCheckpointNodeId,
  getSelectionNodeId,
  parseEditorNodeId,
  remapEditorNodeId
} from '../features/workspace/graph/nodeIds';

const REMAP: StructuralIndexRemap = {
  levelIndexMap: [1, 0],
  checkpointIndexMapByLevel: {
    0: [1, 0, 2],
    1: [0]
  }
};

describe('workspace node id helpers', () => {
  it('builds checkpoint ids with one-based checkpoint numbers', () => {
    expect(getCheckpointNodeId(2, 0)).toBe('level-2-cp-1');
    expect(getCheckpointNodeId(2, 3)).toBe('level-2-cp-4');
  });

  it('maps selections to stable node ids', () => {
    expect(getSelectionNodeId({ kind: 'start' })).toBe('root');
    expect(getSelectionNodeId({ kind: 'haxSpawnEffects' })).toBe('root-haxEffects');
    expect(getSelectionNodeId({ kind: 'haxSpawnEffect', effectIndex: 2 })).toBe('root-haxEffect-2');
    expect(getSelectionNodeId({ kind: 'haxSpawnPortalPair', effectIndex: 1, pairEffectIndex: 2 })).toBe('root-haxPortalPair-1-2');
    expect(getSelectionNodeId({ kind: 'level', levelIndex: 1 })).toBe('level-1');
    expect(getSelectionNodeId({ kind: 'checkpoint', levelIndex: 0, checkpointIndex: 2 })).toBe('level-0-cp-3');
    expect(getSelectionNodeId({ kind: 'momentumEntities', levelIndex: 0, checkpointIndex: 2 })).toBe('level-0-cp-3-momentumEntities');
    expect(getSelectionNodeId({ kind: 'impulse', levelIndex: 0, checkpointIndex: 2, impulseIndex: 4 })).toBe(
      'level-0-cp-3-impulse-4'
    );
    expect(getSelectionNodeId({ kind: 'portal', levelIndex: 0, checkpointIndex: 2, portalIndex: 0 })).toBe(
      'level-0-cp-3-portal-0'
    );
    expect(getSelectionNodeId({ kind: 'haxEffects', levelIndex: 0, checkpointIndex: 2 })).toBe('level-0-cp-3-haxEffects');
    expect(getSelectionNodeId({ kind: 'haxMissions', levelIndex: 0, checkpointIndex: 2 })).toBe('level-0-cp-3-haxMissions');
    expect(getSelectionNodeId({ kind: 'haxMission', levelIndex: 0, checkpointIndex: 2, missionIndex: 1 })).toBe('level-0-cp-3-haxMission-1');
    expect(getSelectionNodeId({ kind: 'touchOrb', levelIndex: 0, checkpointIndex: 2, orbIndex: 4 })).toBe(
      'level-0-cp-3-touchOrb-4'
    );
    expect(getSelectionNodeId({ kind: 'bot', levelIndex: 0, checkpointIndex: 2 })).toBe('level-0-cp-3-bot');
    expect(getSelectionNodeId({ kind: 'haxEffect', levelIndex: 0, checkpointIndex: 2, effectIndex: 4 })).toBe(
      'level-0-cp-3-haxEffect-4'
    );
    expect(
      getSelectionNodeId({
        kind: 'haxPortalPair',
        levelIndex: 0,
        checkpointIndex: 2,
        effectIndex: 4,
        pairEffectIndex: 5
      })
    ).toBe('level-0-cp-3-haxPortalPair-4-5');
  });

  it('parses current node id shapes and remaps structural ids without changing their string formats', () => {
    expect(parseEditorNodeId('root')).toEqual({ kind: 'root' });
    expect(parseEditorNodeId('root-haxEffects')).toEqual({ kind: 'haxSpawnEffects' });
    expect(parseEditorNodeId('root-haxEffect-2')).toEqual({ kind: 'haxSpawnEffect', effectIndex: 2 });
    expect(parseEditorNodeId('root-haxPortalPair-1-2')).toEqual({
      kind: 'haxSpawnPair',
      pairKind: 'haxPortalPair',
      effectIndex: 1,
      pairEffectIndex: 2
    });
    expect(parseEditorNodeId('level-0-cp-3-momentumEntities')).toEqual({
      kind: 'momentumEntities',
      levelIndex: 0,
      checkpointIndex: 2
    });
    expect(parseEditorNodeId('level-0-cp-3-impulse-4')).toEqual({
      kind: 'impulse',
      levelIndex: 0,
      checkpointIndex: 2,
      impulseIndex: 4
    });
    expect(parseEditorNodeId('level-0-cp-3-portal-0')).toEqual({
      kind: 'portal',
      levelIndex: 0,
      checkpointIndex: 2,
      portalIndex: 0
    });
    expect(parseEditorNodeId('level-0-cp-3-haxZiplinePair-4-5')).toEqual({
      kind: 'haxPair',
      pairKind: 'haxZiplinePair',
      levelIndex: 0,
      checkpointIndex: 2,
      effectIndex: 4,
      pairEffectIndex: 5
    });
    expect(parseEditorNodeId('level-0-cp-3-touchStack-0-1')).toEqual({
      kind: 'stack',
      levelIndex: 0,
      checkpointIndex: 2,
      stackKind: 'touchStack',
      memberSuffix: '0-1'
    });
    expect(parseEditorNodeId('level-0-cp-3-haxEffectStack-0__1')).toEqual({
      kind: 'haxEffectStack',
      levelIndex: 0,
      checkpointIndex: 2,
      stackKey: '0__1'
    });

    expect(remapEditorNodeId('level-0', REMAP)).toBe('level-1');
    expect(remapEditorNodeId('level-0-cp-1', REMAP)).toBe('level-1-cp-2');
    expect(remapEditorNodeId('level-0-cp-1-momentumEntities', REMAP)).toBe('level-1-cp-2-momentumEntities');
    expect(remapEditorNodeId('level-0-cp-1-impulse-3', REMAP)).toBe('level-1-cp-2-impulse-3');
    expect(remapEditorNodeId('level-0-cp-1-portal-0', REMAP)).toBe('level-1-cp-2-portal-0');
    expect(remapEditorNodeId('level-0-cp-1-haxEffect-3', REMAP)).toBe('level-1-cp-2-haxEffect-3');
    expect(remapEditorNodeId('level-0-cp-1-haxPortalPair-3-4', REMAP)).toBe('level-1-cp-2-haxPortalPair-3-4');
    expect(remapEditorNodeId('level-0-cp-1-touchStack-0-1', REMAP)).toBe('level-1-cp-2-touchStack-0-1');
    expect(remapEditorNodeId('root-haxPortalPair-1-2', REMAP)).toBe('root-haxPortalPair-1-2');
    expect(remapEditorNodeId('missing-node', REMAP)).toBe('missing-node');
  });
});
