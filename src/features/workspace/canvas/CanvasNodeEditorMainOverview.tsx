import { useState } from 'react';
import { Crosshair, DoorOpen, Flame, Hand, Sparkles, Zap } from 'lucide-react';
import { updateLevelMetadata, updateStartVector } from '@/domain/model/mutators';
import type { MomentumMapModel, WorkshopColor } from '@/domain/model/types';
import { VectorField } from '@/features/workspace/canvas/CanvasFieldControls';
import { CanvasNodeEditorDisclosureSection } from '@/features/workspace/canvas/CanvasNodeEditorDisclosureSection';
import { createSocketActionResult } from '@/features/workspace/canvas/MapCanvasSocketActions';
import { getCheckpointData } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';
import { WORKSHOP_COLORS } from '@/shared/workshop/colors';

interface CanvasNodeEditorMainOverviewProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onMapChange: (map: MomentumMapModel) => void;
  onSelectNodeBySelection: (selection: EditorSelection) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
}

const MOMENTUM_ENTITY_ACTIONS = [
  { label: 'Add Touch Orb', socket: 'touch' as const, icon: <Hand className="button-icon" />, accentTone: 'touch' as const },
  { label: 'Add Ability Orb', socket: 'ability' as const, icon: <Zap className="button-icon" />, accentTone: 'ability' as const },
  { label: 'Add Lava Orb', socket: 'lava' as const, icon: <Flame className="button-icon" />, accentTone: 'lava' as const },
  { label: 'Add Bot', socket: 'bot' as const, icon: <Crosshair className="button-icon" />, accentTone: 'bot' as const },
  { label: 'Add Impulse', socket: 'impulse' as const, icon: <Sparkles className="button-icon" />, accentTone: 'haxBounce' as const },
  { label: 'Add Portal', socket: 'portal' as const, icon: <DoorOpen className="button-icon" />, accentTone: 'haxPortal' as const }
];

export function CanvasNodeEditorMainOverview({
  map,
  node,
  onMapChange,
  onSelectNodeBySelection,
  onReturnToCheckpoint: _onReturnToCheckpoint
}: CanvasNodeEditorMainOverviewProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    spawn: false,
    level: false,
    entities: false
  });

  if (node.kind === 'start') {
    return (
      <div className="canvas-node-editor-scroll">
        <CanvasNodeEditorDisclosureSection
          collapsed={collapsedSections.spawn}
          onToggle={() => setCollapsedSections((current) => ({ ...current, spawn: !current.spawn }))}
          title="Spawn"
        >
          <VectorField
            label="Spawn Vector"
            onChange={(nextValue) => onMapChange(updateStartVector(map, nextValue))}
            value={map.start}
          />
        </CanvasNodeEditorDisclosureSection>
      </div>
    );
  }

  if (node.kind === 'level' && node.levelIndex !== undefined) {
    const level = map.levels[node.levelIndex];
    if (!level) {
      return null;
    }

    return (
      <div className="canvas-node-editor-scroll">
        <CanvasNodeEditorDisclosureSection
          collapsed={collapsedSections.level}
          onToggle={() => setCollapsedSections((current) => ({ ...current, level: !current.level }))}
          title="Level"
        >
          <label className="field-stack">
            <span>Name</span>
            <input
              className="workspace-input"
              onChange={(event) => onMapChange(updateLevelMetadata(map, node.levelIndex!, { name: event.target.value }))}
              type="text"
              value={level.name}
            />
          </label>
          <label className="field-stack">
            <span>Color</span>
            <select
              className="workspace-input"
              onChange={(event) =>
                onMapChange(updateLevelMetadata(map, node.levelIndex!, { color: event.target.value as WorkshopColor }))
              }
              value={level.color}
            >
              {WORKSHOP_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
        </CanvasNodeEditorDisclosureSection>
      </div>
    );
  }

  if (node.kind === 'momentumEntities' && node.levelIndex !== undefined && node.checkpointIndex !== undefined) {
    const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
    if (!checkpointData || checkpointData.isFinish || !checkpointData.config) {
      return null;
    }
    const checkpointConfig = checkpointData.config;

    return (
      <div className="canvas-node-editor-scroll">
        <CanvasNodeEditorDisclosureSection
          collapsed={collapsedSections.entities}
          onToggle={() => setCollapsedSections((current) => ({ ...current, entities: !current.entities }))}
          title="Add Entity"
        >
          <div className="canvas-node-action-grid">
            {MOMENTUM_ENTITY_ACTIONS.map((action) => {
              const disabled = action.socket === 'bot' && Boolean(checkpointConfig.bot);

              return (
                <button
                  className={`canvas-node-action-card is-accent-${action.accentTone}`}
                  disabled={disabled}
                  key={action.socket}
                  onClick={() => {
                    const result = createSocketActionResult(null, map, node, action.socket);
                    if (!result) {
                      return;
                    }

                    onMapChange(result.nextMap);
                    onSelectNodeBySelection(result.nextSelection);
                  }}
                  type="button"
                >
                  <span aria-hidden="true" className="canvas-node-action-card-icon">
                    {action.icon}
                  </span>
                  <span className="canvas-node-action-card-label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </CanvasNodeEditorDisclosureSection>
      </div>
    );
  }

  return null;
}
