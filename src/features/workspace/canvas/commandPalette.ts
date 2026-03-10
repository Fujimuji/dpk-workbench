import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import type {
  BuildCommandPaletteCommandEntriesOptions,
  CommandPaletteCommandId,
  CommandPaletteCommandEntry,
  CommandPaletteEntry,
  CommandPaletteNodeEntry,
  CommandPaletteResults
} from '@/features/workspace/canvas/commandPaletteTypes';

type NodeKindIntent =
  | 'spawn'
  | 'level'
  | 'checkpoint'
  | 'effect'
  | 'mission'
  | 'touch'
  | 'ability'
  | 'lava'
  | 'bot'
  | 'impulse'
  | 'portal';
export type {
  BuildCommandPaletteCommandEntriesOptions,
  CommandPaletteCommandEntry,
  CommandPaletteEntry,
  CommandPaletteNodeEntry,
  CommandPaletteResults
} from '@/features/workspace/canvas/commandPaletteTypes';

interface ParsedNodeQuery {
  checkpointNumber: number | null;
  freeTerms: string[];
  levelNumber: number | null;
  targetIntent: NodeKindIntent | null;
}

interface QueryIntentToken {
  index: number;
  intent: NodeKindIntent;
  score: number;
}

const NODE_KIND_INTENT_ALIASES: Record<string, NodeKindIntent> = {
  ability: 'ability',
  bot: 'bot',
  checkpoint: 'checkpoint',
  checkpoints: 'checkpoint',
  cp: 'checkpoint',
  effect: 'effect',
  impulse: 'impulse',
  effects: 'effect',
  lava: 'lava',
  level: 'level',
  levels: 'level',
  mission: 'mission',
  missions: 'mission',
  spawn: 'spawn',
  start: 'spawn',
  touch: 'touch',
  portal: 'portal'
};

function getNodeKindLabel(node: WorkspaceNodeSummary): string {
  switch (node.kind) {
    case 'start':
      return 'Spawn';
    case 'level':
      return 'Level';
    case 'checkpoint':
      return 'Checkpoint';
    case 'momentumEntities':
      return 'Entities';
    case 'haxEffects':
      return 'Effects';
    case 'haxMissions':
      return 'Missions';
    case 'haxMission':
      return 'Mission';
    case 'touchOrb':
      return 'Touch Orb';
    case 'abilityOrb':
      return 'Ability Orb';
    case 'lavaOrb':
      return 'Lava Orb';
    case 'bot':
      return 'Bot';
    case 'impulse':
      return 'Impulse';
    case 'portal':
      return 'Portal';
    case 'haxEffect':
      return 'Hax Effect';
    case 'haxEffectPair':
      return 'Hax Effect Pair';
    default:
      return node.label;
  }
}

function getNodeKindAliases(node: WorkspaceNodeSummary): string[] {
  switch (node.kind) {
    case 'start':
      return ['spawn', 'start'];
    case 'level':
      return ['level'];
    case 'checkpoint':
      return ['checkpoint', 'cp'];
    case 'momentumEntities':
      return ['entities', 'entity', 'touch', 'ability', 'lava', 'bot', 'impulse', 'portal'];
    case 'haxEffects':
      return ['hax', 'effects', 'effect'];
    case 'haxMissions':
      return ['hax', 'missions', 'mission'];
    case 'haxMission':
      return ['hax', 'mission'];
    case 'touchOrb':
      return ['touch', 'orb'];
    case 'abilityOrb':
      return ['ability', 'orb'];
    case 'lavaOrb':
      return ['lava', 'orb'];
    case 'bot':
      return ['bot'];
    case 'impulse':
      return ['impulse'];
    case 'portal':
      return ['portal'];
    case 'haxEffect':
      return ['hax', 'effect'];
    case 'haxEffectPair':
      return ['hax', 'effect', 'pair', 'portal', 'zipline'];
    default:
      return [];
  }
}

function getNodeLocationTokens(node: WorkspaceNodeSummary): string[] {
  const tokens: string[] = [];
  if (node.levelIndex !== undefined) {
    tokens.push(`Level ${node.levelIndex + 1}`, `L${node.levelIndex + 1}`);
  }

  const checkpointNumber = node.checkpointNumber ?? (node.checkpointIndex !== undefined ? node.checkpointIndex + 1 : null);
  if (checkpointNumber !== null) {
    tokens.push(`Checkpoint ${checkpointNumber}`, `CP ${checkpointNumber}`);
  }

  return tokens;
}

