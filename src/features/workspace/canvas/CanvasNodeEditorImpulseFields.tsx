import { useState } from 'react';
import { removeImpulse, updateImpulse } from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import { DraftPositionField, NullableNumberField, VectorField } from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { CanvasNodeEditorEntityActions } from '@/features/workspace/canvas/CanvasNodeEditorEntityActions';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorImpulseFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

export function CanvasNodeEditorImpulseFields({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint
}: CanvasNodeEditorImpulseFieldsProps) {
  if (node.kind !== 'impulse' || node.levelIndex === undefined || node.checkpointIndex === undefined) {
    return null;
  }

  if (node.selection.kind !== 'impulse') {
    return null;
  }

  const impulseIndex = node.selection.impulseIndex;
  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  const impulse = checkpointData?.config?.impulses?.[impulseIndex];
  const [collapsedSections, setCollapsedSections] = useState({
    position: false,
    direction: false
  });
  if (!impulse) {
    return null;
  }

  function toggleSection(section: keyof typeof collapsedSections) {
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section]
    }));
  }

  return (
    <div className="canvas-node-editor-scroll">
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.position}
        onToggle={() => toggleSection('position')}
        title="Geometry"
      >
        <DraftPositionField
          label="Impulse Position"
          onChange={(nextValue) =>
            onMapChange(updateImpulse(map, node.levelIndex!, node.checkpointIndex!, impulseIndex, { position: nextValue }))
          }
          value={impulse.position}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.direction}
        onToggle={() => toggleSection('direction')}
        title="Direction and Speed"
      >
        <VectorField
          label="Impulse Direction"
          onChange={(nextValue) =>
            onMapChange(updateImpulse(map, node.levelIndex!, node.checkpointIndex!, impulseIndex, { direction: nextValue }))
          }
          value={impulse.direction}
        />
        <NullableNumberField
          label="Impulse Speed"
          min={0}
          onChange={(value) =>
            onMapChange(updateImpulse(map, node.levelIndex!, node.checkpointIndex!, impulseIndex, { speed: value ?? impulse.speed }))
          }
          value={impulse.speed}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorEntityActions
        onRemove={() => {
          onMapChange(removeImpulse(map, node.levelIndex!, node.checkpointIndex!, impulseIndex));
          onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!);
        }}
        onReturnToCheckpoint={() => onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!)}
      />
    </div>
  );
}
