import { describe, expect, it } from 'vitest';
import { buildDocumentGraph } from '../features/workspace/graph/buildDocumentGraph';
import type { HaxDocument } from '../domain/import/hax/types';

function vector(seed: number) {
  return { x: seed, y: seed + 1, z: seed + 2 };
}

function createHaxDocument(): HaxDocument {
  return {
    format: 'hax',
    spawn: {
      position: vector(0),
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
      effects: [{ position: vector(5), radius: 2, type: 1, payload: 1 }],
      fakeUpper: false
    },
    checkpoints: [
      {
        position: vector(10),
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
        missions: [{ id: 'stallless', kind: 'lock', timeDelta: null }],
        abilityCount: null,
        teleport: null,
        timeTrialMinimum: null,
        effects: [
          { position: vector(20), radius: -3, type: 0, payload: 5 },
          { position: vector(30), radius: 2, type: 5, payload: 0 },
          { position: vector(31), radius: 2, type: 6, payload: 0 },
          { position: vector(40), radius: 0, type: 8, payload: 0 },
          { position: vector(41), radius: 1, type: 9, payload: 0 }
        ],
        fakeUpper: false
      }
    ]
  };
}

describe('buildDocumentGraph for Hax effects', () => {
  it('renders Hax effects and missions under wrapper nodes and combines portal/zipline pairs', () => {
    const graph = buildDocumentGraph(createHaxDocument(), [], null, {}, [], null, false);

    expect(graph.nodes.some((node) => node.id === 'root-haxEffects')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'root-haxEffect-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxEffects')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxMissions')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxEffect-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxMission-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxPortalPair-1-2')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxZiplinePair-3-4')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxEffect-1')).toBe(false);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxEffect-3')).toBe(false);

    expect(graph.edges.some((edge) => edge.fromId === 'level-0-cp-1' && edge.toId === 'level-0-cp-1-haxEffects')).toBe(true);
    expect(graph.edges.some((edge) => edge.fromId === 'level-0-cp-1-haxEffects' && edge.toId === 'level-0-cp-1-haxPortalPair-1-2')).toBe(true);
    expect(graph.edges.some((edge) => edge.fromId === 'level-0-cp-1-haxMissions' && edge.toId === 'level-0-cp-1-haxMission-0')).toBe(true);
    expect(graph.edges.some((edge) => edge.fromId === 'root' && edge.toId === 'root-haxEffects')).toBe(true);
  });

  it('uses the requested time-effect shootable color', () => {
    const graph = buildDocumentGraph(createHaxDocument(), [], null, {}, [], null, false);
    const timeNode = graph.nodes.find((node) => node.id === 'level-0-cp-1-haxEffect-0');

    expect(timeNode?.accentColor).toBe('#b78cff');
  });

  it('assigns effect-specific icons to Hax effect nodes', () => {
    const document = createHaxDocument();
    document.checkpoints[0].effects.unshift({ position: vector(15), radius: 2, type: 1, payload: 1 });
    const graph = buildDocumentGraph(document, [], null, {}, [], null, false);
    const deathNode = graph.nodes.find((node) => node.label === 'Death Effect 1');

    expect(deathNode?.iconKey).toBe('haxDeath');
  });

  it('applies layout yOffset overrides to Hax level nodes', () => {
    const baselineGraph = buildDocumentGraph(createHaxDocument(), [], null, {}, [], null, false);
    const offsetGraph = buildDocumentGraph(
      createHaxDocument(),
      [],
      null,
      { 'level-0': { yOffset: 72 } },
      [],
      null,
      false
    );

    const baselineLevel = baselineGraph.nodes.find((node) => node.id === 'level-0');
    const offsetLevel = offsetGraph.nodes.find((node) => node.id === 'level-0');

    expect(baselineLevel).not.toBeUndefined();
    expect(offsetLevel).not.toBeUndefined();
    expect(offsetLevel!.x).toBe(baselineLevel!.x);
    expect(offsetLevel!.y).toBe(baselineLevel!.y + 72);
  });

  it('ignores legacy Hax grouping input and keeps visible effects individual', () => {
    const graph = buildDocumentGraph(
      createHaxDocument(),
      [],
      null,
      {},
      [{
        format: 'hax',
        levelIndex: 0,
        checkpointIndex: 0,
        nodeIds: ['level-0-cp-1-haxEffect-0', 'level-0-cp-1-haxPortalPair-1-2']
      }],
      null,
      false
    );

    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxEffect-0')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'level-0-cp-1-haxPortalPair-1-2')).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'haxEffectStack')).toBe(false);
  });

  it('renders human-readable mission labels', () => {
    const graph = buildDocumentGraph(createHaxDocument(), [], null, {}, [], null, false);
    const missionNode = graph.nodes.find((node) => node.id === 'level-0-cp-1-haxMission-0');

    expect(missionNode).toMatchObject({
      label: 'Stallless',
      sublabel: 'Lock Mission'
    });
  });

  it('indents wrapper-owned Hax child nodes inside the child lane', () => {
    const graph = buildDocumentGraph(createHaxDocument(), [], null, {}, [], null, false);
    const effectsWrapper = graph.nodes.find((node) => node.id === 'level-0-cp-1-haxEffects');
    const effectNode = graph.nodes.find((node) => node.id === 'level-0-cp-1-haxEffect-0');
    const missionsWrapper = graph.nodes.find((node) => node.id === 'level-0-cp-1-haxMissions');
    const missionNode = graph.nodes.find((node) => node.id === 'level-0-cp-1-haxMission-0');

    expect(effectsWrapper).not.toBeUndefined();
    expect(effectNode).not.toBeUndefined();
    expect(missionsWrapper).not.toBeUndefined();
    expect(missionNode).not.toBeUndefined();
    expect(effectNode!.x).toBeGreaterThan(effectsWrapper!.x);
    expect(missionNode!.x).toBeGreaterThan(missionsWrapper!.x);
  });

  it('renders the spawn effects subtree in dedicated space between spawn and levels', () => {
    const graph = buildDocumentGraph(createHaxDocument(), [], null, {}, [], null, false);
    const spawnNode = graph.nodes.find((node) => node.id === 'root');
    const spawnEffectsWrapper = graph.nodes.find((node) => node.id === 'root-haxEffects');
    const spawnEffectNode = graph.nodes.find((node) => node.id === 'root-haxEffect-0');
    const firstLevel = graph.nodes.find((node) => node.id === 'level-0');

    expect(spawnNode).not.toBeUndefined();
    expect(spawnEffectsWrapper).not.toBeUndefined();
    expect(spawnEffectNode).not.toBeUndefined();
    expect(firstLevel).not.toBeUndefined();
    expect(spawnEffectsWrapper!.y).toBeGreaterThan(spawnNode!.y);
    expect(spawnEffectNode!.y).toBeGreaterThan(spawnEffectsWrapper!.y);
    expect(firstLevel!.y).toBeGreaterThan(spawnEffectNode!.y);
  });
});
