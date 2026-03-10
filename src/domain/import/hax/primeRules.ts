import type { AbilityFlags, BotAbilityFlags } from '@/domain/model/types';

export function hasFactor(value: number | null, factor: number): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
    return false;
  }

  const normalized = Math.abs(Math.trunc(value));
  return normalized % factor === 0;
}

export function toDisabledAbilities(prime: number | null): AbilityFlags | null {
  const flags: AbilityFlags = {
    seismicSlam: hasFactor(prime, 5),
    powerblock: hasFactor(prime, 3),
    rocketPunch: hasFactor(prime, 2)
  };

  return flags.seismicSlam || flags.powerblock || flags.rocketPunch ? flags : null;
}

// Project Momentum ability-orb arrays are interpreted as "ability available",
// so Hax "disabled" prime flags are inverted here.
export function toValidAbilities(prime: number): AbilityFlags {
  return {
    seismicSlam: !hasFactor(prime, 5),
    powerblock: !hasFactor(prime, 3),
    rocketPunch: !hasFactor(prime, 2)
  };
}

// Project Momentum bot arrays use the order:
// Primary Fire, Seismic Slam, Rocket Punch.
// The imported Hax payload still uses the same prime bit meaning as the rest of Hax,
// so factor 3 is treated as the bot's Primary Fire slot.
export function toBotValidAbilities(prime: number): BotAbilityFlags {
  return {
    primaryFire: !hasFactor(prime, 3),
    seismicSlam: !hasFactor(prime, 5),
    rocketPunch: !hasFactor(prime, 2)
  };
}
