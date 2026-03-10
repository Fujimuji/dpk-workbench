import {
  addCheckpointAt,
  addLevel,
  insertLevelAt,
  moveCheckpoint,
  moveLevel,
  removeAbilityOrb,
  removeBot,
  removeCheckpoint,
  removeImpulse,
  removeLavaOrb,
  removePortal,
  removeLevel,
  removeTouchOrb
} from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import type { WorkspaceDocument } from '@/domain/document/types';
import { getHaxAbsoluteCheckpointIndex } from '@/domain/import/hax/levelLayout';
import {
  insertHaxCheckpointMission,
  insertHaxCheckpointEffects,
  removeHaxCheckpointMissionAt,
  removeHaxCheckpointEffectsAt
} from '@/domain/import/hax/mutators';
import {
  addHaxCheckpointAt,
  addHaxLevel,
  insertHaxLevelAt,
  moveHaxCheckpoint,
  moveHaxLevel,
  removeHaxCheckpoint,
  removeHaxLevel,
  type HaxStructuralEditResult
} from '@/domain/import/hax/structureMutators';
import type { HaxEffectTemplateId } from '@/features/workspace/hax/effectNodes';
import { createDefaultHaxMission, createHaxEffectsFromTemplate } from '@/features/workspace/hax/effectNodes';
import { createSocketActionResult } from '@/features/workspace/canvas/MapCanvasSocketActions';
import type {
  EditorGraphModel,
  EditorNodeSummary,
  EditorSocketKind
} from '@/features/workspace/graph/types';
import {
  remapEditorSelection,
  remapLayoutState,
  remapNodeIds
} from '@/features/workspace/structureRemap';
import type {
  EditorLayoutState,
  EditorSelection,
  MultiNodeSelection,
  WorkspaceScope
} from '@/features/workspace/types';

type MomentumStructuralEditResult = ReturnType<typeof addLevel>;
type WorkspaceStructuralEditResult =
  | { document: WorkspaceDocument; remap: MomentumStructuralEditResult['remap']; nextSelection: EditorSelection | null }
  | { document: WorkspaceDocument; remap: HaxStructuralEditResult['remap']; nextSelection: EditorSelection | null };

interface UseMapStructureActionsOptions {
  clearCanvasSelection: () => void;
  closeEditor: () => void;
  currentScope: WorkspaceScope;
  document: WorkspaceDocument | null;
  graph: EditorGraphModel | null;
  layout: EditorLayoutState;
  map: MomentumMapModel | null;
  onDocumentChange: (document: WorkspaceDocument) => void;
  onLayoutChange: (layout: EditorLayoutState) => void;
  onMultiSelectionChange: (selection: MultiNodeSelection) => void;
  onReadNoteNodeIdsChange: (nodeIds: string[]) => void;
  onRevealSelection: (selection: EditorSelection, options?: { preserveScope?: boolean }) => void;
  onSelectionChange: (selection: EditorSelection | null) => void;
  readNoteNodeIds: string[];
  returnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
  selectNodeBySelection: (selection: EditorSelection) => void;
  selection: EditorSelection | null;
}

export interface MapStructureActions {
  applyStructuralEdit: (result: WorkspaceStructuralEditResult) => void;
  collectSubtreeNodeIds: (rootNodeId: string) => string[];
  handleAddCheckpoint: (levelIndex: number, anchorCheckpointIndex: number | null, placement: 'above' | 'below') => void;
  handleAddLevel: () => void;
  handleCreateChild: (node: EditorNodeSummary, socket: EditorSocketKind) => void;
  handleCreateHaxEffect: (node: EditorNodeSummary, template: HaxEffectTemplateId) => void;
  handleCreateHaxMission: (node: EditorNodeSummary) => void;
  handleInsertLevel: (levelIndex: number) => void;
  handleMoveCheckpoint: (levelIndex: number, checkpointIndex: number, direction: 'up' | 'down') => void;
  handleMoveLevel: (levelIndex: number, direction: 'up' | 'down') => void;
  handleDeleteNodes: (nodes: EditorNodeSummary[]) => void;
  handleRemoveCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
  handleRemoveEntity: (node: EditorNodeSummary) => void;
  handleRemoveLevel: (levelIndex: number) => void;
}

