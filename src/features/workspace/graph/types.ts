import type { ConversionWarning } from '@/domain/warnings/types';
import type { ChildEntityCategory, EditorSelection } from '@/features/workspace/types';

export type EditorNodeKind =
  | 'start'
  | 'level'
  | 'checkpoint'
  | 'momentumEntities'
  | 'haxEffects'
  | 'haxMissions'
  | 'haxMission'
  | 'touchOrb'
  | 'abilityOrb'
  | 'lavaOrb'
  | 'bot'
  | 'impulse'
  | 'portal'
  | 'haxEffect'
  | 'haxEffectPair'
  | 'haxEffectStack'
  | 'touchStack'
  | 'abilityStack'
  | 'lavaStack';

export type EditorNodeIconKey =
  | 'haxTime'
  | 'haxDeath'
  | 'haxAbility'
  | 'haxPermeation'
  | 'haxCheckpoint'
  | 'haxPortal'
  | 'haxBlackhole'
  | 'haxZipline'
  | 'haxShootableOrb'
  | 'haxBounce';

export type EditorSocketKind = 'touch' | 'ability' | 'lava' | 'bot' | 'impulse' | 'portal';

export interface WorkspaceNodeSummary {
  id: string;
  kind: EditorNodeKind;
  label: string;
  sublabel: string;
  selection: EditorSelection;
  levelIndex?: number;
  checkpointIndex?: number;
  checkpointNumber?: number;
  orbIndex?: number;
  parentId?: string;
  accentColor?: string;
  accentSoftColor?: string;
  panelAccentColor?: string;
  panelAccentSoftColor?: string;
  panelAccentAltColor?: string;
  panelAccentAltSoftColor?: string;
  iconKey?: EditorNodeIconKey;
  noteMarker: boolean;
  hasSettings: boolean;
  childCount?: number;
  stackCategory?: ChildEntityCategory;
  groupOrbIndexes?: number[];
  groupNodeIds?: string[];
  isDimmed?: boolean;
}

export interface EditorNodeSummary extends WorkspaceNodeSummary {
  x: number;
  y: number;
  width: number;
  height: number;
  overlayWidth?: number;
  overlayHeight?: number;
  portInX: number;
  portOutX: number;
}

export interface EditorEdgeBezier {
  control1X: number;
  control1Y: number;
  control2X: number;
  control2Y: number;
  endX: number;
  endY: number;
  startX: number;
  startY: number;
}

export const EMPTY_EDGE_BEZIER: EditorEdgeBezier = {
  control1X: 0,
  control1Y: 0,
  control2X: 0,
  control2Y: 0,
  endX: 0,
  endY: 0,
  startX: 0,
  startY: 0
};

export interface EditorEdge {
  bezier: EditorEdgeBezier;
  id: string;
  fromId: string;
  toId: string;
  accentColor?: string;
  isDimmed?: boolean;
}

export interface EditorGraphModel {
  childrenById: Record<string, string[]>;
  nodes: EditorNodeSummary[];
  nodeById: Record<string, EditorNodeSummary>;
  edges: EditorEdge[];
  warningsById: Record<string, ConversionWarning[]>;
  width: number;
  height: number;
}

export interface EditorViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}
