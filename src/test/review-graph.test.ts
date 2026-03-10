import { describe, expect, it } from 'vitest';
import {
  EDITOR_BAND_MIN_HEIGHT,
  EDITOR_CHECKPOINT_ROW_GAP,
  EDITOR_COL_0_X,
  EDITOR_COL_1_X,
  EDITOR_COL_2_X,
  EDITOR_COL_3_X,
  buildEditorGraph
} from '../features/workspace/graph/buildEditorGraph';
import type { EditorLayoutState } from '../features/workspace/types';
import type { MomentumMapModel } from '../domain/model/types';
import type { ConversionWarning } from '../domain/warnings/types';
import { checkpoint, checkpointConfig } from './model-helpers';

function vector(seed: number) {
  return { x: seed, y: seed + 1, z: seed + 2 };
}

function createMap(): MomentumMapModel {
  return {
    start: vector(0),
    levels: [
      {
        name: 'Level One With A Very Long Name',
        color: 'Aqua',
        checkpoints: [checkpoint(vector(1)), checkpoint(vector(2))],
        checkpointConfigs: [
          checkpointConfig({
            liquid: true,
            timeLimit: 5,
            disableAbilities: {
              seismicSlam: true,
              powerblock: false,
              rocketPunch: true
            },
            touchOrbs: [{ position: vector(10), radius: 1 }],
            abilityOrbs: [
              {
                position: vector(11),
                radius: 1,
                abilities: {
                  seismicSlam: true,
                  powerblock: true,
                  rocketPunch: true
                }
              },
              {
                position: vector(14),
                radius: 1.5,
                abilities: {
                  seismicSlam: true,
                  powerblock: false,
                  rocketPunch: true
                }
              }
            ],
            lava: [{ position: vector(12), radius: 2 }],
            bot: {
              position: vector(13),
              validAbilities: {
                primaryFire: true,
                seismicSlam: true,
                rocketPunch: false
              }
            }
          })
        ]
      },
      {
        name: 'Level 2',
        color: 'Blue',
        checkpoints: [checkpoint(vector(3))],
        checkpointConfigs: []
      }
    ]
  };
}

const warnings: ConversionWarning[] = [
  { code: 'unsupported_payload', message: 'Root warning', targetKind: 'start' },
  { code: 'unsupported_payload', message: 'Level warning', targetKind: 'level', levelIndex: 0 },
  {
    code: 'unsupported_effect_removed',
    message: 'Checkpoint warning',
    targetKind: 'checkpoint',
    levelIndex: 0,
    checkpointNumber: 2
  },
  {
    code: 'lightshaft_lost',
    message: 'Ability warning',
    targetKind: 'abilityOrb',
    levelIndex: 0,
    checkpointNumber: 1,
    orbIndex: 0
  }
];

