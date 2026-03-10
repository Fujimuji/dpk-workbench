import { describe, expect, it } from 'vitest';
import {
  clearWorkspaceSessionRecoverySnapshot,
  readWorkspaceSessionRecoverySnapshot,
  writeWorkspaceSessionRecoverySnapshot
} from '../app/workspaceSessionRecovery';
import {
  createWorkspaceSessionSnapshot,
  hasMeaningfulWorkspaceSessionSnapshot,
  parseWorkspaceSessionSnapshot,
  serializeWorkspaceSessionSnapshot
} from '../app/workspaceSessionSnapshot';
import type { WorkspaceSessionSnapshotPayload } from '../app/workspaceSessionSnapshot';
import { checkpoint, checkpointConfig } from './model-helpers';

function createPayload(): WorkspaceSessionSnapshotPayload {
  return {
    inputText: 'source text',
    document: {
      format: 'momentum',
      map: {
        start: { x: 0, y: 1, z: 2 },
        levels: [
          {
            name: 'Level 1',
            color: 'Aqua',
            checkpoints: [
              checkpoint({ x: 0, y: 0, z: 0 }),
              checkpoint({ x: 10, y: 0, z: 0 })
            ],
            checkpointConfigs: [checkpointConfig()]
          }
        ]
      }
    },
    warnings: [{ code: 'missing_first_level_marker', message: 'Inserted Level 1.', targetKind: 'start' }],
    readNoteNodeIds: ['level-0'],
    selection: { kind: 'level', levelIndex: 0 },
    multiSelection: ['level-0'],
    layout: { 'level-0': { yOffset: 14 } }
  };
}

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },
    removeItem(key: string): void {
      values.delete(key);
    },
    setItem(key: string, value: string): void {
      values.set(key, value);
    }
  };
}

describe('workspace session snapshot helpers', () => {
  it('serializes and parses versioned session snapshots', () => {
    const snapshot = createWorkspaceSessionSnapshot(createPayload(), 'manual-save');
    const serialized = serializeWorkspaceSessionSnapshot(snapshot);

    expect(serialized).not.toContain('storedThemeOverride');
    expect(serialized).not.toContain('resolvedTheme');
    expect(parseWorkspaceSessionSnapshot(serialized)).toEqual(snapshot);
  });

  it('rejects unsupported snapshot versions', () => {
    const snapshot = createWorkspaceSessionSnapshot(createPayload(), 'manual-save');
    const invalid = JSON.stringify({ ...snapshot, schemaVersion: 99 });

    expect(() => parseWorkspaceSessionSnapshot(invalid)).toThrow('Unsupported session file version 99.');
  });

  it('accepts legacy snapshot payloads that still include focus fields', () => {
    const snapshot = createWorkspaceSessionSnapshot(createPayload(), 'manual-save');
    const legacySerialized = JSON.stringify({
      ...snapshot,
      focusedCheckpointId: 'level-0-cp-1',
      isFocusModeEnabled: true
    });

    expect(parseWorkspaceSessionSnapshot(legacySerialized)).toEqual(snapshot);
  });

  it('accepts schema version 2 snapshots for backward compatibility', () => {
    const snapshot = createWorkspaceSessionSnapshot(createPayload(), 'manual-save');
    const legacySerialized = JSON.stringify({
      ...snapshot,
      schemaVersion: 2
    });

    expect(parseWorkspaceSessionSnapshot(legacySerialized)).toEqual({
      ...snapshot,
      schemaVersion: 2
    });
  });

  it('parses the full current editor selection union in saved snapshots', () => {
    const selections: WorkspaceSessionSnapshotPayload['selection'][] = [
      { kind: 'momentumEntities', levelIndex: 0, checkpointIndex: 0 },
      { kind: 'impulse', levelIndex: 0, checkpointIndex: 0, impulseIndex: 0 },
      { kind: 'portal', levelIndex: 0, checkpointIndex: 0, portalIndex: 0 },
      { kind: 'haxSpawnEffects' },
      { kind: 'haxSpawnEffect', effectIndex: 1 },
      { kind: 'haxSpawnPortalPair', effectIndex: 1, pairEffectIndex: 2 },
      { kind: 'haxSpawnZiplinePair', effectIndex: 3, pairEffectIndex: 4 },
      { kind: 'haxZiplinePair', levelIndex: 0, checkpointIndex: 0, effectIndex: 5, pairEffectIndex: 6 }
    ];

    selections.forEach((selection) => {
      const snapshot = createWorkspaceSessionSnapshot(
        {
          ...createPayload(),
          selection
        },
        'manual-save'
      );

      expect(parseWorkspaceSessionSnapshot(serializeWorkspaceSessionSnapshot(snapshot))).toEqual(snapshot);
    });
  });

  it('recognizes meaningful payloads and persists recovery snapshots', () => {
    const storage = createMemoryStorage();
    const snapshot = createWorkspaceSessionSnapshot(createPayload(), 'autosave');

    expect(hasMeaningfulWorkspaceSessionSnapshot(createPayload())).toBe(true);
    expect(writeWorkspaceSessionRecoverySnapshot(snapshot, storage)).toBe(true);
    expect(readWorkspaceSessionRecoverySnapshot(storage)).toEqual(snapshot);
    expect(clearWorkspaceSessionRecoverySnapshot(storage)).toBe(true);
    expect(readWorkspaceSessionRecoverySnapshot(storage)).toBeNull();
  });
});
