import type { DraftVec3, WorkshopColor, Vec3 } from '@/domain/model/types';
import type { HaxMission } from '@/domain/import/hax/missionRules';

export type HaxEffectType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type PrimeFactorFlag = 2 | 3 | 5 | 7 | 11 | 13 | 17;

export interface Vec3Payload {
  direction: Vec3;
  power: number;
}

export interface HaxEffect {
  position: DraftVec3;
  radius: number;
  type: HaxEffectType;
  payload: number | Vec3Payload;
}

export interface HaxSourceData {
  checkpointPositions: Vec3[];
  checkpointPrimes: Array<number | null>;
  checkpointEffects: HaxEffect[][];
}

export interface HaxAbilityCount {
  rocketPunch: number;
  powerblock: number;
  seismicSlam: number;
}

export interface HaxTeleport {
  destination: Vec3;
  radius: number;
}

export interface HaxPrimeSwitches {
  rocketPunchDisabled: boolean;
  powerblockDisabled: boolean;
  seismicSlamDisabled: boolean;
  centerlessCheckpoint: boolean;
  effectLock: boolean;
  extraFactors: number[];
}

export interface HaxCheckpoint {
  position: DraftVec3;
  radius: number;
  viewAngle: number;
  isLevelStart: boolean;
  prime: HaxPrimeSwitches;
  missions: HaxMission[];
  abilityCount: HaxAbilityCount | null;
  teleport: HaxTeleport | null;
  timeTrialMinimum: number | null;
  effects: HaxEffect[];
  fakeUpper: boolean;
}

export interface HaxDocument {
  format: 'hax';
  spawn: HaxCheckpoint;
  checkpoints: HaxCheckpoint[];
}

export interface ConvertOptions {
  levelNames?: string[];
  levelColors?: WorkshopColor[];
}
