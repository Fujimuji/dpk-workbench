import { describe, expect, it } from 'vitest';
import { getWorkspaceInspectorChromeStyle } from '../features/workspace/inspector/WorkspaceInspectorPanel';
import type { WorkspaceNodeSummary } from '../features/workspace/graph/types';

function createNode(
  overrides: Partial<WorkspaceNodeSummary> & Pick<WorkspaceNodeSummary, 'id' | 'kind'>
): WorkspaceNodeSummary {
  const { id, kind, ...rest } = overrides;

  return {
    id,
    kind,
    label: overrides.label ?? id,
    sublabel: overrides.sublabel ?? '',
    selection: overrides.selection ?? { kind: 'start' },
    noteMarker: overrides.noteMarker ?? false,
    hasSettings: overrides.hasSettings ?? false,
    ...rest
  };
}

describe('workspace inspector panel helpers', () => {
  it('maps selected node accents into docked inspector chrome variables', () => {
    expect(
      getWorkspaceInspectorChromeStyle(
        createNode({
          id: 'level-0-cp-1',
          kind: 'checkpoint',
          accentColor: '#00aaff',
          accentSoftColor: 'rgba(0, 170, 255, 0.18)'
        })
      )
    ).toMatchObject({
      '--panel-accent': '#00aaff',
      '--panel-accent-soft': 'rgba(0, 170, 255, 0.18)',
      '--panel-accent-alt': '#00aaff',
      '--panel-accent-alt-soft': 'rgba(0, 170, 255, 0.18)'
    });
  });

  it('prefers explicit panel accent overrides for portal-pair style nodes', () => {
    expect(
      getWorkspaceInspectorChromeStyle(
        createNode({
          id: 'pair',
          kind: 'haxEffectPair',
          panelAccentColor: '#ff9f43',
          panelAccentSoftColor: 'rgba(255, 159, 67, 0.18)',
          panelAccentAltColor: '#7ddcff',
          panelAccentAltSoftColor: 'rgba(125, 220, 255, 0.18)'
        })
      )
    ).toMatchObject({
      '--panel-accent': '#ff9f43',
      '--panel-accent-soft': 'rgba(255, 159, 67, 0.18)',
      '--panel-accent-alt': '#7ddcff',
      '--panel-accent-alt-soft': 'rgba(125, 220, 255, 0.18)'
    });
  });
});
