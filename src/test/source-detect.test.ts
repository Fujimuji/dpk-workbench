import { describe, expect, it } from 'vitest';
import { HAX_EXAMPLE_INPUT, MOMENTUM_EXAMPLE_INPUT } from '../app/examples';
import { detectSourceFormat } from '../app/detectSourceFormat';

describe('detectSourceFormat', () => {
  it('detects the bundled Hax example as hax', () => {
    expect(detectSourceFormat(HAX_EXAMPLE_INPUT)).toBe('hax');
  });

  it('detects the bundled Project Momentum example as momentum', () => {
    expect(detectSourceFormat(MOMENTUM_EXAMPLE_INPUT)).toBe('momentum');
  });

  it('prefers momentum when both source signatures are present', () => {
    const mixed = `${MOMENTUM_EXAMPLE_INPUT}\n${HAX_EXAMPLE_INPUT}`;
    expect(detectSourceFormat(mixed)).toBe('momentum');
  });

  it('fails on unsupported source text', () => {
    expect(() => detectSourceFormat('actions { Wait(1); }')).toThrow(/supported Hax Framework or Project Momentum/);
  });
});
