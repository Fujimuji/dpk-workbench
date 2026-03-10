import { describe, expect, it } from 'vitest';
import {
  countEnabledAbilities,
  countEnabledBotAbilities,
  formatNumber,
  getEditorHeaderMeta,
  getEditorHeaderTitle,
  getNodeLabel,
  isEntityNodeKind
} from '../features/workspace/canvas/CanvasNodeEditor';
import type { EditorNodeSummary } from '../features/workspace/graph/types';
import { checkpoint } from './model-helpers';

function createNode(overrides: Partial<EditorNodeSummary>): EditorNodeSummary {
  return {
    id: 'node',
    kind: 'checkpoint',
    label: 'Checkpoint 1',
    sublabel: 'Checkpoint',
    selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    portInX: 0,
    portOutX: 100,
    noteMarker: false,
    hasSettings: false,
    ...overrides
  };
}

describe('canvas node editor helpers', () => {
  it('formats numeric summaries compactly', () => {
    expect(formatNumber(3)).toBe('3');
    expect(formatNumber(3.456)).toBe('3.46');
  });

  it('counts enabled ability flags in the correct order', () => {
    expect(
      countEnabledAbilities({ seismicSlam: true, powerblock: false, rocketPunch: true })
    ).toBe(2);
    expect(
      countEnabledBotAbilities({ primaryFire: true, seismicSlam: false, rocketPunch: true })
    ).toBe(2);
  });

  it('derives node labels and headers from node kind', () => {
    expect(getNodeLabel(createNode({ kind: 'start', label: 'Spawn', sublabel: 'Spawn' }))).toBe('Spawn checkpoint');
    expect(getEditorHeaderTitle(createNode({ kind: 'start', label: 'Spawn' }))).toBe('Spawn');
    expect(getEditorHeaderMeta(createNode({ kind: 'start', label: 'Spawn' }), null)).toBe('Start position');
  });

  it('builds contextual meta for visible entity and wrapper nodes', () => {
    const map = {
      start: { x: 0, y: 0, z: 0 },
      levels: [
        {
          name: 'Level A',
          color: 'Aqua' as const,
          checkpoints: [
            checkpoint({ x: 1, y: 2, z: 3 }),
            checkpoint({ x: 4, y: 5, z: 6 })
          ],
          checkpointConfigs: []
        }
      ]
    };

    expect(
      getEditorHeaderMeta(
        createNode({
          kind: 'abilityOrb',
          label: 'Ability Orb 1',
          levelIndex: 0,
          checkpointNumber: 2,
          selection: { kind: 'abilityOrb', levelIndex: 0, checkpointIndex: 1, orbIndex: 0 }
        }),
        map
      )
    ).toBe('Level A - Checkpoint 2');

    expect(
      getEditorHeaderMeta(
        createNode({
          kind: 'haxEffect',
          label: 'Time Effect 1',
          checkpointNumber: 2,
          levelIndex: 0,
          selection: { kind: 'haxEffect', levelIndex: 0, checkpointIndex: 1, effectIndex: 0 }
        }),
        null
      )
    ).toBe('Level 1 - Checkpoint 2');

    expect(
      getEditorHeaderMeta(
        createNode({
          kind: 'haxMissions',
          label: 'Missions',
          checkpointNumber: 2,
          levelIndex: 0,
          selection: { kind: 'haxMissions', levelIndex: 0, checkpointIndex: 1 }
        }),
        null
      )
    ).toBe('Level 1 - Checkpoint 2');

    expect(
      getEditorHeaderMeta(
        createNode({
          kind: 'haxEffects',
          label: 'Effects',
          selection: { kind: 'haxSpawnEffects' }
        }),
        null
      )
    ).toBe('Spawn');
  });

  it('identifies entity node kinds only', () => {
    expect(isEntityNodeKind('abilityOrb')).toBe(true);
    expect(isEntityNodeKind('impulse')).toBe(true);
    expect(isEntityNodeKind('portal')).toBe(true);
    expect(isEntityNodeKind('haxMission')).toBe(true);
    expect(isEntityNodeKind('haxEffect')).toBe(true);
    expect(isEntityNodeKind('haxEffectPair')).toBe(true);
    expect(isEntityNodeKind('abilityStack')).toBe(false);
    expect(isEntityNodeKind('checkpoint')).toBe(false);
  });
});
