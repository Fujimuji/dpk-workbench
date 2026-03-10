import {
  ChevronRight
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NodeIcon } from '@/features/workspace/canvas/CanvasNodeLayer';
import { selectionMatchesNode } from '@/features/workspace/canvas/selection';
import type { WorkspaceDocumentIndex } from '@/features/workspace/documentIndex';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import { workspaceDisclosureVariants, workspaceMotionTransitions } from '@/features/workspace/motion/workspaceMotion';
import { buildOutlineTree } from '@/features/workspace/outline/buildOutlineTree';
import type { EditorSelection, WorkspaceScope } from '@/features/workspace/types';
import {
  getWorkspaceScopeForNode,
  isNodeScopeAnchor,
  isNodeWithinScopeBranch
} from '@/features/workspace/workspaceScope';

interface RevealRequest {
  id: string;
  nonce: number;
}

interface WorkspaceNavigatorProps {
  currentScope: WorkspaceScope;
  documentIndex: WorkspaceDocumentIndex | null;
  onScopeChange: (scope: WorkspaceScope) => void;
  onSelectNode: (node: WorkspaceNodeSummary) => void;
  readNoteNodeIds: string[];
  revealRequest: RevealRequest | null;
  selection: EditorSelection | null;
  selectedNode: WorkspaceNodeSummary | null;
}

interface NavigatorRowState {
  isHovered: boolean;
  isScopeAnchor: boolean;
  isScopeBranch: boolean;
  isSelected: boolean;
}

export function getNavigatorRowClassName(state: NavigatorRowState, showBadges: boolean): string {
  return `outline-tree-row${state.isSelected ? ' is-selected' : ''}${state.isScopeAnchor ? ' is-scope-anchor' : ''}${state.isScopeBranch ? ' is-scope-branch' : ''}${showBadges ? ' is-badges-visible' : ''}`;
}

export function getRevealExpandedNavigatorNodeIds(
  treeModel: ReturnType<typeof buildOutlineTree>,
  revealNodeId: string | null
): string[] {
  const expandedIds = new Set<string>(['root']);
  if (!revealNodeId) {
    return Array.from(expandedIds);
  }

  expandedIds.add(revealNodeId);
  (treeModel.ancestorIdsById[revealNodeId] ?? []).forEach((ancestorId) => expandedIds.add(ancestorId));

  return Array.from(expandedIds);
}

function isTreeRowSelected(node: WorkspaceNodeSummary, selectedNode: WorkspaceNodeSummary | null, selection: EditorSelection | null): boolean {
  if (selectedNode) {
    return selectedNode.id === node.id;
  }

  return selectionMatchesNode(selection, node);
}

function hasInlineNodeIcon(node: WorkspaceNodeSummary): boolean {
  switch (node.kind) {
    case 'momentumEntities':
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
    case 'bot':
    case 'impulse':
    case 'portal':
    case 'haxEffects':
    case 'haxMissions':
    case 'haxMission':
    case 'haxEffect':
    case 'haxEffectPair':
    case 'haxEffectStack':
    case 'touchStack':
    case 'abilityStack':
    case 'lavaStack':
      return true;
    default:
      return false;
  }
}

function canShowNavigatorCount(node: WorkspaceNodeSummary): boolean {
  return (
    node.kind === 'level' ||
    node.kind === 'checkpoint' ||
    node.kind === 'momentumEntities' ||
    node.kind === 'haxEffects' ||
    node.kind === 'haxMissions'
  );
}

