import { describe, expect, it } from 'vitest';
import {
  getCheckpointId,
  getCheckpointIdFromSelection,
  getChildCategoryFromSocket,
  getSelectionPath,
  isStackNodeKind
} from '../features/workspace/canvas/selection';

describe('canvas selection helpers', () => {
  it('builds and reads checkpoint ids from selections', () => {
    expect(getCheckpointId(1, 2)).toBe('level-1-cp-3');
    expect(getCheckpointIdFromSelection({ kind: 'checkpoint', levelIndex: 1, checkpointIndex: 2 })).toBe(
      'level-1-cp-3'
    );
    expect(getCheckpointIdFromSelection({ kind: 'momentumEntities', levelIndex: 1, checkpointIndex: 2 })).toBe(
      'level-1-cp-3'
    );
    expect(getCheckpointIdFromSelection({ kind: 'haxMission', levelIndex: 1, checkpointIndex: 2, missionIndex: 0 })).toBe(
      'level-1-cp-3'
    );
    expect(getCheckpointIdFromSelection({ kind: 'haxSpawnEffect', effectIndex: 0 })).toBeNull();
    expect(getCheckpointIdFromSelection({ kind: 'start' })).toBeNull();
  });

  it('maps socket kinds and display labels', () => {
    expect(getChildCategoryFromSocket('touch')).toBe('touch');
    expect(getChildCategoryFromSocket('bot')).toBeNull();
    expect(getSelectionPath(null)).toBe('No selection');
    expect(getSelectionPath({ kind: 'abilityOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 1 })).toBe(
      'Ability Orb 2'
    );
    expect(getSelectionPath({ kind: 'momentumEntities', levelIndex: 0, checkpointIndex: 0 })).toBe('Entities');
    expect(getSelectionPath({ kind: 'haxPortalPair', levelIndex: 0, checkpointIndex: 0, effectIndex: 1, pairEffectIndex: 2 })).toBe(
      'Portal Pair'
    );
    expect(getSelectionPath({ kind: 'haxSpawnEffects' })).toBe('Spawn Effects');
    expect(getSelectionPath({ kind: 'haxEffects', levelIndex: 0, checkpointIndex: 0 })).toBe('Effects');
    expect(getSelectionPath({ kind: 'haxMission', levelIndex: 0, checkpointIndex: 0, missionIndex: 1 })).toBe('Mission 2');
    expect(isStackNodeKind('abilityStack')).toBe(true);
    expect(isStackNodeKind('abilityOrb')).toBe(false);
  });
});
