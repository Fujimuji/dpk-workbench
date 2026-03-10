import type { MomentumMapModel } from '@/domain/model/types';
import { CanvasNodeEditorCheckpointFields } from '@/features/workspace/canvas/CanvasNodeEditorCheckpointFields';
import { CanvasNodeEditorEntityFields } from '@/features/workspace/canvas/CanvasNodeEditorEntityFields';
import { CanvasNodeEditorMainOverview } from '@/features/workspace/canvas/CanvasNodeEditorMainOverview';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';

interface CanvasNodeEditorMainTabProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
  onSelectNodeBySelection: (selection: EditorSelection) => void;
}

export function CanvasNodeEditorMainTab({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint,
  onSelectNodeBySelection
}: CanvasNodeEditorMainTabProps) {
  if (node.kind === 'start' || node.kind === 'level' || node.kind === 'momentumEntities') {
    return (
        <CanvasNodeEditorMainOverview
          map={map}
          node={node}
          onMapChange={onMapChange}
          onSelectNodeBySelection={onSelectNodeBySelection}
          onReturnToCheckpoint={onReturnToCheckpoint}
        />
      );
  }

  if (node.kind === 'checkpoint') {
    return (
      <CanvasNodeEditorCheckpointFields
        map={map}
        node={node}
        onMapChange={onMapChange}
      />
    );
  }

  return (
    <CanvasNodeEditorEntityFields
      map={map}
      node={node}
      onMapChange={onMapChange}
      onReturnToCheckpoint={onReturnToCheckpoint}
    />
  );
}
