import { describe, expect, it, vi } from 'vitest';
import {
  buildCommandPaletteCommandEntries,
  createCommandPaletteNodeEntries,
  createCommandPaletteCommandEntry,
  filterCommandPaletteEntries
} from '../features/workspace/canvas/commandPalette';
import type { EditorNodeSummary } from '../features/workspace/graph/types';

function createNode(overrides: Partial<EditorNodeSummary> & Pick<EditorNodeSummary, 'id' | 'kind'>): EditorNodeSummary {
  const { id, kind, ...rest } = overrides;

  return {
    id,
    kind,
    label: overrides.label ?? overrides.id,
    sublabel: overrides.sublabel ?? '',
    selection: overrides.selection ?? { kind: 'start' },
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 120,
    height: overrides.height ?? 34,
    portInX: overrides.portInX ?? 0,
    portOutX: overrides.portOutX ?? 120,
    noteMarker: overrides.noteMarker ?? false,
    hasSettings: overrides.hasSettings ?? false,
    ...rest
  };
}

describe('command palette helpers', () => {
  it('indexes visible nodes for search without stack/group aliases', () => {
    const entries = createCommandPaletteNodeEntries([
      createNode({
        id: 'level-0-cp-1-touch-0',
        kind: 'touchOrb',
        label: 'Touch Orb 1',
        selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 },
        levelIndex: 0,
        checkpointIndex: 0,
        checkpointNumber: 1
      })
    ]);

    const results = filterCommandPaletteEntries([], entries, 'touch');

    expect(results.nodes).toHaveLength(1);
    expect(results.nodes[0].id).toBe('level-0-cp-1-touch-0');
    expect(results.nodes[0].meta).toBe('Level 1 · Checkpoint 1');
    expect(filterCommandPaletteEntries([], entries, 'group').nodes).toEqual([]);
  });

  it('indexes PM entities wrappers with searchable entity aliases', () => {
    const entries = createCommandPaletteNodeEntries([
      createNode({
        id: 'level-0-cp-1-momentumEntities',
        kind: 'momentumEntities',
        label: 'Entities',
        selection: { kind: 'momentumEntities', levelIndex: 0, checkpointIndex: 0 },
        levelIndex: 0,
        checkpointIndex: 0,
        checkpointNumber: 1
      })
    ]);

    expect(filterCommandPaletteEntries([], entries, 'entities').nodes.map((entry) => entry.id)).toEqual([
      'level-0-cp-1-momentumEntities'
    ]);
    expect(filterCommandPaletteEntries([], entries, 'checkpoint 1 bot').nodes.map((entry) => entry.id)).toEqual([
      'level-0-cp-1-momentumEntities'
    ]);
  });

  it('keeps commands and nodes in separate ranked sections', () => {
    const commands = [
      createCommandPaletteCommandEntry({
        commandId: 'fit-graph',
        label: 'Fit Graph',
        meta: 'Reset the canvas view to the full graph',
        onSelect: vi.fn(),
        order: 0
      }),
      createCommandPaletteCommandEntry({
        commandId: 'open-source',
        label: 'Open Source',
        meta: 'Open the source overlay',
        onSelect: vi.fn(),
        order: 1
      })
    ];
    const nodes = createCommandPaletteNodeEntries([
      createNode({
        id: 'level-0',
        kind: 'level',
        label: 'Level 1',
        selection: { kind: 'level', levelIndex: 0 },
        levelIndex: 0
      }),
      createNode({
        id: 'level-0-cp-1',
        kind: 'checkpoint',
        label: 'Checkpoint 1',
        selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
        levelIndex: 0,
        checkpointIndex: 0,
        checkpointNumber: 1
      })
    ]);

    const results = filterCommandPaletteEntries(commands, nodes, 'open');

    expect(results.commands.map((entry) => entry.commandId)).toEqual(['open-source']);
    expect(results.nodes).toEqual([]);
  });

  it('matches multi-term location queries across node search tokens', () => {
    const nodes = createCommandPaletteNodeEntries([
      createNode({
        id: 'level-1-cp-4',
        kind: 'checkpoint',
        label: 'Checkpoint 4',
        selection: { kind: 'checkpoint', levelIndex: 1, checkpointIndex: 3 },
        levelIndex: 1,
        checkpointIndex: 3,
        checkpointNumber: 4
      })
    ]);

    const results = filterCommandPaletteEntries([], nodes, 'level 2 checkpoint 4');

    expect(results.nodes).toHaveLength(1);
    expect(results.nodes[0].id).toBe('level-1-cp-4');
  });

  it('treats pure kind queries as node-type filters', () => {
    const nodes = createCommandPaletteNodeEntries([
      createNode({
        id: 'level-0',
        kind: 'level',
        label: 'Level 1',
        selection: { kind: 'level', levelIndex: 0 },
        levelIndex: 0
      }),
      createNode({
        id: 'level-0-cp-1',
        kind: 'checkpoint',
        label: 'Checkpoint 1',
        selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 0 },
        levelIndex: 0,
        checkpointIndex: 0,
        checkpointNumber: 1
      }),
      createNode({
        id: 'level-0-cp-1-touch-0',
        kind: 'touchOrb',
        label: 'Touch Orb 1',
        selection: { kind: 'touchOrb', levelIndex: 0, checkpointIndex: 0, orbIndex: 0 },
        levelIndex: 0,
        checkpointIndex: 0,
        checkpointNumber: 1,
        orbIndex: 0
      })
    ]);

    expect(filterCommandPaletteEntries([], nodes, 'level').nodes.map((entry) => entry.id)).toEqual(['level-0']);
    expect(filterCommandPaletteEntries([], nodes, 'checkpoint').nodes.map((entry) => entry.id)).toEqual(['level-0-cp-1']);
    expect(filterCommandPaletteEntries([], nodes, 'touch').nodes.map((entry) => entry.id)).toEqual(['level-0-cp-1-touch-0']);
  });

  it('uses deeper type intent with location constraints for mixed queries', () => {
    const nodes = createCommandPaletteNodeEntries([
      createNode({
        id: 'level-1-cp-4',
        kind: 'checkpoint',
        label: 'Checkpoint 4',
        selection: { kind: 'checkpoint', levelIndex: 1, checkpointIndex: 3 },
        levelIndex: 1,
        checkpointIndex: 3,
        checkpointNumber: 4
      }),
      createNode({
        id: 'level-1-cp-4-bot',
        kind: 'bot',
        label: 'Bot',
        selection: { kind: 'bot', levelIndex: 1, checkpointIndex: 3 },
        levelIndex: 1,
        checkpointIndex: 3,
        checkpointNumber: 4
      })
    ]);

    expect(filterCommandPaletteEntries([], nodes, 'level 2 checkpoint 4').nodes.map((entry) => entry.id)).toEqual([
      'level-1-cp-4'
    ]);
    expect(filterCommandPaletteEntries([], nodes, 'level 2 checkpoint 4 bot').nodes.map((entry) => entry.id)).toEqual([
      'level-1-cp-4-bot'
    ]);
  });

  it('builds the allowed global command set and executes callbacks', () => {
    const onOpenSource = vi.fn();
    const onOpenGuide = vi.fn();
    const entries = buildCommandPaletteCommandEntries({
      actions: {
        onSwitchToDarkTheme: vi.fn(),
        onSwitchToLightTheme: vi.fn(),
        onCopyOutput: vi.fn(),
        onFitGraph: vi.fn(),
        onLoadHaxExample: vi.fn(),
        onLoadClipboard: vi.fn(),
        onLoadMomentumExample: vi.fn(),
        onNewMap: vi.fn(),
        onOpenSession: vi.fn(),
        onOpenOutput: vi.fn(),
        onOpenSource,
        onRedo: vi.fn(),
        onRestoreRecovery: vi.fn(),
        onSaveSession: vi.fn(),
        onOpenGuide,
        onShowShortcuts: vi.fn(),
        onUndo: vi.fn()
      },
      canSwitchToDarkTheme: false,
      canSwitchToLightTheme: false,
      canCopyOutput: false,
      canFitGraph: false,
      canOpenOutput: false,
      canRedo: false,
      canRestoreRecovery: false,
      canSaveSession: true,
      canShowShortcuts: true,
      canUndo: false
    });

    expect(entries.map((entry) => entry.commandId)).toEqual([
      'save-session',
      'open-session',
      'open-source',
      'new-map',
      'load-hax-example',
      'load-momentum-example',
      'load-clipboard',
      'open-guide',
      'show-shortcuts'
    ]);

    entries[2].onSelect();
    entries[7].onSelect();

    expect(onOpenSource).toHaveBeenCalledTimes(1);
    expect(onOpenGuide).toHaveBeenCalledTimes(1);
  });

  it('does not expose layout switch commands now that the navigator is primary', () => {
    const entries = buildCommandPaletteCommandEntries({
      actions: {
        onSwitchToDarkTheme: vi.fn(),
        onSwitchToLightTheme: vi.fn(),
        onCopyOutput: vi.fn(),
        onFitGraph: vi.fn(),
        onLoadHaxExample: vi.fn(),
        onLoadClipboard: vi.fn(),
        onLoadMomentumExample: vi.fn(),
        onNewMap: vi.fn(),
        onOpenSession: vi.fn(),
        onOpenOutput: vi.fn(),
        onOpenSource: vi.fn(),
        onRedo: vi.fn(),
        onRestoreRecovery: vi.fn(),
        onSaveSession: vi.fn(),
        onOpenGuide: vi.fn(),
        onShowShortcuts: vi.fn(),
        onUndo: vi.fn()
      },
      canSwitchToDarkTheme: false,
      canSwitchToLightTheme: false,
      canCopyOutput: false,
      canFitGraph: false,
      canOpenOutput: false,
      canRedo: false,
      canRestoreRecovery: false,
      canSaveSession: false,
      canShowShortcuts: false,
      canUndo: false
    });

    expect(entries.some((entry) => entry.commandId === 'switch-to-light-theme')).toBe(false);
    expect(entries.some((entry) => entry.commandId === 'switch-to-dark-theme')).toBe(false);
    expect(entries.map((entry) => entry.commandId)).toEqual([
      'open-session',
      'open-source',
      'new-map',
      'load-hax-example',
      'load-momentum-example',
      'load-clipboard',
      'open-guide'
    ]);
  });

  it('shows only the opposite-theme command and executes its callback', () => {
    const onSwitchToLightTheme = vi.fn();
    const entries = buildCommandPaletteCommandEntries({
      actions: {
        onSwitchToDarkTheme: vi.fn(),
        onSwitchToLightTheme,
        onCopyOutput: vi.fn(),
        onFitGraph: vi.fn(),
        onLoadHaxExample: vi.fn(),
        onLoadClipboard: vi.fn(),
        onLoadMomentumExample: vi.fn(),
        onNewMap: vi.fn(),
        onOpenSession: vi.fn(),
        onOpenOutput: vi.fn(),
        onOpenSource: vi.fn(),
        onRedo: vi.fn(),
        onRestoreRecovery: vi.fn(),
        onSaveSession: vi.fn(),
        onOpenGuide: vi.fn(),
        onShowShortcuts: vi.fn(),
        onUndo: vi.fn()
      },
      canSwitchToDarkTheme: false,
      canSwitchToLightTheme: true,
      canCopyOutput: false,
      canFitGraph: false,
      canOpenOutput: false,
      canRedo: false,
      canRestoreRecovery: false,
      canSaveSession: false,
      canShowShortcuts: false,
      canUndo: false
    });

    expect(entries.map((entry) => entry.commandId)).toEqual([
      'switch-to-light-theme',
      'open-session',
      'open-source',
      'new-map',
      'load-hax-example',
      'load-momentum-example',
      'load-clipboard',
      'open-guide'
    ]);

    entries[0].onSelect();
    expect(onSwitchToLightTheme).toHaveBeenCalledTimes(1);
  });
});
