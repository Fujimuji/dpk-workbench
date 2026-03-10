import { useState } from 'react';
import { removeLavaOrb, updateLavaOrb } from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import { DraftPositionField } from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { CanvasNodeEditorEntityActions } from '@/features/workspace/canvas/CanvasNodeEditorEntityActions';
import { CanvasNodeEditorOrbRadiusField } from '@/features/workspace/canvas/CanvasNodeEditorOrbRadiusField';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorLavaOrbFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

export function CanvasNodeEditorLavaOrbFields({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint
}: CanvasNodeEditorLavaOrbFieldsProps) {
  if (node.kind !== 'lavaOrb' || node.levelIndex === undefined || node.checkpointIndex === undefined || node.orbIndex === undefined) {
    return null;
  }

  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  const orb = checkpointData?.config?.lava?.[node.orbIndex];
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
          label="Lava Orb Position"
          onChange={(nextValue) =>
            onMapChange(updateLavaOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, { position: nextValue }))
          }
          value={orb.position}
        />
        <CanvasNodeEditorOrbRadiusField
          onChange={(value) =>
            onMapChange(updateLavaOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, { radius: value }))
          }
          value={orb.radius}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorEntityActions
        onRemove={() => {
          onMapChange(removeLavaOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!));
          onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!);
        }}
        onReturnToCheckpoint={() => onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!)}
      />
    </div>
  );
}
