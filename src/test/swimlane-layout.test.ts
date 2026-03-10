import { describe, expect, it } from 'vitest';
import type { MomentumMapModel } from '../domain/model/types';
import { computeSwimlaneLayout } from '../features/workspace/graph/computeSwimlaneLayout';
import {
  EDITOR_BAND_MIN_HEIGHT,
  EDITOR_COL_0_X,
  EDITOR_COL_1_X,
  EDITOR_COL_2_X,
  EDITOR_COL_3_X
} from '../features/workspace/graph/layoutConstants';
import { checkpoint, checkpointConfig } from './model-helpers';

const map: MomentumMapModel = {
  start: { x: 0, y: 0, z: 0 },
  levels: [
    {
      name: 'Level 1',
      color: 'Aqua',
      checkpoints: [
        checkpoint({ x: 0, y: 0, z: 0 }),
        checkpoint({ x: 64, y: 0, z: 0 })
      ],
      checkpointConfigs: [
        checkpointConfig({
          touchOrbs: [
            { position: { x: 1, y: 0, z: 0 }, radius: 1 },
            { position: { x: 2, y: 0, z: 0 }, radius: 1 }
          ]
        })
      ]
    }
  ]
};

describe('computeSwimlaneLayout', () => {
  it('is deterministic for identical inputs', () => {
    const first = computeSwimlaneLayout(map, []);
    const second = computeSwimlaneLayout(map, []);

    expect(second).toEqual(first);
  });

  it('uses strict depth columns', () => {
    const layout = computeSwimlaneLayout(map, []).layoutById;

    expect(layout.root.baseX).toBe(EDITOR_COL_0_X);
    expect(layout['level-0'].baseX).toBe(EDITOR_COL_1_X);
    expect(layout['level-0-cp-1'].baseX).toBe(EDITOR_COL_2_X);
    expect(layout['level-0-cp-1-touchOrb-0'].baseX).toBe(EDITOR_COL_3_X);
  });

  it('allocates contiguous non-overlapping child bands under a checkpoint', () => {
    const layout = computeSwimlaneLayout(map, []).layoutById;
    const checkpoint = layout['level-0-cp-1'];
    const touch1 = layout['level-0-cp-1-touchOrb-0'];
    const touch2 = layout['level-0-cp-1-touchOrb-1'];

    expect(checkpoint.bandHeight).toBeGreaterThanOrEqual(touch1.bandHeight + touch2.bandHeight);
    expect(touch1.bandHeight).toBeGreaterThanOrEqual(EDITOR_BAND_MIN_HEIGHT);
    expect(touch2.bandHeight).toBeGreaterThanOrEqual(EDITOR_BAND_MIN_HEIGHT);
    expect(touch1.bandTop + touch1.bandHeight).toBe(touch2.bandTop);
  });
});
