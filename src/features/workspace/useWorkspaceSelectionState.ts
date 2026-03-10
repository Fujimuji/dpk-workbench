import { useMemo, useState } from 'react';
import type { NodeEditorTab } from '@/features/workspace/canvas/CanvasNodeEditor';
import type { WorkspaceDocumentIndex } from '@/features/workspace/documentIndex';
import {
  getNodeIdFromSelection,
  getSelectionPath,
  selectionMatchesNode
} from '@/features/workspace/canvas/selection';
import type {
  EditorGraphModel,
  EditorNodeSummary,
  WorkspaceNodeSummary
} from '@/features/workspace/graph/types';
import type {
  EditorSelection,
  MultiNodeSelection
} from '@/features/workspace/types';

export interface UseWorkspaceSelectionStateOptions {
  graph: EditorGraphModel | null;
  multiSelection: MultiNodeSelection;
  onMarkNodeNotesAsRead: (nodeId: string) => void;
  onMultiSelectionChange: (selection: MultiNodeSelection) => void;
  onSelectionChange: (selection: EditorSelection | null) => void;
  readNoteNodeIds: string[];
  selection: EditorSelection | null;
  documentIndex?: WorkspaceDocumentIndex | null;
}

export function useWorkspaceSelectionState({
  graph,
  multiSelection,
  onMarkNodeNotesAsRead,
  onMultiSelectionChange,
  onSelectionChange,
  readNoteNodeIds,
  selection,
  documentIndex
}: UseWorkspaceSelectionStateOptions) {
  const [activeEditorTab, setActiveEditorTab] = useState<NodeEditorTab>('main');
  const multiSelectionActive = multiSelection.length >= 2;
  const multiSelectionSet = useMemo(() => new Set(multiSelection), [multiSelection]);
  const readNoteNodeIdSet = useMemo(() => new Set(readNoteNodeIds), [readNoteNodeIds]);

  const selectedNode = useMemo(() => {
    if (!graph || !selection) {
      return null;
    }

    return graph.nodes.find((node) => selectionMatchesNode(selection, node)) ?? null;
  }, [graph, selection]);

  const selectedLookupNode = useMemo<WorkspaceNodeSummary | null>(() => {
    if (!selection) {
      return null;
    }

    return documentIndex?.nodeById[getNodeIdFromSelection(selection)] ?? selectedNode;
  }, [documentIndex, selectedNode, selection]);

  const selectedWarnings = useMemo(
    () => {
      if (!selectedLookupNode) {
        return [];
      }

      return documentIndex?.warningsById[selectedLookupNode.id] ?? graph?.warningsById[selectedLookupNode.id] ?? [];
    },
    [documentIndex, graph?.warningsById, selectedLookupNode]
  );

  const selectionStatusLabel = useMemo(() => {
    if (multiSelectionActive) {
      return `${multiSelection.length} selected`;
    }

    if (!selection) {
      return null;
    }

    return getSelectionPath(selection);
  }, [multiSelection.length, multiSelectionActive, selection]);

  function clearGroupSelection(): void {
    if (multiSelection.length > 0) {
      onMultiSelectionChange([]);
    }
  }

  function markNodeNotesAsRead(nodeId: string): void {
    onMarkNodeNotesAsRead(nodeId);
  }

  function selectSingleNode(node: WorkspaceNodeSummary, tab: NodeEditorTab = 'main'): void {
    clearGroupSelection();
    onSelectionChange(node.selection);
    setActiveEditorTab(tab);
    if (tab === 'notes') {
      markNodeNotesAsRead(node.id);
    }
  }

  function selectNode(node: WorkspaceNodeSummary, tab: NodeEditorTab = 'main'): void {
    selectSingleNode(node, tab);
  }

  function resolveNodeById(nodeId: string): EditorNodeSummary | null {
    return graph?.nodes.find((node) => node.id === nodeId) ?? null;
  }

  function applyMultiSelection(nodeIds: string[]): void {
    const orderedIds = (graph?.nodes ?? [])
      .filter((node) => nodeIds.includes(node.id))
      .map((node) => node.id);

    if (orderedIds.length >= 2) {
      onMultiSelectionChange(orderedIds);
      onSelectionChange(null);
      setActiveEditorTab('main');
      return;
    }

    if (orderedIds.length === 1) {
      const remainingNode = resolveNodeById(orderedIds[0]);
      onMultiSelectionChange([]);
      onSelectionChange(remainingNode?.selection ?? null);
      setActiveEditorTab('main');
      return;
    }

    onMultiSelectionChange([]);
    onSelectionChange(null);
    setActiveEditorTab('main');
  }

  function toggleNodeInMultiSelection(node: EditorNodeSummary): void {
    const nextNodeIds = new Set(multiSelectionSet);

    if (multiSelection.length === 0 && selection) {
      const currentSelectedNode = graph?.nodes.find((graphNode) => selectionMatchesNode(selection, graphNode)) ?? null;
      if (currentSelectedNode && currentSelectedNode.id !== node.id) {
        nextNodeIds.add(currentSelectedNode.id);
      }
    }

    if (nextNodeIds.has(node.id)) {
      nextNodeIds.delete(node.id);
    } else {
      nextNodeIds.add(node.id);
    }

    applyMultiSelection(Array.from(nextNodeIds));
  }

  function selectNodeBySelection(nextSelection: EditorSelection, tab: NodeEditorTab = 'main'): void {
    clearGroupSelection();
    onSelectionChange(nextSelection);
    setActiveEditorTab(tab);
    if (tab === 'notes') {
      const targetNode = documentIndex?.nodeById[getNodeIdFromSelection(nextSelection)] ?? null;
      if (targetNode) {
        markNodeNotesAsRead(targetNode.id);
      }
    }
  }

  function returnToCheckpoint(levelIndex: number, checkpointIndex: number): void {
    onSelectionChange({ kind: 'checkpoint', levelIndex, checkpointIndex });
    setActiveEditorTab('main');
  }

  function closeEditor(): void {
    onSelectionChange(null);
  }

  function clearSelection(): void {
    clearGroupSelection();
    onSelectionChange(null);
    setActiveEditorTab('main');
  }

  return {
    activeEditorTab,
    clearSelection,
    closeEditor,
    markNodeNotesAsRead,
    multiSelectionActive,
    multiSelectionSet,
    readNoteNodeIds: readNoteNodeIdSet,
    returnToCheckpoint,
    selectNode,
    selectNodeBySelection,
    selectedNode,
    selectedLookupNode,
    selectedWarnings,
    selectionStatusLabel,
    setActiveEditorTab,
    toggleNodeInMultiSelection
  };
}

export type WorkspaceSelectionState = ReturnType<typeof useWorkspaceSelectionState>;
