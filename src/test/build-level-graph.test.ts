import { describe, expect, it } from 'vitest';
import { buildLevelGraph } from '../features/workspace/graph/buildLevelGraph';
import type { MomentumMapModel } from '../domain/model/types';
import type { ConversionWarning } from '../domain/warnings/types';
import { checkpoint, checkpointConfig } from './model-helpers';

describe('buildLevelGraph', () => {
  it('builds root, level, and checkpoint nodes with checkpoint warnings', () => {
    const model: MomentumMapModel = {
      start: { x: 0, y: 0, z: 0 },
      levels: [
        {
          name: 'Test Level',
          color: 'Aqua',
          checkpoints: [
            checkpoint({ x: 0, y: 0, z: 0 }),
            checkpoint({ x: 10, y: 0, z: 0 })
          ],
          checkpointConfigs: [checkpointConfig()]
        }
      ]
    };
    const warnings: ConversionWarning[] = [
      {
        code: 'unsupported_payload',
        message: 'Checkpoint note',
        targetKind: 'checkpoint',
        levelIndex: 0,
        checkpointNumber: 1
      }
    ];

    const graph = buildLevelGraph(
      model,
      warnings,
      { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
      {},
      []
    );

    expect(graph.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(['root', 'level-0', 'level-0-cp-1', 'level-0-cp-2'])
    );
    expect(graph.warningsById['level-0-cp-1']).toEqual(warnings);
    expect(graph.nodes.find((node) => node.id === 'level-0-cp-1')?.kind).toBe('checkpoint');
  });

  it('renders empty levels and still keeps the root visible', () => {
    const model: MomentumMapModel = {
      start: { x: 0, y: 0, z: 0 },
      levels: [
        {
          name: 'Empty Level',
          color: 'Aqua',
          checkpoints: [],
          checkpointConfigs: []
        }
      ]
    };

    const graph = buildLevelGraph(model, [], { kind: 'start' }, {}, []);

    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['root', 'level-0']));
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromId: 'root', toId: 'level-0' })
      ])
    );
  });
});