function getNodeMeta(node: WorkspaceNodeSummary): string {
  if (node.kind === 'start' || node.kind === 'level') {
    return '';
  }

  const parts: string[] = [];
  if (node.levelIndex !== undefined) {
    parts.push(`Level ${node.levelIndex + 1}`);
  }

  if (node.kind !== 'checkpoint') {
    const checkpointNumber = node.checkpointNumber ?? (node.checkpointIndex !== undefined ? node.checkpointIndex + 1 : null);
    if (checkpointNumber !== null) {
      parts.push(`Checkpoint ${checkpointNumber}`);
    }
  }

  return parts.join(' · ');
}

function getIntentSpecificity(intent: NodeKindIntent): number {
  switch (intent) {
    case 'spawn':
      return 0;
    case 'level':
      return 1;
    case 'checkpoint':
      return 2;
    case 'effect':
    case 'mission':
      return 3;
    case 'touch':
    case 'ability':
    case 'lava':
    case 'bot':
    case 'impulse':
    case 'portal':
      return 3;
  }
}

function isKindAliasToken(token: string): boolean {
  return token in NODE_KIND_INTENT_ALIASES;
}

function matchesIntent(entry: CommandPaletteNodeEntry, intent: NodeKindIntent | null): boolean {
  if (!intent) {
    return true;
  }

  switch (intent) {
    case 'spawn':
      return entry.node.kind === 'start';
    case 'level':
      return entry.node.kind === 'level';
    case 'checkpoint':
      return entry.node.kind === 'checkpoint';
    case 'mission':
      return entry.node.kind === 'haxMissions' || entry.node.kind === 'haxMission';
    case 'touch':
      return entry.node.kind === 'momentumEntities' || entry.node.kind === 'touchOrb';
    case 'ability':
      return entry.node.kind === 'momentumEntities' || entry.node.kind === 'abilityOrb';
    case 'lava':
      return entry.node.kind === 'momentumEntities' || entry.node.kind === 'lavaOrb';
    case 'bot':
      return entry.node.kind === 'momentumEntities' || entry.node.kind === 'bot';
    case 'impulse':
      return entry.node.kind === 'momentumEntities' || entry.node.kind === 'impulse';
    case 'portal':
      return entry.node.kind === 'momentumEntities' || entry.node.kind === 'portal';
    case 'effect':
      return (
        entry.node.kind === 'haxEffects' ||
        entry.node.kind === 'haxEffect' ||
        entry.node.kind === 'haxEffectPair'
      );
  }
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase();
}

function getTokenRank(token: string, query: string): number | null {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return null;
  }

  if (normalized === query) {
    return 0;
  }

  if (normalized.startsWith(query)) {
    return 1;
  }

  if (normalized.split(/[\s/-]+/).some((part) => part.startsWith(query))) {
    return 2;
  }

  if (normalized.includes(query)) {
    return 3;
  }

  return null;
}

function getBestTokenRank(tokens: string[], query: string): number | null {
  let bestRank: number | null = null;

  tokens.forEach((token) => {
    const tokenRank = getTokenRank(token, query);
    if (tokenRank === null) {
      return;
    }

    if (bestRank === null || tokenRank < bestRank) {
      bestRank = tokenRank;
    }
  });

  return bestRank;
}

function parseNodeQuery(query: string): ParsedNodeQuery {
  const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const consumedIndexes = new Set<number>();
  const intentTokens: QueryIntentToken[] = [];
  let levelNumber: number | null = null;
  let checkpointNumber: number | null = null;

  parts.forEach((part, index) => {
    const alias = NODE_KIND_INTENT_ALIASES[part];
    if (!alias) {
      return;
    }

    consumedIndexes.add(index);

    intentTokens.push({
      index,
      intent: alias,
      score: getIntentSpecificity(alias)
    });

    const nextPart = parts[index + 1];
    const nextNumber = Number(nextPart);
    if (!Number.isInteger(nextNumber)) {
      return;
    }

    if (alias === 'level') {
      levelNumber = nextNumber;
      consumedIndexes.add(index + 1);
    }

    if (alias === 'checkpoint') {
      checkpointNumber = nextNumber;
      consumedIndexes.add(index + 1);
    }
  });

  const targetIntent = intentTokens
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return right.index - left.index;
    })[0]?.intent ?? null;

  return {
    checkpointNumber,
    freeTerms: parts.filter((part, index) => !consumedIndexes.has(index) && !isKindAliasToken(part)),
    levelNumber,
    targetIntent
  };
}

function getCommandEntryRank(entry: CommandPaletteCommandEntry, query: string): number | null {
  if (!query) {
    return entry.order;
  }

  const phraseRank = getBestTokenRank(entry.searchTokens, query);
  const queryTerms = query.split(/\s+/).filter(Boolean);
  const termRanks = queryTerms.map((term) => getBestTokenRank(entry.searchTokens, term));
  if (termRanks.some((rank) => rank === null)) {
    return phraseRank;
  }

  const termScore = termRanks.reduce<number>((total, rank) => total + (rank ?? 0), 0);
  const phraseScore = (phraseRank ?? 4) * 100;

  return phraseScore + termScore;
}

