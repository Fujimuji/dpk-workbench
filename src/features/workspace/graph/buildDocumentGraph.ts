import type { WorkspaceDocument } from '@/domain/document/types';
import { getHaxLevelStartIndexes } from '@/domain/import/hax/levelLayout';
import {
  buildVisibleHaxCheckpointChildren,
  buildVisibleHaxSpawnChildren
} from '@/features/workspace/hax/effectNodes';
import { getDefaultLevelColor, getWorkshopColorCss } from '@/shared/workshop/colors';
import { buildEditorGraph } from '@/features/workspace/graph/buildEditorGraph';
import {
  EDITOR_BAND_MIN_HEIGHT,
  EDITOR_COL_0_X,
  EDITOR_COL_3_X
} from '@/features/workspace/graph/buildEditorGraph';
import {
  createNode,
  getNodeVisualHeight,
  getNodeWidth
} from '@/features/workspace/graph/buildLevelGraph.shared';
import { computeSwimlaneTreeLayout, type SwimlaneTreeNode } from '@/features/workspace/graph/computeSwimlaneLayout';
import {
  finalizeEditorGraph
} from '@/features/workspace/graph/finalizeGraph';
import { getCheckpointNodeId } from '@/features/workspace/graph/nodeIds';
import { EMPTY_EDGE_BEZIER, type EditorEdge, type EditorGraphModel, type EditorNodeSummary } from '@/features/workspace/graph/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import type { ChildGroupState, EditorLayoutState, EditorSelection } from '@/features/workspace/types';

const HAX_CHILD_WRAPPER_MEMBER_INDENT = 150;
const HAX_SPAWN_WRAPPER_OFFSET = 92;
const HAX_SPAWN_SECTION_GAP = 40;

function buildHaxTree(
  document: Extract<WorkspaceDocument, { format: 'hax' }>,
  _childGroups: ChildGroupState
): SwimlaneTreeNode {
  function toChildTreeNode(entry: ReturnType<typeof buildVisibleHaxCheckpointChildren>[number]): SwimlaneTreeNode {
    return {
      id: entry.id,
      kind: entry.kind,
      depth: 3 as const,
      visualHeight: getNodeVisualHeight(entry.kind),
      children: entry.children.map((child) => ({
        id: child.id,
        kind: child.kind,
        depth: 3 as const,
        visualHeight: getNodeVisualHeight(child.kind),
        children: [],
        bandHeight: 0
      })),
      bandHeight: 0
    };
  }

  const levelStarts = getHaxLevelStartIndexes(document);
  const levelNodes = levelStarts.map((startIndex, levelIndex) => {
    const nextStart = levelStarts[levelIndex + 1] ?? document.checkpoints.length;
    const checkpointNodes = document.checkpoints.slice(startIndex, nextStart).map((checkpoint, checkpointOffset) => {
      const checkpointIndex = checkpointOffset;
      const checkpointId = getCheckpointNodeId(levelIndex, checkpointIndex);
      const childNodes = buildVisibleHaxCheckpointChildren(
        levelIndex,
        checkpointIndex,
        checkpoint.effects,
        checkpoint.missions,
        _childGroups
      ).map(toChildTreeNode);

      return {
        id: checkpointId,
        kind: 'checkpoint' as const,
        depth: 2 as const,
        visualHeight: getNodeVisualHeight('checkpoint'),
        children: childNodes,
        bandHeight: 0
      };
    });

    return {
      id: `level-${levelIndex}`,
      kind: 'level' as const,
      depth: 1 as const,
      visualHeight: getNodeVisualHeight('level'),
      children: checkpointNodes,
      bandHeight: 0
    };
  });

  return {
    id: 'root',
    kind: 'start',
    depth: 0,
    visualHeight: getNodeVisualHeight('start'),
    children: levelNodes,
    bandHeight: 0
  };
}

