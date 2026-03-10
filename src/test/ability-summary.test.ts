import { describe, expect, it } from 'vitest';
import { getAbilityNamesSummary } from '../features/workspace/graph/buildLevelGraph.shared';

describe('getAbilityNamesSummary', () => {
  it('summarizes player ability flags in player order', () => {
    expect(
      getAbilityNamesSummary(
        {
          seismicSlam: true,
          powerblock: false,
          rocketPunch: true
        },
        'player'
      )
    ).toBe('Seismic Slam & Rocket Punch');

    expect(
      getAbilityNamesSummary(
        {
          seismicSlam: true,
          powerblock: true,
          rocketPunch: true
        },
        'player'
      )
    ).toBe('All abilities');

    expect(
      getAbilityNamesSummary(
        {
          seismicSlam: false,
          powerblock: false,
          rocketPunch: false
        },
        'player'
      )
    ).toBe('No abilities');
  });

  it('summarizes bot ability flags in bot order', () => {
    expect(
      getAbilityNamesSummary(
        {
          primaryFire: true,
          seismicSlam: true,
          rocketPunch: false
        },
        'bot'
      )
    ).toBe('Primary Fire & Seismic Slam');

    expect(
      getAbilityNamesSummary(
        {
          primaryFire: true,
          seismicSlam: true,
          rocketPunch: true
        },
        'bot'
      )
    ).toBe('All abilities');

    expect(
      getAbilityNamesSummary(
        {
          primaryFire: false,
          seismicSlam: false,
          rocketPunch: false
        },
        'bot'
      )
    ).toBe('No abilities');
  });
});
