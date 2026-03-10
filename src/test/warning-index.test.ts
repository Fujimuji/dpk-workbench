import { describe, expect, it } from 'vitest';
import { getWarningsForNode } from '../features/workspace/graph/warningIndex';
import type { ConversionWarning } from '../domain/warnings/types';

const warnings: ConversionWarning[] = [
  { code: 'missing_first_level_marker', message: 'Level warning', targetKind: 'level', levelIndex: 0 },
  {
    code: 'unsupported_effect_removed',
    message: 'Checkpoint warning',
    targetKind: 'checkpoint',
    levelIndex: 0,
    checkpointNumber: 2
  },
  {
    code: 'lightshaft_lost',
    message: 'Touch warning',
    targetKind: 'touchOrb',
    levelIndex: 0,
    checkpointNumber: 2,
    orbIndex: 1
  },
  {
    code: 'unsupported_bounce_variant',
    message: 'Impulse warning',
    targetKind: 'impulse',
    levelIndex: 0,
    checkpointNumber: 2,
    effectIndex: 0
  }
];

describe('graph warning indexing', () => {
  it('filters by node target and location', () => {
    expect(getWarningsForNode(warnings, 'level', 0)).toEqual([warnings[0]]);
    expect(getWarningsForNode(warnings, 'checkpoint', 0, 2)).toEqual([warnings[1]]);
    expect(getWarningsForNode(warnings, 'touchOrb', 0, 2, 1)).toEqual([warnings[2]]);
    expect(getWarningsForNode(warnings, 'impulse', 0, 2, 0)).toEqual([warnings[3]]);
  });

  it('excludes warnings from sibling orb indexes', () => {
    expect(getWarningsForNode(warnings, 'touchOrb', 0, 2, 0)).toEqual([]);
  });
});
