import { useState } from 'react';
import { removePortal, updatePortal } from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import { DraftPositionField } from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { CanvasNodeEditorEntityActions } from '@/features/workspace/canvas/CanvasNodeEditorEntityActions';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorPortalFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

export function CanvasNodeEditorPortalFields({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint
}: CanvasNodeEditorPortalFieldsProps) {
  if (node.kind !== 'portal' || node.levelIndex === undefined || node.checkpointIndex === undefined) {
    return null;
  }

  if (node.selection.kind !== 'portal') {
    return null;
  }

  const portalIndex = node.selection.portalIndex;
  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  const portal = checkpointData?.config?.portals?.[portalIndex];
  const [collapsedSections, setCollapsedSections] = useState({
    entry: false,
    exit: false
  });
  if (!portal) {
    return null;
  }

  return (
    <div className="canvas-node-editor-scroll">
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.entry}
        onToggle={() => setCollapsedSections((current) => ({ ...current, entry: !current.entry }))}
        title="Entry"
      >
        <DraftPositionField
          label="Portal Entry"
          onChange={(nextValue) =>
            onMapChange(updatePortal(map, node.levelIndex!, node.checkpointIndex!, portalIndex, { entry: nextValue }))
          }
          value={portal.entry}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.exit}
        onToggle={() => setCollapsedSections((current) => ({ ...current, exit: !current.exit }))}
        title="Exit"
      >
        <DraftPositionField
          label="Portal Exit"
          onChange={(nextValue) =>
            onMapChange(updatePortal(map, node.levelIndex!, node.checkpointIndex!, portalIndex, { exit: nextValue }))
          }
          value={portal.exit}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorEntityActions
        onRemove={() => {
          onMapChange(removePortal(map, node.levelIndex!, node.checkpointIndex!, portalIndex));
          onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!);
        }}
        onReturnToCheckpoint={() => onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!)}
      />
    </div>
  );
}
