import { describe, expect, it } from 'vitest';
import { MOMENTUM_EXAMPLE_INPUT } from '../app/examples';
import { parseMomentumWorkshop } from '../domain/import/pm/parseMomentumWorkshop';

describe('PM example import', () => {
  it('imports the bundled PM example', () => {
    const model = parseMomentumWorkshop(MOMENTUM_EXAMPLE_INPUT);

    expect(model.levels.length).toBeGreaterThan(0);
    expect(model.levels[0]?.checkpoints.length).toBeGreaterThan(1);
  });
});
