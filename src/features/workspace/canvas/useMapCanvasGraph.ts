import { useEffect, useMemo, useRef } from 'react';
import type { MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import { buildEditorGraph } from '@/features/workspace/graph/buildEditorGraph';
import type { EditorGraphModel } from '@/features/workspace/graph/types';
import type {
  ChildGroupState,
  EditorLayoutState,
  EditorSelection
} from '@/features/workspace/types';

interface UseMapCanvasGraphOptions {
  childGroups: ChildGroupState;
  fitGraph: (graph: EditorGraphModel | null) => void;
  layout: EditorLayoutState;
  map: MomentumMapModel | null;
  selection: EditorSelection | null;
  warnings: ConversionWarning[];
}

interface GraphStructureState {
  nodeCount: number;
  nodeSignature: string;
}

export function getGraphStructureState(graph: EditorGraphModel): GraphStructureState {
  return {
    nodeCount: graph.nodes.length,
    nodeSignature: graph.nodes.map((node) => node.id).join('|')
  };
}

export function didGraphStructureChange(
  previous: GraphStructureState | null,
  next: GraphStructureState
): boolean {
  if (!previous) {
    return true;
  }

  return previous.nodeCount !== next.nodeCount || previous.nodeSignature !== next.nodeSignature;
}

export function useMapCanvasGraph({
  childGroups,
  fitGraph,
  layout,
  map,
  selection,
  warnings
}: UseMapCanvasGraphOptions): EditorGraphModel | null {
  const graph = useMemo(
    () =>
      map
        ? buildEditorGraph(
            map,
            warnings,
            selection,
            layout,
            childGroups,
            null,
            false
          )
        : null,
    [childGroups, layout, map, selection, warnings]
  );
  const fitGraphRef = useRef(fitGraph);
  const previousStructureRef = useRef<GraphStructureState | null>(null);

  useEffect(() => {
    fitGraphRef.current = fitGraph;
  }, [fitGraph]);

  useEffect(() => {
    if (!graph) {
      previousStructureRef.current = null;
      return;
    }

    const nextStructure = getGraphStructureState(graph);
    if (didGraphStructureChange(previousStructureRef.current, nextStructure)) {
      fitGraphRef.current(graph);
    }

    previousStructureRef.current = nextStructure;
  }, [graph]);

  return graph;
}
