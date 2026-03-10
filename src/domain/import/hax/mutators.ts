import type {
  HaxAbilityCount,
  HaxCheckpoint,
  HaxDocument,
  HaxEffect,
  HaxPrimeSwitches,
  HaxTeleport
} from '@/domain/import/hax/types';
import { normalizeHaxEffect, normalizeHaxEffects } from '@/domain/import/hax/effectRules';
import type { HaxMission } from '@/domain/import/hax/missionRules';
import type { DraftVec3, Vec3 } from '@/domain/model/types';

function updateCheckpointAt(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  updater: (checkpoint: HaxCheckpoint) => HaxCheckpoint
): HaxDocument {
  if (absoluteCheckpointIndex === 0) {
    return {
      ...document,
      spawn: updater(document.spawn)
    };
  }

  const checkpointIndex = absoluteCheckpointIndex - 1;
  const checkpoint = document.checkpoints[checkpointIndex];
  if (!checkpoint) {
    return document;
  }

  return {
    ...document,
    checkpoints: document.checkpoints.map((entry, index) =>
      index === checkpointIndex ? updater(entry) : entry
    )
  };
}

function shouldAutoEnableEffectLock(
  checkpoint: HaxCheckpoint,
  effectsToInsert: HaxEffect[]
): boolean {
  if (checkpoint.prime.effectLock) {
    return false;
  }

  const hasLockRelevantEffect = (effect: HaxEffect) => effect.type === 2 || effect.type === 10;
  const hadRelevantEffectAlready = checkpoint.effects.some(hasLockRelevantEffect);
  const isAddingRelevantEffect = effectsToInsert.some(hasLockRelevantEffect);

  return !hadRelevantEffectAlready && isAddingRelevantEffect;
}

export function updateHaxCheckpointPosition(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  position: DraftVec3
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, position }));
}

export function updateHaxCheckpointRadius(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  radius: number
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, radius }));
}

export function updateHaxCheckpointPrimeSwitches(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  prime: HaxPrimeSwitches
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, prime }));
}

export function updateHaxCheckpointMissions(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  missions: HaxMission[]
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, missions }));
}

export function insertHaxCheckpointMission(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  mission: HaxMission
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({
    ...checkpoint,
    missions: [...checkpoint.missions, mission]
  }));
}

export function updateHaxCheckpointMissionAt(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  missionIndex: number,
  updater: (mission: HaxMission) => HaxMission
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({
    ...checkpoint,
    missions: checkpoint.missions.map((mission, index) => (index === missionIndex ? updater(mission) : mission))
  }));
}

export function removeHaxCheckpointMissionAt(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  missionIndex: number
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({
    ...checkpoint,
    missions: checkpoint.missions.filter((_, index) => index !== missionIndex)
  }));
}

export function updateHaxCheckpointAbilityCount(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  abilityCount: HaxAbilityCount | null
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, abilityCount }));
}

export function updateHaxCheckpointTeleport(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  teleport: HaxTeleport | null
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, teleport }));
}

export function updateHaxCheckpointTimeTrialMinimum(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  timeTrialMinimum: number | null
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, timeTrialMinimum }));
}

export function updateHaxCheckpointFakeUpper(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  fakeUpper: boolean
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({ ...checkpoint, fakeUpper }));
}

export function updateHaxCheckpointEffects(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  effects: HaxEffect[]
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({
    ...checkpoint,
    effects: normalizeHaxEffects(effects)
  }));
}

export function insertHaxCheckpointEffects(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  effectsToInsert: HaxEffect[]
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({
    ...checkpoint,
    prime: shouldAutoEnableEffectLock(checkpoint, effectsToInsert)
      ? {
          ...checkpoint.prime,
          effectLock: true
        }
      : checkpoint.prime,
    effects: [...checkpoint.effects, ...normalizeHaxEffects(effectsToInsert)]
  }));
}

export function updateHaxCheckpointEffectAt(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  effectIndex: number,
  updater: (effect: HaxEffect) => HaxEffect
): HaxDocument {
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({
    ...checkpoint,
    effects: checkpoint.effects.map((effect, index) =>
      index === effectIndex ? normalizeHaxEffect(updater(effect)) : effect
    )
  }));
}

export function removeHaxCheckpointEffectsAt(
  document: HaxDocument,
  absoluteCheckpointIndex: number,
  effectIndexes: number[]
): HaxDocument {
  const indexSet = new Set(effectIndexes);
  return updateCheckpointAt(document, absoluteCheckpointIndex, (checkpoint) => ({
    ...checkpoint,
    effects: checkpoint.effects.filter((_, index) => !indexSet.has(index))
  }));
}
