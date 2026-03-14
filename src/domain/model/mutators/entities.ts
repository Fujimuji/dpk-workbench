import type {
  AbilityFlags,
  AbilityOrb,
  BotAbilityFlags,
  BotConfig,
  ImpulseEffect,
  LavaOrb,
  MomentumMapModel,
  PortalPair,
  TouchOrb
} from '@/domain/model/types';
import { updateCheckpointConfigEntry } from '@/domain/model/mutators/checkpoint';

function updateOrbList<T>(list: T[] | null, update: (items: T[]) => T[]): T[] | null {
  const nextItems = update([...(list ?? [])]);
  return nextItems.length > 0 ? nextItems : null;
}

export function addTouchOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  touchOrb: TouchOrb
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    touchOrbs: [...(config.touchOrbs ?? []), touchOrb]
  }));
}

export function updateTouchOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  orbIndex: number,
  patch: Partial<TouchOrb>
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    touchOrbs: updateOrbList(config.touchOrbs, (items) =>
      items.map((orb, index) => (index === orbIndex ? { ...orb, ...patch } : orb))
    )
  }));
}

export function removeTouchOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  orbIndex: number
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    touchOrbs: updateOrbList(config.touchOrbs, (items) => items.filter((_, index) => index !== orbIndex))
  }));
}

export function addAbilityOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  abilityOrb: AbilityOrb
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    abilityOrbs: [...(config.abilityOrbs ?? []), abilityOrb]
  }));
}

export function updateAbilityOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  orbIndex: number,
  patch: Partial<AbilityOrb>
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    abilityOrbs: updateOrbList(config.abilityOrbs, (items) =>
      items.map((orb, index) => (index === orbIndex ? { ...orb, ...patch } : orb))
    )
  }));
}

export function removeAbilityOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  orbIndex: number
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    abilityOrbs: updateOrbList(config.abilityOrbs, (items) => items.filter((_, index) => index !== orbIndex))
  }));
}

export function addLavaOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  lavaOrb: LavaOrb
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    lava: [...(config.lava ?? []), lavaOrb]
  }));
}

export function updateLavaOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  orbIndex: number,
  patch: Partial<LavaOrb>
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    lava: updateOrbList(config.lava, (items) =>
      items.map((orb, index) => (index === orbIndex ? { ...orb, ...patch } : orb))
    )
  }));
}

export function removeLavaOrb(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  orbIndex: number
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    lava: updateOrbList(config.lava, (items) => items.filter((_, index) => index !== orbIndex))
  }));
}

export function setBot(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  bot: BotConfig | null
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    bot
  }));
}

export function updateBot(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  patch: Partial<BotConfig>
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => {
    if (!config.bot) {
      return config;
    }

    return {
      ...config,
      bot: {
        ...config.bot,
        ...patch
      }
    };
  });
}

export function removeBot(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number
): MomentumMapModel {
  return setBot(map, levelIndex, checkpointIndex, null);
}

export function addImpulse(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  impulse: ImpulseEffect
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    impulses: [...(config.impulses ?? []), impulse]
  }));
}

export function updateImpulse(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  impulseIndex: number,
  patch: Partial<ImpulseEffect>
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    impulses: updateOrbList(config.impulses, (items) =>
      items.map((impulse, index) => (index === impulseIndex ? { ...impulse, ...patch } : impulse))
    )
  }));
}

export function removeImpulse(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  impulseIndex: number
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    impulses: updateOrbList(config.impulses, (items) => items.filter((_, index) => index !== impulseIndex))
  }));
}

export function addPortal(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  portal: PortalPair
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    portal
  }));
}

export function updatePortal(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  patch: Partial<PortalPair>
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => {
    if (!config.portal) {
      return config;
    }

    return {
      ...config,
      portal: {
        ...config.portal,
        ...patch
      }
    };
  });
}

export function removePortal(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number
): MomentumMapModel {
  return updateCheckpointConfigEntry(map, levelIndex, checkpointIndex, (config) => ({
    ...config,
    portal: null
  }));
}

export function allAbilitiesEnabled(): AbilityFlags {
  return {
    seismicSlam: true,
    powerblock: true,
    rocketPunch: true
  };
}

export function allBotAbilitiesEnabled(): BotAbilityFlags {
  return {
    primaryFire: true,
    seismicSlam: true,
    rocketPunch: true
  };
}