function getNodeEntryRank(entry: CommandPaletteNodeEntry, query: string): number | null {
  if (!query) {
    return entry.order;
  }

  const parsed = parseNodeQuery(query);
  if (!matchesIntent(entry, parsed.targetIntent)) {
    return null;
  }

  if (parsed.levelNumber !== null && entry.levelNumber !== parsed.levelNumber) {
    return null;
  }

  if (parsed.checkpointNumber !== null && entry.checkpointNumber !== parsed.checkpointNumber) {
    return null;
  }

  if (parsed.freeTerms.length === 0) {
    return entry.order;
  }

  const termRanks = parsed.freeTerms.map((term) => {
    const primaryRank = getBestTokenRank(entry.primaryTokens, term);
    if (primaryRank !== null) {
      return primaryRank;
    }

    const contextRank = getBestTokenRank(entry.contextTokens, term);
    return contextRank === null ? null : contextRank + 10;
  });

  if (termRanks.some((rank) => rank === null)) {
    return null;
  }

  return termRanks.reduce<number>((total, rank) => total + (rank ?? 0), 0);
}

function sortEntries<T extends CommandPaletteEntry>(
  entries: T[],
  query: string,
  getRank: (entry: T, normalizedQuery: string) => number | null
): T[] {
  return [...entries].sort((left, right) => {
    const leftRank = getRank(left, query);
    const rightRank = getRank(right, query);

    if (leftRank === null && rightRank === null) {
      return left.order - right.order;
    }

    if (leftRank === null) {
      return 1;
    }

    if (rightRank === null) {
      return -1;
    }

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (left.label.length !== right.label.length) {
      return left.label.length - right.label.length;
    }

    return left.label.localeCompare(right.label);
  });
}

export function createCommandPaletteNodeEntries(nodes: WorkspaceNodeSummary[]): CommandPaletteNodeEntry[] {
  return nodes.map((node, index) => ({
    checkpointNumber: node.checkpointNumber ?? (node.checkpointIndex !== undefined ? node.checkpointIndex + 1 : undefined),
    contextTokens: getNodeLocationTokens(node),
    entryType: 'node',
    id: node.id,
    isStack: false,
    kindAliases: getNodeKindAliases(node),
    label: node.label,
    levelNumber: node.levelIndex !== undefined ? node.levelIndex + 1 : undefined,
    meta: getNodeMeta(node),
    node,
    onSelect: () => {},
    order: index,
    primaryTokens: [
      node.label,
      node.sublabel,
      getNodeKindLabel(node),
      ...getNodeKindAliases(node)
    ].filter(Boolean)
  }));
}

interface CreateCommandPaletteCommandEntryOptions {
  commandId: CommandPaletteCommandId;
  label: string;
  meta: string;
  order: number;
  keywords?: string[];
  onSelect: () => void;
}

export function createCommandPaletteCommandEntry({
  commandId,
  keywords = [],
  label,
  meta,
  onSelect,
  order
}: CreateCommandPaletteCommandEntryOptions): CommandPaletteCommandEntry {
  return {
    entryType: 'command',
    id: commandId,
    commandId,
    label,
    meta,
    onSelect,
    order,
    searchTokens: [label, meta, ...keywords]
  };
}

