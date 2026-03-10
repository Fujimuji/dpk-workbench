import { useState } from 'react';
import { removeTouchOrb, updateTouchOrb } from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import { DraftPositionField } from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { CanvasNodeEditorEntityActions } from '@/features/workspace/canvas/CanvasNodeEditorEntityActions';
import { CanvasNodeEditorOrbRadiusField } from '@/features/workspace/canvas/CanvasNodeEditorOrbRadiusField';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorTouchOrbFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

export function CanvasNodeEditorTouchOrbFields({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint
}: CanvasNodeEditorTouchOrbFieldsProps) {
  if (node.kind !== 'touchOrb' || node.levelIndex === undefined || node.checkpointIndex === undefined || node.orbIndex === undefined) {
    return null;
  }

  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  const orb = checkpointData?.config?.touchOrbs?.[node.orbIndex];
  const [collapsedSections, setCollapsedSections] = useState({ geometry: false });
  if (!orb) {
    return null;
  }

  return (
    <div className="canvas-node-editor-scroll">
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.geometry}
        onToggle={() => setCollapsedSections((current) => ({ ...current, geometry: !current.geometry }))}
        title="Geometry"
      >
        <DraftPositionField
          label="Touch Orb Position"
          onChange={(nextValue) =>
            onMapChange(updateTouchOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, { position: nextValue }))
          }
          value={orb.position}
        />
        <CanvasNodeEditorOrbRadiusField
          onChange={(value) =>
            onMapChange(updateTouchOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, { radius: value }))
          }
          value={orb.radius}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorEntityActions
        onRemove={() => {
          onMapChange(removeTouchOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!));
          onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!);
        }}
        onReturnToCheckpoint={() => onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!)}
      />
    </div>
  );
}
