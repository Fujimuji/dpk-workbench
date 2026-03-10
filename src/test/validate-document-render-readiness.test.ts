import { describe, expect, it } from 'vitest';
import { validateDocumentRenderReadiness } from '../domain/document/validateDocumentRenderReadiness';
import { createEmptyDraftVec3 } from '../domain/model/draftVectors';
import { checkpoint, checkpointConfig } from './model-helpers';

describe('validateDocumentRenderReadiness', () => {
  it('blocks Momentum output when checkpoint or entity positions are incomplete', () => {
    const readiness = validateDocumentRenderReadiness({
      format: 'momentum',
      map: {
        start: { x: 0, y: 0, z: 0 },
        levels: [
          {
            name: 'Level 1',
            color: 'Aqua',
            checkpoints: [
              { position: createEmptyDraftVec3(), radius: 2 },
              checkpoint({ x: 10, y: 0, z: 0 })
            ],
            checkpointConfigs: [
              checkpointConfig({
                touchOrbs: [{ position: createEmptyDraftVec3(), radius: 1 }]
              })
            ]
          }
        ]
      }
    });

    expect(readiness.isRenderReady).toBe(false);
    expect(readiness.blockingReasons).toContain('Level 1 checkpoint 1 needs X, Y, and Z coordinates.');
    expect(readiness.blockingReasons).toContain('Level 1 checkpoint 1 Touch Orb 1 needs X, Y, and Z coordinates.');
  });

  it('blocks Hax output when checkpoint or effect positions are incomplete', () => {
    const readiness = validateDocumentRenderReadiness({
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
        effects: [{ position: createEmptyDraftVec3(), radius: 2, type: 0, payload: 0 }],
        fakeUpper: false
      },
      checkpoints: [
        {
          position: createEmptyDraftVec3(),
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
          effects: [{ position: createEmptyDraftVec3(), radius: 2, type: 0, payload: 0 }],
          fakeUpper: false
        }
      ]
    });

    expect(readiness.isRenderReady).toBe(false);
    expect(readiness.blockingReasons).toContain('Spawn Time Effect 1 needs X, Y, and Z coordinates.');
    expect(readiness.blockingReasons).toContain('Level 1 checkpoint 1 needs X, Y, and Z coordinates.');
    expect(readiness.blockingReasons).toContain('Level 1 checkpoint 1 Time Effect 1 needs X, Y, and Z coordinates.');
  });

  it('uses level-local numbering for multi-level Hax blocker messages', () => {
    const readiness = validateDocumentRenderReadiness({
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
        },
        {
          position: createEmptyDraftVec3(),
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
          effects: [{ position: createEmptyDraftVec3(), radius: 2, type: 0, payload: 0 }],
          fakeUpper: false
        },
        {
          position: createEmptyDraftVec3(),
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
    });

    expect(readiness.isRenderReady).toBe(false);
    expect(readiness.blockingReasons).toContain('Level 1 checkpoint 2 needs X, Y, and Z coordinates.');
    expect(readiness.blockingReasons).toContain('Level 1 checkpoint 2 Time Effect 1 needs X, Y, and Z coordinates.');
    expect(readiness.blockingReasons).toContain('Level 2 checkpoint 1 needs X, Y, and Z coordinates.');
    expect(readiness.blockingReasons).not.toContain('Checkpoint 3 needs X, Y, and Z coordinates.');
  });
});
