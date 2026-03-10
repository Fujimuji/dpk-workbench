import { describe, expect, it } from 'vitest';
import { parseHaxWorkshop } from '../domain/import/hax/parseHaxWorkshop';

const baseInput = `variables
{
  global:
    0: CPposition
    4: Prime
    8: Effect
}

actions
{
  Global.CPposition = Array(Vector(0, 0, 0), Vector(1.25, -2.5, 3), Vector(-4, 5.125, -6));
  Global.Prime = Array(11, True, 13);
  Global.Effect = Array(False, Array(Array(Vector(2, 3, 4), -1.5, 2, -6)), 0);
}`;

describe('parseHaxWorkshop', () => {
  it('parses nested arrays, vectors, and numeric values', () => {
    const parsed = parseHaxWorkshop(baseInput);

    expect(parsed.spawn.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(parsed.checkpoints[0].position).toEqual({ x: 1.25, y: -2.5, z: 3 });
    expect(parsed.checkpoints[0].isLevelStart).toBe(true);
    expect(parsed.spawn.viewAngle).toBe(0);
    expect(parsed.checkpoints[0].effects[0]).toMatchObject({
      radius: -1.5,
      type: 2,
      payload: -6
    });
  });

  it('normalizes False, Null, and 0 effect slots to empty arrays', () => {
    const parsed = parseHaxWorkshop(`variables{} actions{
      Global.CPposition = Array(Vector(0,0,0), Vector(1,1,1), Vector(2,2,2));
      Global.Prime = Array(11, 13, 0);
      Global.Effect = Array(False, Null, 0);
    }`);

    expect(parsed.spawn.effects).toEqual([]);
    expect(parsed.checkpoints[0].effects).toEqual([]);
    expect(parsed.checkpoints[1].effects).toEqual([]);
  });

  it('fails when a required variable is missing', () => {
    expect(() =>
      parseHaxWorkshop(`actions{ Global.CPposition = Array(Vector(0,0,0), Vector(1,1,1)); Global.Prime = Array(11, 13); }`)
    ).toThrow(/Global\.Effect/);
  });

  it('fails on mismatched array lengths', () => {
    expect(() =>
      parseHaxWorkshop(`actions{
        Global.CPposition = Array(Vector(0,0,0), Vector(1,1,1), Vector(2,2,2));
        Global.Prime = Array(11, 13);
        Global.Effect = Array(False, False, False);
      }`)
    ).toThrow(/same number of entries/);
  });
});
