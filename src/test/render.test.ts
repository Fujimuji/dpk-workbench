import { describe, expect, it } from 'vitest';
import { HAX_EXAMPLE_INPUT } from '../app/examples';
import { convertHaxToMomentum } from '../domain/import/hax/convertHaxToMomentum';
import { parseHaxWorkshop } from '../domain/import/hax/parseHaxWorkshop';
import { renderMomentumWorkshop } from '../domain/render/renderMomentumWorkshop';
import { formatNumber, VARIABLE_BLOCK } from '../domain/render/sections';
import type { MomentumMapModel } from '../domain/model/types';
import { checkpoint, checkpointConfig } from './model-helpers';

function baseModel(configOverrides: Partial<MomentumMapModel['levels'][number]['checkpointConfigs'][number]> = {}): MomentumMapModel {
  return {
    start: { x: 0, y: 0, z: 0 },
    levels: [
      {
        name: 'Level 1',
        color: 'Aqua',
        checkpoints: [
          checkpoint({ x: 1, y: 1, z: 1 }),
          checkpoint({ x: 2, y: 2, z: 2 })
        ],
        checkpointConfigs: [
          checkpointConfig(configOverrides)
        ]
      }
    ]
  };
}

describe('renderMomentumWorkshop', () => {
  it('renders Null when a feature is unused across the level', () => {
    const output = renderMomentumWorkshop(baseModel());

    expect(output).toContain('Global.c_checkpointsLiquid[0] = Null;');
    expect(output).toContain('Global.c_checkpointMinimumSpeeds[0] = Null;');
    expect(output).toContain('Global.c_checkpointDisableAbilities[0] = Null;');
    expect(output).toContain('Global.c_checkpointTouchOrbLocations[0] = Null;');
    expect(output).toContain('Global.c_checkpointAbilityOrbLocations[0] = Null;');
  });

  it('renders editable PM-only checkpoint arrays', () => {
    const output = renderMomentumWorkshop(
      baseModel({
        liquid: true,
        timeLimit: 3.5,
        minimumSpeed: 7,
        heightGoal: 9
      })
    );

    expect(output).toContain('Global.c_checkpointsLiquid[0] = Array(True);');
    expect(output).toContain('Global.c_checkpointTimeLimits[0] = Array(3.5);');
    expect(output).toContain('Global.c_checkpointMinimumSpeeds[0] = Array(7);');
    expect(output).toContain('Global.c_checkpointHeightGoals[0] = Array(9);');
  });

  it('renders touch orb locations and size arrays', () => {
    const output = renderMomentumWorkshop(
      baseModel({
        touchOrbs: [{ position: { x: 3, y: 4, z: 5 }, radius: 1.5 }]
      })
    );

    expect(output).toContain('Global.c_checkpointTouchOrbLocations[0] = Array(Array(Vector(3, 4, 5)));');
    expect(output).toContain('Global.c_checkpointTouchOrbSizes[0] = Array(Array(1.5));');
  });

  it('renders checkpoint sizes, impulses, and portals', () => {
    const output = renderMomentumWorkshop({
      ...baseModel(),
      levels: [
        {
          ...baseModel().levels[0],
          checkpoints: [
            checkpoint({ x: 1, y: 1, z: 1 }, 2.5),
            checkpoint({ x: 2, y: 2, z: 2 }, 3)
          ],
          checkpointConfigs: [
            checkpointConfig({
              impulses: [
                {
                  position: { x: 3, y: 4, z: 5 },
                  direction: { x: 0, y: 1, z: 0 },
                  speed: 10
                },
                {
                  position: { x: 3, y: 4, z: 5 },
                  direction: { x: 1, y: 0, z: 0 },
                  speed: 20
                },
                {
                  position: { x: 12, y: 13, z: 14 },
                  direction: { x: 0, y: -1, z: 0 },
                  speed: 30
                }
              ],
              portals: [
                {
                  entry: { x: 6, y: 7, z: 8 },
                  exit: { x: 9, y: 10, z: 11 }
                }
              ]
            })
          ]
        }
      ]
    });

    expect(output).toContain('Global.c_checkpointSizes[0] = Array(2.5, 3);');
    expect(output).toContain('Global.c_checkpointImpulseLocations[0] = Array(Array(Vector(3, 4, 5), Vector(12, 13, 14)));');
    expect(output).toContain(
      'Global.c_checkpointImpulseDirections[0] = Array(Array(Array(Vector(0, 1, 0), Vector(1, 0, 0)), Vector(0, -1, 0)));'
    );
    expect(output).toContain('Global.c_checkpointImpulseSpeeds[0] = Array(Array(Array(10, 20), 30));');
    expect(output).toContain(
      'Global.c_checkpointPortals[0] = Array(Array(Array(Vector(6, 7, 8), Vector(9, 10, 11))));'
    );
  });

  it('renders lava using nested arrays for multiple orbs in one slot', () => {
    const output = renderMomentumWorkshop(
      baseModel({
        lava: [
          { position: { x: 3, y: 4, z: 5 }, radius: 2 },
          { position: { x: 6, y: 7, z: 8 }, radius: 2.5 }
        ]
      })
    );

    expect(output).toContain('Global.c_checkpointLavaLocations[0] = Array(Array(Vector(3, 4, 5), Vector(6, 7, 8)));');
    expect(output).toContain('Global.c_checkpointLavaSizes[0] = Array(Array(2, 2.5));');
  });

  it('formats numbers to three decimals without trailing zero noise', () => {
    expect(formatNumber(1.2349)).toBe('1.235');
    expect(formatNumber(9)).toBe('9');
    expect(formatNumber(-0)).toBe('0');
  });

  it('keeps the sample conversion output stable at the top of the file', () => {
    const parsed = parseHaxWorkshop(HAX_EXAMPLE_INPUT);
    const result = convertHaxToMomentum(parsed);
    const preview = result.outputText.split('\n').slice(0, VARIABLE_BLOCK.split('\n').length).join('\n');

    expect(preview).toBe(VARIABLE_BLOCK);
    expect(result.outputText).toContain('Global.c_levelData[0] = Array(Custom String("Level 1"), Color(Aqua));');
  });
});
