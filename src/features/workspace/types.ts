export type EditorNodeId = string;

export interface EditorNodeLayoutOffset {
  yOffset: number;
}

export type EditorLayoutState = Record<EditorNodeId, EditorNodeLayoutOffset>;
export type MultiNodeSelection = EditorNodeId[];
export type ChildEntityCategory = 'touch' | 'ability' | 'lava';

export type WorkspaceScope =
  | { kind: 'document' }
  | { kind: 'level'; levelIndex: number }
  | { kind: 'checkpoint'; levelIndex: number; checkpointIndex: number };

export interface MomentumChildGroupRecord {
  levelIndex: number;
  checkpointIndex: number;
  category: ChildEntityCategory;
  orbIndexes: number[];
}

export interface HaxEffectGroupRecord {
  format: 'hax';
  levelIndex: number;
  checkpointIndex: number;
  nodeIds: EditorNodeId[];
}

export type ChildGroupRecord = MomentumChildGroupRecord | HaxEffectGroupRecord;
export type ChildGroupState = ChildGroupRecord[];

export type EditorSelection =
  | { kind: 'start' }
  | { kind: 'level'; levelIndex: number }
  | { kind: 'checkpoint'; levelIndex: number; checkpointIndex: number }
  | { kind: 'momentumEntities'; levelIndex: number; checkpointIndex: number }
  | { kind: 'haxSpawnEffects' }
  | { kind: 'haxEffects'; levelIndex: number; checkpointIndex: number }
  | { kind: 'haxMissions'; levelIndex: number; checkpointIndex: number }
  | { kind: 'haxMission'; levelIndex: number; checkpointIndex: number; missionIndex: number }
  | { kind: 'touchOrb'; levelIndex: number; checkpointIndex: number; orbIndex: number }
  | { kind: 'abilityOrb'; levelIndex: number; checkpointIndex: number; orbIndex: number }
  | { kind: 'lavaOrb'; levelIndex: number; checkpointIndex: number; orbIndex: number }
  | { kind: 'bot'; levelIndex: number; checkpointIndex: number }
  | { kind: 'impulse'; levelIndex: number; checkpointIndex: number; impulseIndex: number }
  | { kind: 'portal'; levelIndex: number; checkpointIndex: number; portalIndex: number }
  | { kind: 'haxSpawnEffect'; effectIndex: number }
  | { kind: 'haxEffect'; levelIndex: number; checkpointIndex: number; effectIndex: number }
  | {
      kind: 'haxSpawnPortalPair';
      effectIndex: number;
      pairEffectIndex: number;
    }
  | {
      kind: 'haxPortalPair';
      levelIndex: number;
      checkpointIndex: number;
      effectIndex: number;
      pairEffectIndex: number;
    }
  | {
      kind: 'haxSpawnZiplinePair';
      effectIndex: number;
      pairEffectIndex: number;
    }
  | {
      kind: 'haxZiplinePair';
      levelIndex: number;
      checkpointIndex: number;
      effectIndex: number;
      pairEffectIndex: number;
    };
