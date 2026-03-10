import { describe, expect, it } from 'vitest';
import type { WorkspaceDocument } from '../domain/document/types';
import type { HaxDocument } from '../domain/import/hax/types';
import type { ConversionWarning } from '../domain/warnings/types';
import {
  createCommandPaletteNodeEntries,
  filterCommandPaletteEntries
} from '../features/workspace/canvas/commandPalette';
import { buildWorkspaceDocumentIndex } from '../features/workspace/documentIndex';
import { checkpoint, checkpointConfig } from './model-helpers';

function createDocument(): WorkspaceDocument {
  return {
    format: 'momentum',
    map: {
      start: { x: 0, y: 0, z: 0 },
      levels: [
        {
          name: 'Level 1',
          color: 'Aqua',
          checkpoints: [
            checkpoint({ x: 10, y: 10, z: 10 }),
            checkpoint({ x: 20, y: 20, z: 20 })
          ],
          checkpointConfigs: [
            checkpointConfig({
              abilityOrbs: [
                {
                  position: { x: 1, y: 2, z: 3 },
                  radius: 4,
                  abilities: {
                    powerblock: true,
                    rocketPunch: false,
                    seismicSlam: false
                  }
                }
              ]
            })
          ]
        }
      ]
    }
  };
}

function createHaxDocument(): HaxDocument {
  return {
    format: 'hax',
    spawn: {
      position: { x: 0, y: 0, z: 0 },
      radius: 2,
      viewAngle: 0,
      isLevelStart: false,
      prime: {
        rocketPunchDisabled: false,
        powerblockDisabled: false,
        seismicSlamDisabled: false,
        centerlessCheckpoint: false,
        effectLock: false,
        extraFactors: []
      },
      missions: [],
      abilityCount: null,
      teleport: null,
      timeTrialMinimum: null,
      effects: [],
      fakeUpper: false
    },
    checkpoints: [
      {
        position: { x: 10, y: 0, z: 0 },
        radius: 2,
        viewAngle: 0,
        isLevelStart: true,
        prime: {
          rocketPunchDisabled: false,
          powerblockDisabled: false,
          seismicSlamDisabled: false,
          centerlessCheckpoint: false,
          effectLock: false,
          extraFactors: []
        },
        missions: [],
        abilityCount: null,
        teleport: null,
        timeTrialMinimum: null,
        effects: [],
        fakeUpper: false
      }
    ]
  };
}

describe('buildWorkspaceDocumentIndex', () => {
  it('keeps navigator ordering and ancestry without canvas geometry', () => {
    const index = buildWorkspaceDocumentIndex(createDocument(), []);

    expect(index?.orderedIds).toEqual([
      'root',
      'level-0',
      'level-0-cp-1',
      'level-0-cp-1-momentumEntities',
      'level-0-cp-1-abilityOrb-0',
      'level-0-cp-2'
    ]);
    expect(index?.ancestorIdsById['level-0-cp-1-abilityOrb-0']).toEqual([
      'root',
      'level-0',
      'level-0-cp-1',
      'level-0-cp-1-momentumEntities'
    ]);
    expect(index?.childrenById['level-0-cp-1']).toEqual(['level-0-cp-1-momentumEntities']);
    expect(index?.childrenById['level-0-cp-1-momentumEntities']).toEqual(['level-0-cp-1-abilityOrb-0']);
    expect(index?.childrenById['level-0-cp-2']).toBeUndefined();
  });

  it('retains warning aggregation and hidden-scope search entries from the index alone', () => {
    const warnings: ConversionWarning[] = [
      {
        code: 'unsupported_payload',
        message: 'Checkpoint warning',
        targetKind: 'checkpoint',
        levelIndex: 0,
        checkpointNumber: 1
      },
      {
        code: 'unsupported_payload',
        message: 'Orb warning',
        targetKind: 'abilityOrb',
        levelIndex: 0,
        checkpointNumber: 1,
        orbIndex: 0
      }
    ];
    const index = buildWorkspaceDocumentIndex(createDocument(), warnings);
    const entries = createCommandPaletteNodeEntries(index?.nodes ?? []);
    const results = filterCommandPaletteEntries([], entries, 'ability orb');

    expect(index?.warningsById['level-0-cp-1']).toHaveLength(1);
    expect(index?.warningsById['level-0-cp-1-abilityOrb-0']).toHaveLength(1);
    expect(results.nodes.map((entry) => entry.id)).toEqual(['level-0-cp-1-abilityOrb-0']);
  });

  it('does not expose the old derived Hax boundary subtitle on Hax levels', () => {
    const index = buildWorkspaceDocumentIndex(createHaxDocument(), []);

    expect(index?.nodeById['level-0']?.sublabel).toBe('');
  });
});
