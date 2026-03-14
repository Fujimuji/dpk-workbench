export type WorkshopColor =
  | 'Aqua'
  | 'Blue'
  | 'Green'
  | 'Lime Green'
  | 'Orange'
  | 'Purple'
  | 'Red'
  | 'Sky Blue'
  | 'Turquoise'
  | 'White'
  | 'Yellow'
  | 'Black'
  | 'Gray'
  | 'Rose'
  | 'Violet';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface DraftVec3 {
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface AbilityFlags {
  seismicSlam: boolean;
  powerblock: boolean;
  rocketPunch: boolean;
}

export interface BotAbilityFlags {
  primaryFire: boolean;
  seismicSlam: boolean;
  rocketPunch: boolean;
}

export interface CheckpointMarker {
  position: DraftVec3;
  radius: number;
}

export interface AbilityOrb {
  position: DraftVec3;
  radius: number;
  abilities: AbilityFlags;
}

export interface TouchOrb {
  position: DraftVec3;
  radius: number;
}

export interface LavaOrb {
  position: DraftVec3;
  radius: number;
}

export interface BotConfig {
  position: DraftVec3;
  validAbilities: BotAbilityFlags;
}

export interface ImpulseEffect {
  position: DraftVec3;
  direction: Vec3;
  speed: number;
}

export interface PortalPair {
  entry: DraftVec3;
  exit: DraftVec3;
}

export interface CheckpointConfig {
  liquid: boolean;
  timeLimit: number | null;
  minimumSpeed: number | null;
  heightGoal: number | null;
  disableAbilities: AbilityFlags | null;
  touchOrbs: TouchOrb[] | null;
  abilityOrbs: AbilityOrb[] | null;
  lava: LavaOrb[] | null;
  bot: BotConfig | null;
  impulses: ImpulseEffect[] | null;
  portal: PortalPair | null;
}

export interface LevelModel {
  name: string;
  color: WorkshopColor;
  checkpoints: CheckpointMarker[];
  checkpointConfigs: CheckpointConfig[];
}

export interface MomentumMapModel {
  start: Vec3;
  levels: LevelModel[];
}
