import { useState } from 'react';
import { updateCheckpointConfig, updateCheckpointRadius, updateCheckpointVector } from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import {
  DraftPositionField,
  NullableNumberField,
  ToggleSwitch,
} from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorCheckpointDisableAbilities } from '@/features/workspace/canvas/CanvasNodeEditorCheckpointDisableAbilities';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorCheckpointFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
}

export function CanvasNodeEditorCheckpointFields({
  map,
  node,
  onMapChange
}: CanvasNodeEditorCheckpointFieldsProps) {
  if (node.kind !== 'checkpoint' || node.levelIndex === undefined || node.checkpointIndex === undefined) {
    return null;
  }

  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  if (!checkpointData) {
    return null;
  }

  const { checkpoint, config, isFinish } = checkpointData;
  const [collapsedSections, setCollapsedSections] = useState({
    geometry: false,
    settings: false,
    abilities: false
  });

  return (
    <div className="canvas-node-editor-scroll">
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.geometry}
        onToggle={() => setCollapsedSections((current) => ({ ...current, geometry: !current.geometry }))}
        title="Geometry"
      >
        <DraftPositionField
          label="Checkpoint Vector"
          onChange={(nextValue) =>
            onMapChange(updateCheckpointVector(map, node.levelIndex!, node.checkpointIndex!, nextValue))
          }
          value={checkpoint.position}
        />
        <NullableNumberField
          label="Radius"
          min={0}
          onChange={(value) => {
            if (value === null) {
              return;
            }
            onMapChange(updateCheckpointRadius(map, node.levelIndex!, node.checkpointIndex!, value));
          }}
          value={checkpoint.radius}
        />
      </CanvasNodeEditorDisclosureSection>
      {isFinish || !config ? null : (
        <>
          <CanvasNodeEditorDisclosureSection
            collapsed={collapsedSections.settings}
            onToggle={() => setCollapsedSections((current) => ({ ...current, settings: !current.settings }))}
            title="Checkpoint Settings"
          >
            <ToggleSwitch
              checked={config.liquid}
              label="Liquid Checkpoint"
              onChange={(value) =>
                onMapChange(updateCheckpointConfig(map, node.levelIndex!, node.checkpointIndex!, { liquid: value }))
              }
            />
            <NullableNumberField
              label="Time Limit"
              onChange={(value) =>
                onMapChange(updateCheckpointConfig(map, node.levelIndex!, node.checkpointIndex!, { timeLimit: value }))
              }
              value={config.timeLimit}
            />
            <NullableNumberField
              label="Minimum Speed"
              min={0}
              onChange={(value) =>
                onMapChange(updateCheckpointConfig(map, node.levelIndex!, node.checkpointIndex!, { minimumSpeed: value }))
              }
              value={config.minimumSpeed}
            />
            <NullableNumberField
              label="Height Goal"
              min={1}
              onChange={(value) =>
                onMapChange(updateCheckpointConfig(map, node.levelIndex!, node.checkpointIndex!, { heightGoal: value }))
              }
              value={config.heightGoal}
            />
          </CanvasNodeEditorDisclosureSection>
          <CanvasNodeEditorDisclosureSection
            collapsed={collapsedSections.abilities}
            onToggle={() => setCollapsedSections((current) => ({ ...current, abilities: !current.abilities }))}
            title="Disabled Abilities"
          >
            <CanvasNodeEditorCheckpointDisableAbilities
              checkpointIndex={node.checkpointIndex}
              config={config}
              levelIndex={node.levelIndex}
              map={map}
              onMapChange={onMapChange}
            />
          </CanvasNodeEditorDisclosureSection>
        </>
      )}
    </div>
  );
}
