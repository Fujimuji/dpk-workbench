import { useState } from 'react';
import { removeBot, updateBot } from '@/domain/model/mutators';
import type { MomentumMapModel } from '@/domain/model/types';
import {
  DraftPositionField,
  ToggleSwitch,
} from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { CanvasNodeEditorEntityActions } from '@/features/workspace/canvas/CanvasNodeEditorEntityActions';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface CanvasNodeEditorBotFieldsProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

export function CanvasNodeEditorBotFields({
  map,
  node,
  onMapChange,
  onReturnToCheckpoint
}: CanvasNodeEditorBotFieldsProps) {
  if (node.kind !== 'bot' || node.levelIndex === undefined || node.checkpointIndex === undefined) {
    return null;
  }

  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  const bot = checkpointData?.config?.bot;
  const [collapsedSections, setCollapsedSections] = useState({
    geometry: false,
    abilities: false
  });
  if (!bot) {
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
          label="Bot Position"
          onChange={(nextValue) =>
            onMapChange(updateBot(map, node.levelIndex!, node.checkpointIndex!, { position: nextValue }))
          }
          value={bot.position}
        />
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorDisclosureSection
        collapsed={collapsedSections.abilities}
        onToggle={() => setCollapsedSections((current) => ({ ...current, abilities: !current.abilities }))}
        title="Abilities"
      >
        <div className="flag-grid">
          <ToggleSwitch
            checked={bot.validAbilities.primaryFire}
            label="Primary Fire"
            onChange={(value) =>
              onMapChange(
                updateBot(map, node.levelIndex!, node.checkpointIndex!, {
                  validAbilities: { ...bot.validAbilities, primaryFire: value }
                })
              )
            }
          />
          <ToggleSwitch
            checked={bot.validAbilities.seismicSlam}
            label="Seismic Slam"
            onChange={(value) =>
              onMapChange(
                updateBot(map, node.levelIndex!, node.checkpointIndex!, {
                  validAbilities: { ...bot.validAbilities, seismicSlam: value }
                })
              )
            }
          />
          <ToggleSwitch
            checked={bot.validAbilities.rocketPunch}
            label="Rocket Punch"
            onChange={(value) =>
              onMapChange(
                updateBot(map, node.levelIndex!, node.checkpointIndex!, {
                  validAbilities: { ...bot.validAbilities, rocketPunch: value }
                })
              )
            }
          />
        </div>
      </CanvasNodeEditorDisclosureSection>
      <CanvasNodeEditorEntityActions
        onRemove={() => {
          onMapChange(removeBot(map, node.levelIndex!, node.checkpointIndex!));
          onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!);
        }}
        onReturnToCheckpoint={() => onReturnToCheckpoint(node.levelIndex!, node.checkpointIndex!)}
      />
    </div>
  );
}
