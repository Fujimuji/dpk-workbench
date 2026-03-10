import { useState } from 'react';
import { removeAbilityOrb, updateAbilityOrb } from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import {
  DraftPositionField,
  ToggleSwitch,
} from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { CanvasNodeEditorEntityActions } from '@/features/workspace/canvas/CanvasNodeEditorEntityActions';
import { CanvasNodeEditorOrbRadiusField } from '@/features/workspace/canvas/CanvasNodeEditorOrbRadiusField';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorAbilityOrbFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

export function CanvasNodeEditorAbilityOrbFields({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint
}: CanvasNodeEditorAbilityOrbFieldsProps) {
  if (node.kind !== 'abilityOrb' || node.levelIndex === undefined || node.checkpointIndex === undefined || node.orbIndex === undefined) {
    return null;
  }

  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  const orb = checkpointData?.config?.abilityOrbs?.[node.orbIndex];
  const [collapsedSections, setCollapsedSections] = useState({
    geometry: false,
    abilities: false
  });
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
          label="Ability Orb Position"
          onChange={(nextValue) =>
            onMapChange(updateAbilityOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, { position: nextValue }))
          }
          value={orb.position}
        />
        <CanvasNodeEditorOrbRadiusField
          onChange={(value) =>
            onMapChange(updateAbilityOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, { radius: value }))
          }
          value={orb.radius}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.abilities}
        onToggle={() => setCollapsedSections((current) => ({ ...current, abilities: !current.abilities }))}
        title="Abilities"
      >
        <div className="flag-grid">
          <ToggleSwitch
            checked={orb.abilities.seismicSlam}
            label="Seismic Slam"
            onChange={(value) =>
              onMapChange(
                updateAbilityOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, {
                  abilities: { ...orb.abilities, seismicSlam: value }
                })
              )
            }
          />
          <ToggleSwitch
            checked={orb.abilities.powerblock}
            label="Powerblock"
            onChange={(value) =>
              onMapChange(
                updateAbilityOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, {
                  abilities: { ...orb.abilities, powerblock: value }
                })
              )
            }
          />
          <ToggleSwitch
            checked={orb.abilities.rocketPunch}
            label="Rocket Punch"
            onChange={(value) =>
              onMapChange(
                updateAbilityOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!, {
                  abilities: { ...orb.abilities, rocketPunch: value }
                })
              )
            }
          />
        </div>
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorEntityActions
        onRemove={() => {
          onMapChange(removeAbilityOrb(map, node.levelIndex!, node.checkpointIndex!, node.orbIndex!));
          onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!);
        }}
        onReturnToCheckpoint={() => onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!)}
      />
    </div>
  );
}
