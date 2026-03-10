import { describe, expect, it } from 'vitest';
import type { WorkspaceDocument } from '../domain/document/types';
import { buildWorkspaceDocumentIndex } from '../features/workspace/documentIndex';
import {
  buildWorkspaceScopeGraph,
  buildWorkspaceScopeGraphBase,
  materializeWorkspaceScopeGraph
} from '../features/workspace/graph/buildScopeGraph';
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
            checkpoint({ x: 0, y: 0, z: 0 }),
            checkpoint({ x: 10, y: 0, z: 0 })
          ],
          checkpointConfigs: [
            checkpointConfig({
              abilityOrbs: [
                {
                  position: { x: 1, y: 2, z: 3 },
                  radius: 1,
                  abilities: {
                    seismicSlam: true,
                    powerblock: true,
                    rocketPunch: false
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

describe('buildScopeGraph', () => {
  it('materializes the same scoped graph as the compatibility wrapper', () => {
    const index = buildWorkspaceDocumentIndex(createDocument(), []);
    const scope = { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 } as const;
    const layout = { 'level-0-cp-1-abilityOrb-0': { yOffset: 28 } };

    const base = buildWorkspaceScopeGraphBase(index, scope);
    const materialized = materializeWorkspaceScopeGraph(base, layout);
    const wrapped = buildWorkspaceScopeGraph(index, scope, layout);

    expect(materialized).toEqual(wrapped);
  });

  it('keeps scoped visibility and warnings stable while applying layout overlays during materialization', () => {
    const index = buildWorkspaceDocumentIndex(createDocument(), [
      {
        code: 'unsupported_payload',
        message: 'Orb warning',
        targetKind: 'abilityOrb',
        levelIndex: 0,
        checkpointNumber: 1,
        orbIndex: 0
      }
    ]);
    const scope = { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 } as const;
    const base = buildWorkspaceScopeGraphBase(index, scope);
    const baseline = materializeWorkspaceScopeGraph(base, {});
    const shifted = materializeWorkspaceScopeGraph(base, {
      'level-0-cp-1-abilityOrb-0': { yOffset: 40 }
    });

    expect(base?.nodes.map((node) => node.id)).toEqual([
      'level-0',
      'level-0-cp-1',
      'level-0-cp-1-momentumEntities',
      'level-0-cp-1-abilityOrb-0'
    ]);
    expect(shifted?.nodes.map((node) => node.id)).toEqual(baseline?.nodes.map((node) => node.id));
    expect(shifted?.warningsById).toEqual(baseline?.warningsById);
    expect(shifted?.childrenById).toEqual(baseline?.childrenById);
    expect(shifted?.nodeById['level-0-cp-1-abilityOrb-0']?.x).toBe(baseline?.nodeById['level-0-cp-1-abilityOrb-0']?.x);
    expect(shifted?.nodeById['level-0-cp-1-abilityOrb-0']?.y).toBe(
      (baseline?.nodeById['level-0-cp-1-abilityOrb-0']?.y ?? 0) + 40
    );
  });
});