export function buildCommandPaletteCommandEntries({
  actions,
  canSwitchToDarkTheme,
  canSwitchToLightTheme,
  canCopyOutput,
  canFitGraph,
  canOpenOutput,
  canRedo,
  canRestoreRecovery,
  canSaveSession,
  canShowShortcuts,
  canUndo
}: BuildCommandPaletteCommandEntriesOptions): CommandPaletteCommandEntry[] {
  const entries: CommandPaletteCommandEntry[] = [];
  let order = 0;

  if (canSwitchToLightTheme) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'switch-to-light-theme',
        label: 'Switch to Light Theme',
        meta: 'Use the white workspace theme',
        keywords: ['light', 'theme', 'appearance', 'white'],
        onSelect: actions.onSwitchToLightTheme,
        order: order++
      })
    );
  }

  if (canSwitchToDarkTheme) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'switch-to-dark-theme',
        label: 'Switch to Dark Theme',
        meta: 'Use the dark workspace theme',
        keywords: ['dark', 'theme', 'appearance'],
        onSelect: actions.onSwitchToDarkTheme,
        order: order++
      })
    );
  }

  if (canSaveSession) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'save-session',
        label: 'Save Session',
        meta: 'Download the current workspace session as JSON',
        keywords: ['save', 'session', 'download', 'project'],
        onSelect: actions.onSaveSession,
        order: order++
      })
    );
  }

  entries.push(
    createCommandPaletteCommandEntry({
      commandId: 'open-session',
      label: 'Open Session',
      meta: 'Load a saved workspace session JSON file',
      keywords: ['open', 'session', 'upload', 'project', 'file'],
      onSelect: actions.onOpenSession,
      order: order++
    })
  );

  if (canRestoreRecovery) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'restore-recovery',
        label: 'Restore Recovery',
        meta: 'Restore the browser recovery snapshot',
        keywords: ['restore', 'recovery', 'autosave', 'crash'],
        onSelect: actions.onRestoreRecovery,
        order: order++
      })
    );
  }

  entries.push(
    createCommandPaletteCommandEntry({
      commandId: 'open-source',
      label: 'Open Source',
      meta: 'Open the source overlay',
      keywords: ['source', 'overlay', 'import', 'input'],
      onSelect: actions.onOpenSource,
      order: order++
    })
  );

  if (canOpenOutput) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'open-output',
        label: 'Open Output',
        meta: 'Open the output overlay',
        keywords: ['output', 'overlay', 'render', 'preview'],
        onSelect: actions.onOpenOutput,
        order: order++
      })
    );
  }

  entries.push(
    createCommandPaletteCommandEntry({
      commandId: 'new-map',
      label: 'New Map',
      meta: 'Create a blank draft map',
      keywords: ['new', 'draft', 'map'],
      onSelect: actions.onNewMap,
      order: order++
    }),
    createCommandPaletteCommandEntry({
      commandId: 'load-hax-example',
      label: 'Load Hax Example',
      meta: 'Import the bundled clean Hax example',
      keywords: ['example', 'sample', 'import', 'hax'],
      onSelect: actions.onLoadHaxExample,
      order: order++
    }),
    createCommandPaletteCommandEntry({
      commandId: 'load-momentum-example',
      label: 'Load Momentum Example',
      meta: 'Import the bundled clean Momentum example',
      keywords: ['example', 'sample', 'import', 'momentum', 'project momentum'],
      onSelect: actions.onLoadMomentumExample,
      order: order++
    }),
    createCommandPaletteCommandEntry({
      commandId: 'load-clipboard',
      label: 'Load from Clipboard',
      meta: 'Import Workshop text from the clipboard',
      keywords: ['clipboard', 'paste', 'import'],
      onSelect: actions.onLoadClipboard,
      order: order++
    })
  );

  if (canCopyOutput) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'copy-output',
        label: 'Copy Output',
        meta: 'Copy the rendered Project Momentum text',
        keywords: ['copy', 'output', 'clipboard', 'render'],
        onSelect: actions.onCopyOutput,
        order: order++
      })
    );
  }

  if (canUndo) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'undo',
        label: 'Undo',
        meta: 'Revert the last map change',
        keywords: ['undo', 'history'],
        onSelect: actions.onUndo,
        order: order++
      })
    );
  }

  if (canRedo) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'redo',
        label: 'Redo',
        meta: 'Restore the last undone map change',
        keywords: ['redo', 'history'],
        onSelect: actions.onRedo,
        order: order++
      })
    );
  }

  if (canFitGraph) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'fit-graph',
        label: 'Fit Graph',
        meta: 'Reset the canvas view to the full graph',
        keywords: ['fit', 'graph', 'view', 'canvas'],
        onSelect: actions.onFitGraph,
        order: order++
      })
    );
  }

  entries.push(
    createCommandPaletteCommandEntry({
      commandId: 'open-guide',
      label: 'Open Guide',
      meta: 'Open the interactive workflow guide',
      keywords: ['guide', 'tour', 'walkthrough', 'onboarding', 'help', 'interactive'],
      onSelect: actions.onOpenGuide,
      order: order++
    })
  );

  if (canShowShortcuts) {
    entries.push(
      createCommandPaletteCommandEntry({
        commandId: 'show-shortcuts',
        label: 'Show Keyboard Shortcuts',
        meta: 'Open the existing canvas shortcut help',
        keywords: ['shortcuts', 'keyboard', 'help'],
        onSelect: actions.onShowShortcuts,
        order: order++
      })
    );
  }

  return entries;
}

export function filterCommandPaletteEntries(
  commands: CommandPaletteCommandEntry[],
  nodes: CommandPaletteNodeEntry[],
  query: string
): CommandPaletteResults {
  const normalizedQuery = query.trim().toLowerCase();
  const sortedCommands = sortEntries(commands, normalizedQuery, getCommandEntryRank)
    .filter((entry) => getCommandEntryRank(entry, normalizedQuery) !== null);
  const sortedNodes = sortEntries(nodes, normalizedQuery, getNodeEntryRank)
    .filter((entry) => getNodeEntryRank(entry, normalizedQuery) !== null);

  return {
    commands: sortedCommands,
    nodes: sortedNodes,
    flatEntries: [...sortedCommands, ...sortedNodes]
  };
}
