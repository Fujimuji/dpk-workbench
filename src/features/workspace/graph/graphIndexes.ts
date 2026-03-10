import type { EditorGraphModel, EditorNodeSummary } from '@/features/workspace/graph/types';

export interface EditorGraphIndexes {
  childrenById: Record<string, string[]>;
  nodeById: Record<string, EditorNodeSummary>;
}

export function buildEditorGraphIndexes(nodes: EditorNodeSummary[]): EditorGraphIndexes {
  const nodeById: Record<string, EditorNodeSummary> = Object.fromEntries(
    nodes.map((node) => [node.id, node] as const)
  );
  const childrenById: Record<string, string[]> = {};

  nodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }

    const existingChildren = childrenById[node.parentId];
    if (existingChildren) {
      existingChildren.push(node.id);
      return;
    }

    childrenById[node.parentId] = [node.id];
  });

  return {
    childrenById,
    nodeById
  };
}

export function withEditorGraphIndexes<T extends Pick<EditorGraphModel, 'nodes'>>(
  graph: T
): T & EditorGraphIndexes {
  return {
    ...graph,
    ...buildEditorGraphIndexes(graph.nodes)
  };
}
