import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

export type CommandPaletteCommandId =
  | 'switch-to-light-theme'
  | 'switch-to-dark-theme'
  | 'save-session'
  | 'open-session'
  | 'restore-recovery'
  | 'open-source'
  | 'open-output'
  | 'new-map'
  | 'load-hax-example'
  | 'load-momentum-example'
  | 'load-clipboard'
  | 'copy-output'
  | 'undo'
  | 'redo'
  | 'fit-graph'
  | 'open-guide'
  | 'show-shortcuts';

interface CommandPaletteBaseEntry {
  id: string;
  label: string;
  meta: string;
  order: number;
}

export interface CommandPaletteCommandEntry extends CommandPaletteBaseEntry {
  entryType: 'command';
  commandId: CommandPaletteCommandId;
  onSelect: () => void;
  searchTokens: string[];
}

export interface CommandPaletteNodeEntry extends CommandPaletteBaseEntry {
  entryType: 'node';
  checkpointNumber?: number;
  contextTokens: string[];
  isStack: boolean;
  kindAliases: string[];
  levelNumber?: number;
  node: WorkspaceNodeSummary;
  onSelect: () => void;
  primaryTokens: string[];
}

export type CommandPaletteEntry = CommandPaletteCommandEntry | CommandPaletteNodeEntry;

export interface CommandPaletteResults {
  commands: CommandPaletteCommandEntry[];
  nodes: CommandPaletteNodeEntry[];
  flatEntries: CommandPaletteEntry[];
}

interface BuildCommandPaletteCommandEntriesActions {
  onSwitchToDarkTheme: () => void;
  onSwitchToLightTheme: () => void;
  onCopyOutput: () => void;
  onFitGraph: () => void;
  onLoadHaxExample: () => void;
  onLoadClipboard: () => void;
  onLoadMomentumExample: () => void;
  onNewMap: () => void;
  onOpenSession: () => void;
  onOpenOutput: () => void;
  onOpenSource: () => void;
  onRedo: () => void;
  onRestoreRecovery: () => void;
  onSaveSession: () => void;
  onOpenGuide: () => void;
  onShowShortcuts: () => void;
  onUndo: () => void;
}

export interface BuildCommandPaletteCommandEntriesOptions {
  canSwitchToDarkTheme: boolean;
  canSwitchToLightTheme: boolean;
  canCopyOutput: boolean;
  canFitGraph: boolean;
  canOpenOutput: boolean;
  canRedo: boolean;
  canRestoreRecovery: boolean;
  canSaveSession: boolean;
  canShowShortcuts: boolean;
  canUndo: boolean;
  actions: BuildCommandPaletteCommandEntriesActions;
}