function getHaxSpawnSubtreeShift(
  visibleSpawnChildren: ReturnType<typeof buildVisibleHaxSpawnChildren>
): number {
  if (visibleSpawnChildren.length === 0) {
    return 0;
  }

  const nodeCount = visibleSpawnChildren.reduce((sum, wrapper) => sum + 1 + wrapper.children.length, 0);
  return HAX_SPAWN_WRAPPER_OFFSET + (nodeCount * EDITOR_BAND_MIN_HEIGHT) + HAX_SPAWN_SECTION_GAP;
}

function buildHaxEditorGraph(
  document: Extract<WorkspaceDocument, { format: 'hax' }>,
  selection: EditorSelection | null,
  layout: EditorLayoutState,
  childGroups: ChildGroupState,
  focusedCheckpointId: string | null,
  isFocusModeEnabled: boolean
): EditorGraphModel {
  const nodes: EditorNodeSummary[] = [];
  const edges: EditorEdge[] = [];
  const warningsById: EditorGraphModel['warningsById'] = {};
  const defaults = {};
  const swimlaneLayout = computeSwimlaneTreeLayout(buildHaxTree(document, childGroups));

  nodes.push(createNode({
    id: 'root',
    kind: 'start',
    label: 'Spawn',
    sublabel: 'Hax start',
    selection: { kind: 'start' },
    x: swimlaneLayout.rootCenter.x,
    y: swimlaneLayout.rootCenter.y,
    width: getNodeWidth('start', 'Spawn', 'Hax start'),
    height: getNodeVisualHeight('start'),
    noteMarker: false,
    hasSettings: true
  }, layout, defaults));
  warningsById.root = [];

  const visibleSpawnChildren = buildVisibleHaxSpawnChildren(document.spawn.effects);
  const spawnSubtreeShift = getHaxSpawnSubtreeShift(visibleSpawnChildren);
  visibleSpawnChildren.forEach((entry) => {
    const wrapperX = EDITOR_COL_3_X;
    const wrapperY = swimlaneLayout.rootCenter.y + HAX_SPAWN_WRAPPER_OFFSET;

    nodes.push(createNode({
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      sublabel: entry.sublabel,
      iconKey: entry.iconKey,
      selection: entry.selection,
      parentId: 'root',
      x: wrapperX,
      y: wrapperY,
      width: getNodeWidth(entry.kind, entry.label, entry.sublabel),
      height: getNodeVisualHeight(entry.kind),
      accentColor: entry.accentColor,
      accentSoftColor: entry.accentSoftColor,
      noteMarker: false,
      hasSettings: true
    }, layout, {
      [entry.id]: {
        x: wrapperX,
        y: wrapperY
      }
    }));
    warningsById[entry.id] = [];
    edges.push({
      id: `edge-root-${entry.id}`,
      fromId: 'root',
      toId: entry.id,
      bezier: { ...EMPTY_EDGE_BEZIER },
      accentColor: entry.accentColor
    });

    entry.children.forEach((child) => {
      const isPortalPair =
        child.kind === 'haxEffectPair' &&
        (child.selection.kind === 'haxSpawnPortalPair' || child.selection.kind === 'haxPortalPair');
      const childIndex = entry.children.indexOf(child);
      const childBaseX = wrapperX + HAX_CHILD_WRAPPER_MEMBER_INDENT;
      const childBaseY = wrapperY + ((childIndex + 1) * EDITOR_BAND_MIN_HEIGHT);

      nodes.push(createNode({
        id: child.id,
        kind: child.kind,
        label: child.label,
        sublabel: child.sublabel,
        iconKey: child.iconKey,
        selection: child.selection,
        parentId: entry.id,
        x: childBaseX,
        y: childBaseY,
        width: getNodeWidth(child.kind, child.label, child.sublabel),
        height: getNodeVisualHeight(child.kind),
        overlayWidth: isPortalPair ? 620 : undefined,
        overlayHeight: isPortalPair ? 460 : undefined,
        accentColor: child.accentColor,
        accentSoftColor: child.accentSoftColor,
        panelAccentColor: isPortalPair ? '#ff9f43' : undefined,
        panelAccentSoftColor: isPortalPair ? 'rgba(255, 159, 67, 0.18)' : undefined,
        panelAccentAltColor: isPortalPair ? '#7ddcff' : undefined,
        panelAccentAltSoftColor: isPortalPair ? 'rgba(125, 220, 255, 0.18)' : undefined,
        noteMarker: false,
        hasSettings: true
      }, layout, {
        [child.id]: {
          x: childBaseX,
          y: childBaseY
        }
      }));
      warningsById[child.id] = [];
      edges.push({
        id: `edge-${entry.id}-${child.id}`,
        fromId: entry.id,
        toId: child.id,
        bezier: { ...EMPTY_EDGE_BEZIER },
        accentColor: child.accentColor
      });
    });
  });

  const slots = document.checkpoints;
  const normalizedLevelStarts = getHaxLevelStartIndexes(document);

  normalizedLevelStarts.forEach((startIndex, levelIndex) => {
    const nextStart = normalizedLevelStarts[levelIndex + 1] ?? slots.length;
    const levelNodeId = `level-${levelIndex}`;
    const color = getDefaultLevelColor(levelIndex);
    const accentColor = getWorkshopColorCss(color, 0.95);
    const accentSoftColor = getWorkshopColorCss(color, 0.18);
    const levelNodeLayout = swimlaneLayout.layoutById[levelNodeId];

      nodes.push(createNode({
        id: levelNodeId,
        kind: 'level',
        label: `Level ${levelIndex + 1}`,
        sublabel: '',
        selection: { kind: 'level', levelIndex },
        levelIndex,
        x: levelNodeLayout?.baseX ?? EDITOR_COL_0_X,
        y: (levelNodeLayout?.baseY ?? 0) + spawnSubtreeShift,
        width: getNodeWidth('level', `Level ${levelIndex + 1}`, ''),
        height: getNodeVisualHeight('level'),
        accentColor,
        accentSoftColor,
        noteMarker: false,
        hasSettings: true
      }, layout, defaults));
    warningsById[levelNodeId] = [];
    edges.push({
      id: `edge-root-${levelNodeId}`,
      fromId: 'root',
      toId: levelNodeId,
      bezier: { ...EMPTY_EDGE_BEZIER },
      accentColor
    });

    for (let checkpointAbsoluteIndex = startIndex; checkpointAbsoluteIndex < nextStart; checkpointAbsoluteIndex += 1) {
      const checkpointNumber = checkpointAbsoluteIndex - startIndex + 1;
      const checkpointId = getCheckpointNodeId(levelIndex, checkpointNumber - 1);
      const checkpointLayout = swimlaneLayout.layoutById[checkpointId];
      const visibleChildren = buildVisibleHaxCheckpointChildren(
        levelIndex,
        checkpointNumber - 1,
        slots[checkpointAbsoluteIndex].effects,
        slots[checkpointAbsoluteIndex].missions,
        childGroups
      );

      nodes.push(createNode({
        id: checkpointId,
        kind: 'checkpoint',
        label: `Checkpoint ${checkpointNumber}`,
        sublabel: 'Checkpoint',
        selection: { kind: 'checkpoint', levelIndex, checkpointIndex: checkpointNumber - 1 },
        levelIndex,
        checkpointIndex: checkpointNumber - 1,
        checkpointNumber,
        parentId: levelNodeId,
        x: checkpointLayout?.baseX ?? EDITOR_COL_0_X,
        y: (checkpointLayout?.baseY ?? 0) + spawnSubtreeShift,
        width: getNodeWidth('checkpoint', `Checkpoint ${checkpointNumber}`, ''),
        height: getNodeVisualHeight('checkpoint'),
        accentColor,
        accentSoftColor,
        noteMarker: false,
        hasSettings: true
      }, layout, defaults));
      warningsById[checkpointId] = [];
      edges.push({
        id: `edge-${levelNodeId}-${checkpointId}`,
        fromId: levelNodeId,
        toId: checkpointId,
        bezier: { ...EMPTY_EDGE_BEZIER },
        accentColor
      });

      visibleChildren.forEach((entry) => {
        const wrapperLayout = swimlaneLayout.layoutById[entry.id];

        nodes.push(createNode({
          id: entry.id,
          kind: entry.kind,
          label: entry.label,
          sublabel: entry.sublabel,
          iconKey: entry.iconKey,
        selection: entry.selection,
        levelIndex,
        checkpointIndex: checkpointNumber - 1,
        checkpointNumber,
        parentId: checkpointId,
        x: wrapperLayout?.baseX ?? EDITOR_COL_0_X,
        y: (wrapperLayout?.baseY ?? 0) + spawnSubtreeShift,
        width: getNodeWidth(entry.kind, entry.label, entry.sublabel),
          height: getNodeVisualHeight(entry.kind),
          accentColor: entry.accentColor,
          accentSoftColor: entry.accentSoftColor,
          noteMarker: false,
          hasSettings: true
        }, layout, defaults));
        warningsById[entry.id] = [];
        edges.push({
          id: `edge-${checkpointId}-${entry.id}`,
          fromId: checkpointId,
          toId: entry.id,
          bezier: { ...EMPTY_EDGE_BEZIER },
          accentColor: entry.accentColor
        });

        entry.children.forEach((child) => {
          const childLayout = swimlaneLayout.layoutById[child.id];
          const isPortalPair = child.kind === 'haxEffectPair' && child.selection.kind === 'haxPortalPair';
          const childBaseX = (wrapperLayout?.baseX ?? childLayout?.baseX ?? EDITOR_COL_0_X) + HAX_CHILD_WRAPPER_MEMBER_INDENT;

          nodes.push(createNode({
            id: child.id,
            kind: child.kind,
            label: child.label,
            sublabel: child.sublabel,
            iconKey: child.iconKey,
            selection: child.selection,
            levelIndex,
            checkpointIndex: checkpointNumber - 1,
            checkpointNumber,
            parentId: entry.id,
            x: childBaseX,
            y: (childLayout?.baseY ?? 0) + spawnSubtreeShift,
            width: getNodeWidth(child.kind, child.label, child.sublabel),
            height: getNodeVisualHeight(child.kind),
            overlayWidth: isPortalPair ? 620 : undefined,
            overlayHeight: isPortalPair ? 460 : undefined,
            accentColor: child.accentColor,
            accentSoftColor: child.accentSoftColor,
            panelAccentColor: isPortalPair ? '#ff9f43' : undefined,
            panelAccentSoftColor: isPortalPair ? 'rgba(255, 159, 67, 0.18)' : undefined,
            panelAccentAltColor: isPortalPair ? '#7ddcff' : undefined,
            panelAccentAltSoftColor: isPortalPair ? 'rgba(125, 220, 255, 0.18)' : undefined,
            noteMarker: false,
            hasSettings: true
          }, layout, defaults));
          warningsById[child.id] = [];
          edges.push({
            id: `edge-${entry.id}-${child.id}`,
            fromId: entry.id,
            toId: child.id,
            bezier: { ...EMPTY_EDGE_BEZIER },
            accentColor: child.accentColor
          });
        });
      });
    }
  });

  return {
    warningsById,
    ...finalizeEditorGraph(nodes, edges, focusedCheckpointId, isFocusModeEnabled)
  };
}

export function buildDocumentGraph(
  document: WorkspaceDocument,
  warnings: ConversionWarning[],
  selection: EditorSelection | null,
  layout: EditorLayoutState,
  childGroups: ChildGroupState,
  focusedCheckpointId: string | null,
  isFocusModeEnabled: boolean
): EditorGraphModel {
  if (document.format === 'momentum') {
    return buildEditorGraph(
      document.map,
      warnings,
      selection,
      layout,
      childGroups,
      focusedCheckpointId,
      isFocusModeEnabled
    );
  }

  return buildHaxEditorGraph(document, selection, layout, childGroups, focusedCheckpointId, isFocusModeEnabled);
}
