import { Crosshair, DoorOpen, Flame, Hand, Sparkles, Zap } from 'lucide-react';
import type { MomentumMapModel } from '@/domain/model/types';
import {
  countEnabledAbilities,
  countEnabledBotAbilities,
  formatNumber,
  getCheckpointData
} from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';

interface CanvasNodeEditorChildrenTabProps {
  map: MomentumMapModel;
  node: WorkspaceNodeSummary;
  onSelectNodeBySelection: (selection: EditorSelection) => void;
}

export function CanvasNodeEditorChildrenTab({
  map,
  node,
  onSelectNodeBySelection
}: CanvasNodeEditorChildrenTabProps) {
  if (
    (node.kind !== 'checkpoint' && node.kind !== 'momentumEntities') ||
    node.levelIndex === undefined ||
    node.checkpointIndex === undefined
  ) {
    return null;
  }

  const checkpointData = getCheckpointData(map, node.levelIndex, node.checkpointIndex);
  if (!checkpointData || checkpointData.isFinish || !checkpointData.config) {
    return null;
  }

  const { config } = checkpointData;

  return (
    <div className="canvas-node-child-list">
      {(config.touchOrbs ?? []).map((orb, orbIndex) => (
        <button
          className="canvas-node-child-chip"
          key={`touch-${orbIndex}`}
          onClick={() =>
            onSelectNodeBySelection({
              kind: 'touchOrb',
              levelIndex: node.levelIndex!,
              checkpointIndex: node.checkpointIndex!,
              orbIndex
            })
          }
          type="button"
        >
          <Hand aria-hidden="true" className="button-icon" />
          Touch Orb {orbIndex + 1}
          <span>{formatNumber(orb.radius)}</span>
        </button>
      ))}
      {(config.abilityOrbs ?? []).map((orb, orbIndex) => (
        <button
          className="canvas-node-child-chip"
          key={`ability-${orbIndex}`}
          onClick={() =>
            onSelectNodeBySelection({
              kind: 'abilityOrb',
              levelIndex: node.levelIndex!,
              checkpointIndex: node.checkpointIndex!,
              orbIndex
            })
          }
          type="button"
        >
          <Zap aria-hidden="true" className="button-icon" />
          Ability Orb {orbIndex + 1}
          <span>{countEnabledAbilities(orb.abilities)}/3</span>
        </button>
      ))}
      {(config.lava ?? []).map((orb, orbIndex) => (
        <button
          className="canvas-node-child-chip"
          key={`lava-${orbIndex}`}
          onClick={() =>
            onSelectNodeBySelection({
              kind: 'lavaOrb',
              levelIndex: node.levelIndex!,
              checkpointIndex: node.checkpointIndex!,
              orbIndex
            })
          }
          type="button"
        >
          <Flame aria-hidden="true" className="button-icon" />
          Lava Orb {orbIndex + 1}
          <span>{formatNumber(orb.radius)}</span>
        </button>
      ))}
      {config.bot ? (
        <button
          className="canvas-node-child-chip"
          onClick={() =>
            onSelectNodeBySelection({ kind: 'bot', levelIndex: node.levelIndex!, checkpointIndex: node.checkpointIndex! })
          }
          type="button"
        >
          <Crosshair aria-hidden="true" className="button-icon" />
          Bot
          <span>{countEnabledBotAbilities(config.bot.validAbilities)}/3</span>
        </button>
      ) : null}
      {(config.impulses ?? []).map((impulse, impulseIndex) => (
        <button
          className="canvas-node-child-chip"
          key={`impulse-${impulseIndex}`}
          onClick={() =>
            onSelectNodeBySelection({
              kind: 'impulse',
              levelIndex: node.levelIndex!,
              checkpointIndex: node.checkpointIndex!,
              impulseIndex
            })
          }
          type="button"
        >
          <Sparkles aria-hidden="true" className="button-icon" />
          Impulse {impulseIndex + 1}
          <span>{formatNumber(impulse.speed)}</span>
        </button>
      ))}
      {(config.portals ?? []).map((_, portalIndex) => (
        <button
          className="canvas-node-child-chip"
          key={`portal-${portalIndex}`}
          onClick={() =>
            onSelectNodeBySelection({
              kind: 'portal',
              levelIndex: node.levelIndex!,
              checkpointIndex: node.checkpointIndex!,
              portalIndex
            })
          }
          type="button"
        >
          <DoorOpen aria-hidden="true" className="button-icon" />
          Portal {portalIndex + 1}
          <span>pair</span>
        </button>
      ))}
    </div>
  );
}
