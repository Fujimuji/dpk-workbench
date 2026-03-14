import {
  ArrowDownFromLine,
  ArrowDown,
  ArrowUpFromLine,
  ArrowUp,
  Bot,
  Crosshair,
  DoorOpen,
  FlagTriangleRight,
  Flame,
  Ghost,
  Hand,
  Layers3,
  ListPlus,
  MapPinPlus,
  Orbit,
  Route,
  Skull,
  Sparkles,
  Timer,
  Trash2,
  Zap
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { WorkspaceDocument } from '@/domain/document/types';
import { getHaxAbsoluteCheckpointIndex, getHaxLevelStartIndexes } from '@/domain/import/hax/levelLayout';
import type { CanvasContextMenuItem } from '@/features/workspace/canvas/useCanvasContextMenu';
import type { MapStructureActions } from '@/features/workspace/canvas/useMapStructureActions';
import type {
  EditorGraphModel,
  EditorNodeSummary,
  EditorSocketKind
} from '@/features/workspace/graph/types';
import type {
  EditorSelection,
  MultiNodeSelection,
  WorkspaceScope
} from '@/features/workspace/types';
import type { MomentumMapModel } from '@/domain/model/types';
import type { HaxEffectTemplateId } from '@/features/workspace/hax/effectNodes';

interface BuildNodeContextMenuOptions {
  actions: MapStructureActions;
  currentScope: WorkspaceScope;
  document?: WorkspaceDocument | null;
  graph: EditorGraphModel | null;
  map: MomentumMapModel | null;
  multiSelection: MultiNodeSelection;
  multiSelectionActive: boolean;
  multiSelectionSet: Set<string>;
  node: EditorNodeSummary;
  onCloseContextMenu: () => void;
}

function getEntityRemoveLabel(node: EditorNodeSummary): string | null {
  switch (node.kind) {
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
      return `Remove ${node.label}`;
    case 'bot':
      return 'Remove Bot';
    case 'impulse':
      return `Remove ${node.label}`;
    case 'portal':
      return `Remove ${node.label}`;
    case 'haxEffect':
    case 'haxEffectPair':
      return 'Remove Effect';
    case 'haxMission':
      return 'Delete Mission';
    default:
      return null;
  }
}

function getHaxEffectActions(): Array<{
  accentTone:
    | 'ability'
    | 'haxTime'
    | 'haxDeath'
    | 'haxPermeation'
    | 'haxCheckpoint'
    | 'haxPortal'
    | 'haxBlackhole'
    | 'haxZipline'
    | 'haxShootableOrb'
    | 'haxBounce';
  icon: ReactNode;
  id: string;
  label: string;
  template: HaxEffectTemplateId;
}> {
  return [
    { accentTone: 'haxTime', id: 'add-time', label: 'Add Time Effect', template: 'time', icon: <Timer size={14} strokeWidth={2} /> },
    { accentTone: 'haxDeath', id: 'add-death', label: 'Add Death Effect', template: 'death', icon: <Skull size={14} strokeWidth={2} /> },
    { accentTone: 'ability', id: 'add-ability', label: 'Add Ability Effect', template: 'ability', icon: <Zap size={14} strokeWidth={2} /> },
    { accentTone: 'haxPermeation', id: 'add-permeation', label: 'Add Permeation Effect', template: 'permeation', icon: <Ghost size={14} strokeWidth={2} /> },
    { accentTone: 'haxCheckpoint', id: 'add-checkpoint-effect', label: 'Add Checkpoint Effect', template: 'checkpoint', icon: <FlagTriangleRight size={14} strokeWidth={2} /> },
    { accentTone: 'haxPortal', id: 'add-portal', label: 'Add Portal', template: 'portal', icon: <DoorOpen size={14} strokeWidth={2} /> },
    { accentTone: 'haxBlackhole', id: 'add-blackhole', label: 'Add Blackhole', template: 'blackhole', icon: <Orbit size={14} strokeWidth={2} /> },
    { accentTone: 'haxZipline', id: 'add-zipline', label: 'Add Zipline', template: 'zipline', icon: <Route size={14} strokeWidth={2} /> },
    { accentTone: 'haxShootableOrb', id: 'add-shootable-orb', label: 'Add Shootable Orb', template: 'shootableOrb', icon: <Crosshair size={14} strokeWidth={2} /> },
    { accentTone: 'haxBounce', id: 'add-bounce', label: 'Add Bounce Orb', template: 'bounce', icon: <Sparkles size={14} strokeWidth={2} /> }
  ];
}

export function buildNodeContextMenu({
  actions,
  currentScope,
  document,
  graph,
  map,
  multiSelection,
  multiSelectionActive,
  multiSelectionSet,
  node,
  onCloseContextMenu
}: BuildNodeContextMenuOptions): CanvasContextMenuItem[] {
  const items: CanvasContextMenuItem[] = [];
  const resolvedDocument = document ?? (map ? { format: 'momentum', map } : null);
  const isMomentumDocument = resolvedDocument?.format === 'momentum';
  const isHaxDocument = resolvedDocument?.format === 'hax';
  const contextSelectedNodes =
    multiSelectionActive && multiSelectionSet.has(node.id)
      ? multiSelection
          .map((nodeId) => graph?.nodes.find((graphNode) => graphNode.id === nodeId) ?? null)
          .filter((value): value is EditorNodeSummary => Boolean(value))
      : [node];

  if (node.kind === 'start' && resolvedDocument) {
    items.push({
      id: 'add-level',
      icon: <Layers3 size={14} strokeWidth={2} />,
      label: 'Add Level',
      onSelect: () => {
        actions.handleAddLevel();
        onCloseContextMenu();
      }
    });
  }

  if (node.kind === 'level' && node.levelIndex !== undefined && resolvedDocument) {
    const canMoveUp = node.levelIndex > 0;
    const isLevelScope = currentScope.kind === 'level' && currentScope.levelIndex === node.levelIndex;
    const isDocumentScope = currentScope.kind === 'document';
    const levelCount = isMomentumDocument
        ? (map?.levels.length ?? 0)
        : isHaxDocument
        ? getHaxLevelStartIndexes(resolvedDocument).length
        : 0;
    const checkpointCount = isMomentumDocument
      ? (map?.levels[node.levelIndex]?.checkpoints.length ?? 0)
      : isHaxDocument
        ? graph?.nodes.filter((graphNode) => graphNode.parentId === node.id && graphNode.kind === 'checkpoint').length ?? 0
        : 0;
    const canMoveDown = node.levelIndex < levelCount - 1;
    if (isLevelScope) {
      items.push({
        id: 'add-checkpoint',
        icon: <MapPinPlus size={14} strokeWidth={2} />,
        label: 'Add Checkpoint',
        onSelect: () => {
          actions.handleAddCheckpoint(
            node.levelIndex!,
            checkpointCount > 0 ? checkpointCount - 1 : null,
            'below'
          );
          onCloseContextMenu();
        }
      });
    }

    if (isDocumentScope) {
      items.push({
        id: 'add-level-above',
        icon: <ArrowUpFromLine size={14} strokeWidth={2} />,
        label: 'Add Level Above',
        onSelect: () => {
          actions.handleInsertLevel(node.levelIndex!);
          onCloseContextMenu();
        }
      });
      items.push({
        id: 'add-level-below',
        icon: <ArrowDownFromLine size={14} strokeWidth={2} />,
        label: 'Add Level Below',
        onSelect: () => {
          actions.handleInsertLevel(node.levelIndex! + 1);
          onCloseContextMenu();
        }
      });
    }

    if (isDocumentScope && canMoveUp) {
      items.push({
        id: 'move-level-up',
        icon: <ArrowUp size={14} strokeWidth={2} />,
        label: 'Move Level Up',
        separated: true,
        onSelect: () => {
          actions.handleMoveLevel(node.levelIndex!, 'up');
          onCloseContextMenu();
        }
      });
    }

    if (isDocumentScope && canMoveDown) {
      items.push({
        id: 'move-level-down',
        icon: <ArrowDown size={14} strokeWidth={2} />,
        label: 'Move Level Down',
        separated: !canMoveUp,
        onSelect: () => {
          actions.handleMoveLevel(node.levelIndex!, 'down');
          onCloseContextMenu();
        }
      });
    }

    items.push({
      id: 'remove-level',
      icon: <Trash2 size={14} strokeWidth={2} />,
      label: 'Delete Level',
      danger: true,
      separated: isDocumentScope && (canMoveUp || canMoveDown),
      onSelect: () => {
        actions.handleRemoveLevel(node.levelIndex!);
        onCloseContextMenu();
      }
    });
  }

  if (node.kind === 'checkpoint' && resolvedDocument && node.levelIndex !== undefined && node.checkpointIndex !== undefined) {
    const level = isMomentumDocument ? map?.levels[node.levelIndex] : null;
    const isFinish = isMomentumDocument ? node.checkpointIndex >= (level?.checkpointConfigs.length ?? 0) : false;
    const canInsertCheckpoint =
      currentScope.kind === 'level' &&
      currentScope.levelIndex === node.levelIndex;

    if (!isFinish && canInsertCheckpoint) {
      items.push({
        id: 'add-checkpoint-below',
        icon: <ArrowDownFromLine size={14} strokeWidth={2} />,
        label: 'Add Checkpoint Below',
        separated: true,
        onSelect: () => {
          actions.handleAddCheckpoint(node.levelIndex!, node.checkpointIndex!, 'below');
          onCloseContextMenu();
        }
      });
    }

    if (!isFinish) {
      items.push({
        id: 'remove-checkpoint',
        icon: <Trash2 size={14} strokeWidth={2} />,
        label: 'Delete Checkpoint',
        danger: true,
        separated: canInsertCheckpoint,
        onSelect: () => {
          actions.handleRemoveCheckpoint(node.levelIndex!, node.checkpointIndex!);
          onCloseContextMenu();
        }
      });
    }

  }

  if (
    node.kind === 'momentumEntities' &&
    isMomentumDocument &&
    map &&
    node.levelIndex !== undefined &&
    node.checkpointIndex !== undefined
  ) {
    const level = map.levels[node.levelIndex];
    const config = level?.checkpointConfigs[node.checkpointIndex] ?? null;

    if (config) {
      const addActions: Array<{ id: string; label: string; socket: EditorSocketKind; disabled?: boolean }> = [
        { id: 'add-touch', label: 'Add Touch Orb', socket: 'touch' },
        { id: 'add-ability', label: 'Add Ability Orb', socket: 'ability' },
        { id: 'add-lava', label: 'Add Lava Orb', socket: 'lava' },
        { id: 'add-bot', label: 'Add Bot', socket: 'bot', disabled: Boolean(config.bot) },
        { id: 'add-impulse', label: 'Add Impulse', socket: 'impulse' },
        { id: 'add-portal', label: 'Add Portal', socket: 'portal', disabled: Boolean(config.portal) }
      ];

      addActions.forEach((action, index) => {
        items.push({
          accentTone:
            action.socket === 'touch'
              ? 'touch'
              : action.socket === 'ability'
                ? 'ability'
                : action.socket === 'lava'
                  ? 'lava'
                  : action.socket === 'bot'
                    ? 'bot'
                    : action.socket === 'portal'
                      ? 'haxPortal'
                      : 'haxBounce',
          id: action.id,
          icon:
            action.socket === 'touch' ? <Hand size={14} strokeWidth={2} /> :
            action.socket === 'ability' ? <Zap size={14} strokeWidth={2} /> :
            action.socket === 'lava' ? <Flame size={14} strokeWidth={2} /> :
            action.socket === 'bot' ? <Bot size={14} strokeWidth={2} /> :
            action.socket === 'portal' ? <DoorOpen size={14} strokeWidth={2} /> :
            <Sparkles size={14} strokeWidth={2} />,
          label: action.label,
          disabled: action.disabled,
          separated: index === 0 && items.length > 0,
          onSelect: () => {
            actions.handleCreateChild(node, action.socket);
            onCloseContextMenu();
          }
        });
      });
    }
  }

  if (
    isHaxDocument &&
    (
      (node.kind === 'haxEffects' &&
        (
          node.selection.kind === 'haxSpawnEffects' ||
          (node.levelIndex !== undefined && node.checkpointIndex !== undefined)
        )) ||
      (node.kind === 'haxMissions' && node.levelIndex !== undefined && node.checkpointIndex !== undefined)
    )
  ) {
    const absoluteCheckpointIndex =
      node.kind === 'haxEffects' && node.selection.kind === 'haxSpawnEffects'
        ? 0
        : node.levelIndex !== undefined && node.checkpointIndex !== undefined
          ? getHaxAbsoluteCheckpointIndex(resolvedDocument, node.levelIndex, node.checkpointIndex)
          : null;
    const checkpoint =
      absoluteCheckpointIndex === 0
        ? resolvedDocument.spawn
        : absoluteCheckpointIndex === null
          ? null
          : resolvedDocument.checkpoints[absoluteCheckpointIndex - 1] ?? null;

    if (node.kind === 'haxEffects') {
      getHaxEffectActions().forEach((action, index) => {
        items.push({
          accentTone: action.accentTone,
          id: action.id,
          icon: action.icon,
          label: action.label,
          separated: index === 0 && items.length > 0,
          onSelect: () => {
            actions.handleCreateHaxEffect(node, action.template);
            onCloseContextMenu();
          }
        });
      });
    }

    if (node.kind === 'haxMissions') {
      items.push({
        id: 'add-mission',
        icon: <ListPlus size={18} strokeWidth={2} />,
        label: 'Add Mission',
        disabled: Boolean(checkpoint && checkpoint.missions.length >= 4),
        separated: items.length > 0,
        onSelect: () => {
          actions.handleCreateHaxMission(node);
          onCloseContextMenu();
        }
      });
    }
  }

  const removeLabel = getEntityRemoveLabel(node);
  const showBulkDelete = contextSelectedNodes.length >= 2;
  if (showBulkDelete) {
    items.push({
      id: 'remove-selected',
      icon: <Trash2 size={14} strokeWidth={2} />,
      label: `Delete Selected (${contextSelectedNodes.length})`,
      danger: true,
      separated: items.length > 0,
      onSelect: () => {
        actions.handleDeleteNodes(contextSelectedNodes);
        onCloseContextMenu();
      }
    });
  }

  if (removeLabel && !showBulkDelete) {
    items.push({
      id: 'remove-node',
      icon: <Trash2 size={14} strokeWidth={2} />,
      label: removeLabel,
      danger: true,
      separated: items.length > 0,
      onSelect: () => {
        actions.handleRemoveEntity(node);
        onCloseContextMenu();
      }
    });
  }

  return items;
}