describe('buildEditorGraph', () => {
  it('renders all child nodes individually by default', () => {
    const graph = buildEditorGraph(createMap(), warnings, null, {}, [], null, false);

    expect(graph.nodes).toHaveLength(11);
    expect(graph.edges).toHaveLength(10);
    expect(graph.nodes.some((node) => node.id === 'root')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-touchOrb-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityStack-0-1')).toBe(false);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityOrb-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityOrb-1')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-lavaOrb-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-bot')).toBe(true);
  });

  it('associates warnings only with their matching nodes', () => {
    const graph = buildEditorGraph(createMap(), warnings, null, {}, [], null, false);

    expect(graph.warningsById.root).toHaveLength(1);
    expect(graph.warningsById['level-0']).toHaveLength(1);
    expect(graph.warningsById['level-0-cp-2']).toHaveLength(1);
    expect(graph.warningsById['level-0-cp-1-abilityOrb-0']).toHaveLength(1);
    expect(graph.warningsById['level-0-cp-1']).toHaveLength(0);
  });

  it('marks settings and notes directly on matching nodes', () => {
    const graph = buildEditorGraph(createMap(), warnings, null, {}, [], null, false);
    const checkpointNode = graph.nodes.find((node) => node.id === 'level-0-cp-1');
    const abilityNode = graph.nodes.find((node) => node.id === 'level-0-cp-1-abilityOrb-0');

    expect(checkpointNode?.hasSettings).toBe(true);
    expect(checkpointNode?.noteMarker).toBe(false);
    expect(abilityNode?.noteMarker).toBe(true);
  });

  it('applies yOffset layout overrides to Y while preserving strict column X positions', () => {
    const baselineGraph = buildEditorGraph(createMap(), warnings, null, {}, [], null, false);
    const layout: EditorLayoutState = {
      'level-0-cp-1-abilityOrb-0': { yOffset: 96 }
    };
    const offsetGraph = buildEditorGraph(createMap(), warnings, null, layout, [], null, false);
    const baselineNode = baselineGraph.nodes.find((node) => node.id === 'level-0-cp-1-abilityOrb-0');
    const offsetNode = offsetGraph.nodes.find((node) => node.id === 'level-0-cp-1-abilityOrb-0');

    expect(baselineNode).not.toBeUndefined();
    expect(offsetNode).not.toBeUndefined();
    expect(offsetNode!.x).toBe(baselineNode!.x);
    expect(offsetNode!.y).toBe(baselineNode!.y + 96);
  });

  it('ignores legacy child-group input and keeps child nodes individual', () => {
    const graph = buildEditorGraph(
      createMap(),
      warnings,
      null,
      {},
      [{ levelIndex: 0, checkpointIndex: 0, category: 'ability', orbIndexes: [0, 1] }],
      null,
      false
    );
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityStack-0-1')).toBe(false);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityOrb-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityOrb-1')).toBe(true);
    expect(graph.warningsById['level-0-cp-1-abilityOrb-0']?.[0]?.message).toBe('Ability warning');
  });

  it('generates deterministic swimlane columns and vertical spacing', () => {
    const graph = buildEditorGraph(createMap(), warnings, null, {}, [], null, false);
    const rootNode = graph.nodes.find((node) => node.id === 'root');
    const levelNode = graph.nodes.find((node) => node.id === 'level-0');
    const checkpointNode = graph.nodes.find((node) => node.id === 'level-0-cp-1');
    const touchNode = graph.nodes.find((node) => node.id === 'level-0-cp-1-touchOrb-0');
    const secondCheckpoint = graph.nodes.find((node) => node.id === 'level-0-cp-2');

    expect(rootNode).toMatchObject({
      x: EDITOR_COL_0_X
    });
    expect(levelNode).toMatchObject({
      x: EDITOR_COL_1_X
    });
    expect(checkpointNode).toMatchObject({
      x: EDITOR_COL_2_X
    });
    expect(touchNode).toMatchObject({
      x: EDITOR_COL_3_X
    });
    expect(secondCheckpoint!.y - checkpointNode!.y).toBeGreaterThanOrEqual(
      Math.max(EDITOR_CHECKPOINT_ROW_GAP, EDITOR_BAND_MIN_HEIGHT)
    );
    expect(touchNode!.y).toBeLessThan(checkpointNode!.y);
    expect(levelNode!.y).toBeGreaterThan(checkpointNode!.y);
    expect(rootNode!.y).toBeGreaterThan(levelNode!.y);
  });

  it('keeps sibling child nodes visible even when legacy grouping input is provided', () => {
    const graph = buildEditorGraph(
      createMap(),
      warnings,
      null,
      {},
      [{ levelIndex: 0, checkpointIndex: 0, category: 'ability', orbIndexes: [0, 1] }],
      null,
      false
    );

    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-touchOrb-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityStack-0-1')).toBe(false);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityOrb-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-abilityOrb-1')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-lavaOrb-0')).toBe(true);
  });

  it('dims unrelated nodes and edges while focus mode is active', () => {
    const graph = buildEditorGraph(
      createMap(),
      warnings,
      { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      {},
      [],
      'level-0-cp-1',
      true
    );

    expect(graph.nodes.find((node) => node.id === 'root')?.isDimmed).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'level-0')?.isDimmed).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'level-0-cp-1')?.isDimmed).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'level-1')?.isDimmed).toBe(true);
    expect(graph.edges.some((edge) => edge.isDimmed)).toBe(true);
  });
});