function toMomentumResult(result: MomentumStructuralEditResult): WorkspaceStructuralEditResult {
  return {
    document: {
      format: 'momentum',
      map: result.map
    },
    remap: result.remap,
    nextSelection: result.nextSelection
  };
}

function toHaxResult(result: HaxStructuralEditResult): WorkspaceStructuralEditResult {
  return {
    document: result.document,
    remap: result.remap,
    nextSelection: result.nextSelection
  };
}

function getHaxEffectIndexesFromNodeId(nodeId: string): number[] {
  const singleMatch = /-haxEffect-(\d+)$/.exec(nodeId);
  if (singleMatch) {
    return [Number(singleMatch[1])];
  }

  const pairMatch = /-hax(?:PortalPair|ZiplinePair)-(\d+)-(\d+)$/.exec(nodeId);
  if (pairMatch) {
    return [Number(pairMatch[1]), Number(pairMatch[2])];
  }

  return [];
}

export function useMapStructureActions({
  clearCanvasSelection,
  closeEditor,
  currentScope,
  document,
  graph,
  layout,
  map,
  onDocumentChange,
  onLayoutChange,
  onMultiSelectionChange,
  onReadNoteNodeIdsChange,
  onRevealSelection,
  onSelectionChange,
  readNoteNodeIds,
  returnToCheckpoint,
  selectNodeBySelection,
  selection
}: UseMapStructureActionsOptions): MapStructureActions {
  function revealSelection(selection: EditorSelection, options?: { preserveScope?: boolean }): void {
    if (options) {
      onRevealSelection(selection, options);
      return;
    }

    onRevealSelection(selection);
  }

  function removeReadNoteIds(nodeIds: string[]): void {
    const nodeIdSet = new Set(nodeIds);
    onReadNoteNodeIdsChange(readNoteNodeIds.filter((nodeId) => !nodeIdSet.has(nodeId)));
  }

  function handleCreateChild(node: EditorNodeSummary, socket: EditorSocketKind): void {
    if (!map || document?.format !== 'momentum') {
      return;
    }

    const action = createSocketActionResult(graph, map, node, socket);
    if (!action) {
      return;
    }

    onDocumentChange({
      format: 'momentum',
      map: action.nextMap
    });
    revealSelection(action.nextSelection);
  }

  function handleCreateHaxEffect(node: EditorNodeSummary, template: HaxEffectTemplateId): void {
    if (document?.format !== 'hax' || node.kind !== 'haxEffects') {
      return;
    }

    const absoluteCheckpointIndex =
      node.selection.kind === 'haxSpawnEffects'
        ? 0
        : node.levelIndex !== undefined && node.checkpointIndex !== undefined
          ? getHaxAbsoluteCheckpointIndex(document, node.levelIndex, node.checkpointIndex)
          : null;
    if (absoluteCheckpointIndex === null) {
      return;
    }

    const checkpoint = absoluteCheckpointIndex === 0 ? document.spawn : document.checkpoints[absoluteCheckpointIndex - 1];
    if (!checkpoint) {
      return;
    }
    const nextEffects = createHaxEffectsFromTemplate(template);
    const firstNewEffectIndex = checkpoint.effects.length;
    const nextDocument = insertHaxCheckpointEffects(document, absoluteCheckpointIndex, nextEffects);

    onDocumentChange(nextDocument);
    if (nextEffects.length === 1) {
      revealSelection({
        ...(absoluteCheckpointIndex === 0
          ? { kind: 'haxSpawnEffect', effectIndex: firstNewEffectIndex }
          : {
              kind: 'haxEffect',
              levelIndex: node.levelIndex!,
              checkpointIndex: node.checkpointIndex!,
              effectIndex: firstNewEffectIndex
            })
      });
      return;
    }

    if (absoluteCheckpointIndex === 0) {
      revealSelection({
        kind: template === 'portal' ? 'haxSpawnPortalPair' : 'haxSpawnZiplinePair',
        effectIndex: firstNewEffectIndex,
        pairEffectIndex: firstNewEffectIndex + 1
      });
      return;
    }

    revealSelection({
      kind: template === 'portal' ? 'haxPortalPair' : 'haxZiplinePair',
      levelIndex: node.levelIndex!,
      checkpointIndex: node.checkpointIndex!,
      effectIndex: firstNewEffectIndex,
      pairEffectIndex: firstNewEffectIndex + 1
    });
  }

  function handleCreateHaxMission(node: EditorNodeSummary): void {
    if (
      document?.format !== 'hax' ||
      node.levelIndex === undefined ||
      node.checkpointIndex === undefined
    ) {
      return;
    }

    const absoluteCheckpointIndex = getHaxAbsoluteCheckpointIndex(document, node.levelIndex, node.checkpointIndex);
    if (absoluteCheckpointIndex === null) {
      return;
    }

    const checkpoint = document.checkpoints[absoluteCheckpointIndex - 1];
    if (!checkpoint || checkpoint.missions.length >= 4) {
      return;
    }

    const nextMission = createDefaultHaxMission(checkpoint.missions);
    if (!nextMission) {
      return;
    }

    const nextMissionIndex = checkpoint.missions.length;
    onDocumentChange(insertHaxCheckpointMission(document, absoluteCheckpointIndex, nextMission));
    revealSelection({
      kind: 'haxMission',
      levelIndex: node.levelIndex,
      checkpointIndex: node.checkpointIndex,
      missionIndex: nextMissionIndex
    });
  }

  function collectSubtreeNodeIds(rootNodeId: string): string[] {
    if (!graph) {
      return [rootNodeId];
    }

    const adjacency = new Map<string, string[]>();
    graph.edges.forEach((edge) => {
      const bucket = adjacency.get(edge.fromId);
      if (bucket) {
        bucket.push(edge.toId);
      } else {
        adjacency.set(edge.fromId, [edge.toId]);
      }
    });

    const queue = [rootNodeId];
    const visited = new Set<string>([rootNodeId]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = adjacency.get(currentId) ?? [];
      children.forEach((childId) => {
        if (visited.has(childId)) {
          return;
        }

        visited.add(childId);
        queue.push(childId);
      });
    }

    return Array.from(visited);
  }

  function applyStructuralEdit(result: WorkspaceStructuralEditResult): void {
    applyStructuralEditWithOptions(result);
  }

  function applyStructuralEditWithOptions(
    result: WorkspaceStructuralEditResult,
    options: { preserveScope?: boolean } = {}
  ): void {
    const nextLayout = remapLayoutState(layout, result.remap);
    const remappedSelection = remapEditorSelection(selection, result.remap);
    const nextReadNoteNodeIds = remapNodeIds(readNoteNodeIds, result.remap);

    onDocumentChange(result.document);
    onLayoutChange(nextLayout);
    onReadNoteNodeIdsChange(nextReadNoteNodeIds);
    onMultiSelectionChange([]);
    const nextSelection = result.nextSelection ?? remappedSelection;
    if (nextSelection) {
      revealSelection(nextSelection, options);
      return;
    }
    onSelectionChange(null);
  }

  function handleAddLevel(): void {
    if (!document) {
      return;
    }

    applyStructuralEditWithOptions(
      document.format === 'momentum' ? toMomentumResult(addLevel(document.map)) : toHaxResult(addHaxLevel(document)),
      { preserveScope: currentScope.kind === 'document' }
    );
  }

  function handleInsertLevel(levelIndex: number): void {
    if (!document) {
      return;
    }

    applyStructuralEditWithOptions(
      document.format === 'momentum'
        ? toMomentumResult(insertLevelAt(document.map, levelIndex))
        : toHaxResult(insertHaxLevelAt(document, levelIndex)),
      { preserveScope: currentScope.kind === 'document' }
    );
  }

  function handleMoveLevel(levelIndex: number, direction: 'up' | 'down'): void {
    if (!document) {
      return;
    }

    applyStructuralEdit(
      document.format === 'momentum'
        ? toMomentumResult(moveLevel(document.map, levelIndex, direction))
        : toHaxResult(moveHaxLevel(document, levelIndex, direction))
    );
  }

  function handleRemoveLevel(levelIndex: number): void {
    if (!document) {
      return;
    }

    applyStructuralEdit(
      document.format === 'momentum'
        ? toMomentumResult(removeLevel(document.map, levelIndex))
        : toHaxResult(removeHaxLevel(document, levelIndex))
    );
  }

  function handleAddCheckpoint(
    levelIndex: number,
    anchorCheckpointIndex: number | null,
    placement: 'above' | 'below'
  ): void {
    if (!document) {
      return;
    }

    applyStructuralEditWithOptions(
      document.format === 'momentum'
        ? toMomentumResult(addCheckpointAt(document.map, levelIndex, anchorCheckpointIndex, placement))
        : toHaxResult(addHaxCheckpointAt(document, levelIndex, anchorCheckpointIndex, placement)),
      { preserveScope: currentScope.kind === 'level' && currentScope.levelIndex === levelIndex }
    );
  }

  function handleMoveCheckpoint(levelIndex: number, checkpointIndex: number, direction: 'up' | 'down'): void {
    if (!document) {
      return;
    }

    applyStructuralEdit(
      document.format === 'momentum'
        ? toMomentumResult(moveCheckpoint(document.map, levelIndex, checkpointIndex, direction))
        : toHaxResult(moveHaxCheckpoint(document, levelIndex, checkpointIndex, direction))
    );
  }

  function handleRemoveCheckpoint(levelIndex: number, checkpointIndex: number): void {
    if (!document) {
      return;
    }

    applyStructuralEdit(
      document.format === 'momentum'
        ? toMomentumResult(removeCheckpoint(document.map, levelIndex, checkpointIndex))
        : toHaxResult(removeHaxCheckpoint(document, levelIndex, checkpointIndex))
    );
  }

  function handleRemoveEntity(node: EditorNodeSummary): void {
    if (!document) {
      return;
    }

    if (document.format === 'momentum') {
      if (node.levelIndex === undefined || node.checkpointIndex === undefined) {
        return;
      }

      let nextMap = document.map;

      if (node.kind === 'touchOrb' && node.orbIndex !== undefined) {
        nextMap = removeTouchOrb(nextMap, node.levelIndex, node.checkpointIndex, node.orbIndex);
      } else if (node.kind === 'abilityOrb' && node.orbIndex !== undefined) {
        nextMap = removeAbilityOrb(nextMap, node.levelIndex, node.checkpointIndex, node.orbIndex);
      } else if (node.kind === 'lavaOrb' && node.orbIndex !== undefined) {
        nextMap = removeLavaOrb(nextMap, node.levelIndex, node.checkpointIndex, node.orbIndex);
      } else if (node.kind === 'bot') {
        nextMap = removeBot(nextMap, node.levelIndex, node.checkpointIndex);
      } else if (node.kind === 'impulse' && node.selection.kind === 'impulse') {
        nextMap = removeImpulse(nextMap, node.levelIndex, node.checkpointIndex, node.selection.impulseIndex);
      } else if (node.kind === 'portal' && node.selection.kind === 'portal') {
        nextMap = removePortal(nextMap, node.levelIndex, node.checkpointIndex, node.selection.portalIndex);
      } else {
        return;
      }

      removeReadNoteIds([node.id]);
      onDocumentChange({ format: 'momentum', map: nextMap });
      returnToCheckpoint(node.levelIndex, node.checkpointIndex);
      return;
    }

    let effectIndexes: number[] = [];
    const isSpawnEffectNode =
      node.selection.kind === 'haxSpawnEffect' ||
      node.selection.kind === 'haxSpawnPortalPair' ||
      node.selection.kind === 'haxSpawnZiplinePair';
    const absoluteCheckpointIndex =
      isSpawnEffectNode
        ? 0
        : node.levelIndex !== undefined && node.checkpointIndex !== undefined
          ? getHaxAbsoluteCheckpointIndex(document, node.levelIndex, node.checkpointIndex)
          : null;
    if (absoluteCheckpointIndex === null) {
      return;
    }

    if (node.kind === 'haxEffect' && node.selection.kind === 'haxEffect') {
      effectIndexes = [node.selection.effectIndex];
    } else if (node.kind === 'haxEffect' && node.selection.kind === 'haxSpawnEffect') {
      effectIndexes = [node.selection.effectIndex];
    } else if (
      node.kind === 'haxEffectPair' &&
      (
        node.selection.kind === 'haxPortalPair' ||
        node.selection.kind === 'haxZiplinePair' ||
        node.selection.kind === 'haxSpawnPortalPair' ||
        node.selection.kind === 'haxSpawnZiplinePair'
      )
    ) {
      effectIndexes = [node.selection.effectIndex, node.selection.pairEffectIndex];
      } else if (node.kind === 'haxMission' && node.selection.kind === 'haxMission') {
      if (node.levelIndex === undefined || node.checkpointIndex === undefined) {
        return;
      }
      removeReadNoteIds([node.id]);
      onDocumentChange(removeHaxCheckpointMissionAt(document, absoluteCheckpointIndex, node.selection.missionIndex));
      selectNodeBySelection({
        kind: 'haxMissions',
        levelIndex: node.levelIndex,
        checkpointIndex: node.checkpointIndex
      });
      return;
    } else {
      return;
    }

    removeReadNoteIds([node.id]);
    onDocumentChange(removeHaxCheckpointEffectsAt(document, absoluteCheckpointIndex, effectIndexes));
    if (absoluteCheckpointIndex === 0) {
      selectNodeBySelection({ kind: 'haxSpawnEffects' });
    } else {
      returnToCheckpoint(node.levelIndex!, node.checkpointIndex!);
    }
  }

  function handleDeleteNodes(nodes: EditorNodeSummary[]): void {
    if (!document || nodes.length === 0) {
      return;
    }

    if (document.format === 'hax') {
      let nextDocument = document;
      let nextLayout = layout;
      let nextReadNoteNodeIds = readNoteNodeIds;

      function dropReadNoteIds(nodeIds: string[]): void {
        const nodeIdSet = new Set(nodeIds);
        nextReadNoteNodeIds = nextReadNoteNodeIds.filter((nodeId) => !nodeIdSet.has(nodeId));
      }

      function applyBulkHaxStructuralEdit(result: HaxStructuralEditResult): void {
        nextDocument = result.document;
        nextLayout = remapLayoutState(nextLayout, result.remap);
        nextReadNoteNodeIds = remapNodeIds(nextReadNoteNodeIds, result.remap);
      }

      const entityNodes = nodes
        .filter(
          (node): node is EditorNodeSummary =>
            node.kind === 'haxEffect' || node.kind === 'haxEffectPair' || node.kind === 'haxMission'
        )
        .sort((left, right) => {
          const leftLevelIndex = left.levelIndex ?? -1;
          const rightLevelIndex = right.levelIndex ?? -1;
          if (leftLevelIndex !== rightLevelIndex) {
            return rightLevelIndex - leftLevelIndex;
          }
          const leftCheckpointIndex = left.checkpointIndex ?? -1;
          const rightCheckpointIndex = right.checkpointIndex ?? -1;
          if (leftCheckpointIndex !== rightCheckpointIndex) {
            return rightCheckpointIndex - leftCheckpointIndex;
          }
          if (left.kind === 'haxMission' || right.kind === 'haxMission') {
            const leftMissionIndex = left.kind === 'haxMission' && left.selection.kind === 'haxMission' ? left.selection.missionIndex : -1;
            const rightMissionIndex = right.kind === 'haxMission' && right.selection.kind === 'haxMission' ? right.selection.missionIndex : -1;
            return rightMissionIndex - leftMissionIndex;
          }
          const leftIndex = Math.max(...getHaxEffectIndexesFromNodeId(left.id), -1);
          const rightIndex = Math.max(...getHaxEffectIndexesFromNodeId(right.id), -1);
          return rightIndex - leftIndex;
        });

      entityNodes.forEach((node) => {
        const absoluteCheckpointIndex =
          node.selection.kind === 'haxSpawnEffect' ||
          node.selection.kind === 'haxSpawnPortalPair' ||
          node.selection.kind === 'haxSpawnZiplinePair'
            ? 0
            : node.levelIndex !== undefined && node.checkpointIndex !== undefined
              ? getHaxAbsoluteCheckpointIndex(nextDocument, node.levelIndex, node.checkpointIndex)
              : null;
        if (absoluteCheckpointIndex === null) {
          return;
        }

        if (node.kind === 'haxMission' && node.selection.kind === 'haxMission') {
          nextDocument = removeHaxCheckpointMissionAt(nextDocument, absoluteCheckpointIndex, node.selection.missionIndex);
        } else {
          nextDocument = removeHaxCheckpointEffectsAt(
            nextDocument,
            absoluteCheckpointIndex,
            getHaxEffectIndexesFromNodeId(node.id)
          );
        }
        dropReadNoteIds([node.id]);
      });

      const checkpointNodes = nodes
        .filter(
          (node): node is EditorNodeSummary & { checkpointIndex: number; levelIndex: number } =>
            node.kind === 'checkpoint' && node.levelIndex !== undefined && node.checkpointIndex !== undefined
        )
        .sort((left, right) => {
          if (left.levelIndex !== right.levelIndex) {
            return right.levelIndex - left.levelIndex;
          }
          return right.checkpointIndex - left.checkpointIndex;
        });
      checkpointNodes.forEach((node) => {
        applyBulkHaxStructuralEdit(removeHaxCheckpoint(nextDocument, node.levelIndex, node.checkpointIndex));
      });

      const levelNodes = nodes
        .filter((node): node is EditorNodeSummary & { levelIndex: number } => node.kind === 'level' && node.levelIndex !== undefined)
        .sort((left, right) => right.levelIndex - left.levelIndex);
      levelNodes.forEach((node) => {
        applyBulkHaxStructuralEdit(removeHaxLevel(nextDocument, node.levelIndex));
      });

      onDocumentChange(nextDocument);
      onLayoutChange(nextLayout);
      onReadNoteNodeIdsChange(nextReadNoteNodeIds);
      onMultiSelectionChange([]);
      onSelectionChange(null);
      return;
    }

    let nextMap = document.map;
    let nextLayout = layout;
    let nextReadNoteNodeIds = readNoteNodeIds;

    function dropReadNoteIds(nodeIds: string[]): void {
      const nodeIdSet = new Set(nodeIds);
      nextReadNoteNodeIds = nextReadNoteNodeIds.filter((nodeId) => !nodeIdSet.has(nodeId));
    }

    function applyBulkStructuralEdit(result: MomentumStructuralEditResult): void {
      nextMap = result.map;
      nextLayout = remapLayoutState(nextLayout, result.remap);
      nextReadNoteNodeIds = remapNodeIds(nextReadNoteNodeIds, result.remap);
    }

    const entityNodes = nodes
      .filter(
        (node) =>
          node.kind === 'touchOrb' ||
          node.kind === 'abilityOrb' ||
          node.kind === 'lavaOrb' ||
          node.kind === 'bot' ||
          node.kind === 'impulse' ||
          node.kind === 'portal'
      )
      .sort((left, right) => {
        if ((left.levelIndex ?? -1) !== (right.levelIndex ?? -1)) {
          return (right.levelIndex ?? -1) - (left.levelIndex ?? -1);
        }
        if ((left.checkpointIndex ?? -1) !== (right.checkpointIndex ?? -1)) {
          return (right.checkpointIndex ?? -1) - (left.checkpointIndex ?? -1);
        }
        const leftEntityIndex =
          left.kind === 'bot'
            ? Number.POSITIVE_INFINITY
            : left.kind === 'impulse' && left.selection.kind === 'impulse'
              ? left.selection.impulseIndex
              : left.kind === 'portal' && left.selection.kind === 'portal'
                ? left.selection.portalIndex
                : left.orbIndex ?? -1;
        const rightEntityIndex =
          right.kind === 'bot'
            ? Number.POSITIVE_INFINITY
            : right.kind === 'impulse' && right.selection.kind === 'impulse'
              ? right.selection.impulseIndex
              : right.kind === 'portal' && right.selection.kind === 'portal'
                ? right.selection.portalIndex
                : right.orbIndex ?? -1;
        return rightEntityIndex - leftEntityIndex;
      });

    entityNodes.forEach((node) => {
      if (node.levelIndex === undefined || node.checkpointIndex === undefined) {
        return;
      }

      if (node.kind === 'touchOrb' && node.orbIndex !== undefined) {
        nextMap = removeTouchOrb(nextMap, node.levelIndex, node.checkpointIndex, node.orbIndex);
      } else if (node.kind === 'abilityOrb' && node.orbIndex !== undefined) {
        nextMap = removeAbilityOrb(nextMap, node.levelIndex, node.checkpointIndex, node.orbIndex);
      } else if (node.kind === 'lavaOrb' && node.orbIndex !== undefined) {
        nextMap = removeLavaOrb(nextMap, node.levelIndex, node.checkpointIndex, node.orbIndex);
      } else if (node.kind === 'bot') {
        nextMap = removeBot(nextMap, node.levelIndex, node.checkpointIndex);
      } else if (node.kind === 'impulse' && node.selection.kind === 'impulse') {
        nextMap = removeImpulse(nextMap, node.levelIndex, node.checkpointIndex, node.selection.impulseIndex);
      } else if (node.kind === 'portal' && node.selection.kind === 'portal') {
        nextMap = removePortal(nextMap, node.levelIndex, node.checkpointIndex, node.selection.portalIndex);
      }

      dropReadNoteIds([node.id]);
    });

    const checkpointNodes = nodes
      .filter(
        (node): node is EditorNodeSummary & { checkpointIndex: number; levelIndex: number } =>
          node.kind === 'checkpoint' &&
          node.levelIndex !== undefined &&
          node.checkpointIndex !== undefined
      )
      .sort((left, right) => {
        if (left.levelIndex !== right.levelIndex) {
          return right.levelIndex - left.levelIndex;
        }

        return right.checkpointIndex - left.checkpointIndex;
      });

    checkpointNodes.forEach((node) => {
      applyBulkStructuralEdit(removeCheckpoint(nextMap, node.levelIndex, node.checkpointIndex));
    });

    const levelNodes = nodes
      .filter((node): node is EditorNodeSummary & { levelIndex: number } => node.kind === 'level' && node.levelIndex !== undefined)
      .sort((left, right) => right.levelIndex - left.levelIndex);

    levelNodes.forEach((node) => {
      applyBulkStructuralEdit(removeLevel(nextMap, node.levelIndex));
    });

    onDocumentChange({ format: 'momentum', map: nextMap });
    onLayoutChange(nextLayout);
    onReadNoteNodeIdsChange(nextReadNoteNodeIds);
    onMultiSelectionChange([]);
    onSelectionChange(null);
  }

  return {
    applyStructuralEdit,
    collectSubtreeNodeIds,
    handleAddCheckpoint,
    handleAddLevel,
    handleCreateChild,
    handleCreateHaxEffect,
    handleCreateHaxMission,
    handleDeleteNodes,
    handleInsertLevel,
    handleMoveCheckpoint,
    handleMoveLevel,
    handleRemoveCheckpoint,
    handleRemoveEntity,
    handleRemoveLevel
  };
}