export function WorkspaceNavigator({
  currentScope,
  documentIndex,
  onScopeChange,
  onSelectNode,
  readNoteNodeIds,
  revealRequest,
  selection,
  selectedNode
}: WorkspaceNavigatorProps) {
  const treeModel = useMemo(() => buildOutlineTree(documentIndex, readNoteNodeIds), [documentIndex, readNoteNodeIds]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set(['root']));
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!revealRequest) {
      return;
    }

    const idsToExpand = getRevealExpandedNavigatorNodeIds(treeModel, revealRequest.id);
    if (idsToExpand.length === 0) {
      return;
    }

    setExpandedNodeIds(new Set(idsToExpand));
  }, [revealRequest, treeModel]);

  useEffect(() => {
    if (!revealRequest) {
      return;
    }

    rowRefs.current[revealRequest.id]?.scrollIntoView({ block: 'nearest' });
  }, [revealRequest]);

  function toggleNode(nodeId: string): void {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      const treeNode = treeModel.nodeById[nodeId];
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        if (treeNode?.node.kind === 'level' && treeNode.node.parentId === 'root') {
          const siblingLevelIds = treeModel.nodeById.root?.children
            .filter((child) => child.node.kind === 'level')
            .map((child) => child.id) ?? [];
          siblingLevelIds.forEach((siblingId) => next.delete(siblingId));
        }

        if (treeNode?.node.kind === 'checkpoint' && treeNode.node.parentId) {
          const siblingCheckpointIds = treeModel.nodeById[treeNode.node.parentId]?.children
            .filter((child) => child.node.kind === 'checkpoint')
            .map((child) => child.id) ?? [];
          siblingCheckpointIds.forEach((siblingId) => next.delete(siblingId));
        }
        next.add(nodeId);
      }

      next.add('root');
      return next;
    });
  }

  function handleNodeSelect(node: WorkspaceNodeSummary): void {
    onSelectNode(node);
    onScopeChange(getWorkspaceScopeForNode(node));
  }

  function getRowState(node: NonNullable<typeof treeModel.root>): NavigatorRowState {
    const isSelected = isTreeRowSelected(node.node, selectedNode, selection);
    return {
      isHovered: hoveredNodeId === node.id,
      isScopeAnchor: isNodeScopeAnchor(node.node, currentScope),
      isScopeBranch: isNodeWithinScopeBranch(node.node, currentScope),
      isSelected
    };
  }

  function renderNode(node: NonNullable<typeof treeModel.root>): ReactNode {
    const isExpanded = node.id === 'root' || expandedNodeIds.has(node.id);
    const rowState = getRowState(node);
    const displayUnreadCount = isExpanded ? node.ownUnreadCount : node.aggregateUnreadCount;
    const showBadges = shouldShowNavigatorRowBadges({
      ...rowState,
      hasUnreadNotes: displayUnreadCount > 0,
      hasVisibleCount: node.directChildCount > 0 && canShowNavigatorCount(node.node)
    });
    const rowStyle = {
      '--row-depth': node.depth,
      '--row-accent': node.node.accentColor ?? '#95d9ff'
    } as CSSProperties;

    return (
      <li className="outline-tree-item" key={node.id}>
        <button
          className={getNavigatorRowClassName(rowState, showBadges)}
          data-guide-target={`navigator-node:${node.id}`}
          onClick={() => {
            handleNodeSelect(node.node);
          }}
          onPointerEnter={() => {
            setHoveredNodeId(node.id);
          }}
          onPointerLeave={() => {
            setHoveredNodeId((current) => current === node.id ? null : current);
          }}
          ref={(element) => {
            rowRefs.current[node.id] = element;
          }}
          style={rowStyle}
          type="button"
        >
          <span className="outline-tree-row-indent" />
          {node.isExpandable ? (
            <button
              aria-label={isExpanded ? `Collapse ${node.node.label}` : `Expand ${node.node.label}`}
              className="outline-tree-row-toggle"
              onClick={(event) => {
                event.stopPropagation();
                toggleNode(node.id);
              }}
              type="button"
            >
              <motion.span
                animate={{ rotate: isExpanded ? 90 : 0 }}
                className="outline-tree-row-toggle-icon"
                transition={workspaceMotionTransitions.floating}
              >
                <ChevronRight aria-hidden="true" className="button-icon" />
              </motion.span>
            </button>
          ) : (
            <span className="outline-tree-row-toggle is-empty" />
          )}
          <span className="outline-tree-row-icon">
            <NodeIcon iconKey={node.node.iconKey} kind={node.node.kind} />
            {!hasInlineNodeIcon(node.node) ? (
              <span className="outline-tree-row-bullet" />
            ) : null}
          </span>
          <span className="outline-tree-row-copy">
            <span className="outline-tree-row-label">{node.node.label}</span>
          </span>
          <span className={`outline-tree-row-badges${showBadges ? ' is-visible' : ''}`}>
            {showBadges && node.directChildCount > 0 && canShowNavigatorCount(node.node) ? (
              <span className="outline-tree-row-count">{node.directChildCount}</span>
            ) : null}
            {showBadges && displayUnreadCount > 0 ? (
              <span className="outline-tree-row-note-badge">{displayUnreadCount}</span>
            ) : null}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {node.children.length > 0 && isExpanded ? (
            <motion.ul
              animate="expanded"
              className="outline-tree-list outline-tree-list-subtree"
              exit="collapsed"
              initial="collapsed"
              style={{ overflow: 'hidden' }}
              variants={workspaceDisclosureVariants}
            >
              {node.children.map((child) => renderNode(child))}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </li>
    );
  }

  return (
    <section className="workspace-panel outline-tree-panel navigator-rail-panel" data-guide-target="navigator-panel">
      <div className="workspace-panel-header">
        <p className="navigator-rail-eyebrow">Structure</p>
      </div>
      {treeModel.root ? (
        <div className="outline-tree-scroll">
          <ul className="outline-tree-list">
            {renderNode(treeModel.root)}
          </ul>
        </div>
      ) : (
        <div className="workspace-empty-state">
          <div>
            <strong>No map loaded.</strong>
            <p>Open the Source panel, paste Workshop data, and convert it to populate the navigator.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export interface NavigatorRowMetaVisibilityState extends NavigatorRowState {
  hasUnreadNotes: boolean;
  hasVisibleCount: boolean;
}

export function shouldShowNavigatorRowBadges(state: NavigatorRowMetaVisibilityState): boolean {
  if (!state.hasUnreadNotes && !state.hasVisibleCount) {
    return state.isHovered || state.isSelected || state.isScopeAnchor || state.isScopeBranch;
  }

  return state.isHovered || state.isSelected || state.isScopeAnchor || state.isScopeBranch;
}
