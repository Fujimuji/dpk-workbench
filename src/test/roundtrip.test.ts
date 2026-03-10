import { describe, expect, it } from 'vitest';
import { HAX_EXAMPLE_INPUT } from '../app/examples';
import { convertHaxToMomentum } from '../domain/import/hax/convertHaxToMomentum';
import { parseHaxWorkshop } from '../domain/import/hax/parseHaxWorkshop';
import { renderMomentumWorkshop } from '../domain/render/renderMomentumWorkshop';

describe('Hax example roundtrip', () => {
  it('parses, converts, and renders the bundled Hax example', () => {
    const parsed = parseHaxWorkshop(HAX_EXAMPLE_INPUT);
    const result = convertHaxToMomentum(parsed);
    const rendered = renderMomentumWorkshop(result.model);

    expect(result.model.levels.length).toBeGreaterThan(0);
    expect(rendered).toContain('Global.start = Vector(');
    expect(rendered).toContain('Global.c_checkpointVectors[0]');
  });
});
