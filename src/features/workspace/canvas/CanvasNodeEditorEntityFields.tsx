import type { MomentumMapModel } from '@/domain/model/types';
import { CanvasNodeEditorAbilityOrbFields } from '@/features/workspace/canvas/CanvasNodeEditorAbilityOrbFields';
import { CanvasNodeEditorBotFields } from '@/features/workspace/canvas/CanvasNodeEditorBotFields';
import { CanvasNodeEditorImpulseFields } from '@/features/workspace/canvas/CanvasNodeEditorImpulseFields';
import { CanvasNodeEditorLavaOrbFields } from '@/features/workspace/canvas/CanvasNodeEditorLavaOrbFields';
import { CanvasNodeEditorPortalFields } from '@/features/workspace/canvas/CanvasNodeEditorPortalFields';
import { CanvasNodeEditorTouchOrbFields } from '@/features/workspace/canvas/CanvasNodeEditorTouchOrbFields';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorEntityFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

export function CanvasNodeEditorEntityFields({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint
}: CanvasNodeEditorEntityFieldsProps) {
  if (node.kind === 'touchOrb') {
    return (
      <CanvasNodeEditorTouchOrbFields
        map={map}
        node={node}
        onMapChange={onMapChange}
        onReturnToCheckpoint={onReturnToCheckpoint}
      />
    );
  }

  if (node.kind === 'abilityOrb') {
    return (
      <CanvasNodeEditorAbilityOrbFields
        map={map}
        node={node}
        onMapChange={onMapChange}
        onReturnToCheckpoint={onReturnToCheckpoint}
      />
    );
  }

  if (node.kind === 'lavaOrb') {
    return (
      <CanvasNodeEditorLavaOrbFields
        map={map}
        node={node}
        onMapChange={onMapChange}
        onReturnToCheckpoint={onReturnToCheckpoint}
      />
    );
  }

  if (node.kind === 'bot') {
    return (
      <CanvasNodeEditorBotFields
        map={map}
        node={node}
        onMapChange={onMapChange}
        onReturnToCheckpoint={onReturnToCheckpoint}
      />
    );
  }

  if (node.kind === 'impulse') {
    return (
      <CanvasNodeEditorImpulseFields
        map={map}
        node={node}
        onMapChange={onMapChange}
        onReturnToCheckpoint={onReturnToCheckpoint}
      />
    );
  }

  if (node.kind === 'portal') {
    return (
      <CanvasNodeEditorPortalFields
        map={map}
        node={node}
        onMapChange={onMapChange}
        onReturnToCheckpoint={onReturnToCheckpoint}
      />
    );
  }

  return null;
}
