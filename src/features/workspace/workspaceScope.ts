import { getNodeIdFromSelection } from '@/features/workspace/canvas/selection';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import type { WorkspaceDocument } from '@/domain/document/types';
import type { EditorSelection, WorkspaceScope } from '@/features/workspace/types';

export interface WorkspaceScopeBreadcrumb {
  id: string;
  label: string;
  scope: WorkspaceScope;
}

export function getDefaultWorkspaceScope(): WorkspaceScope {
  return { kind: 'document' };
}

export function getWorkspaceScopeForSelection(selection: EditorSelection | null): WorkspaceScope {
  if (!selection) {
    return getDefaultWorkspaceScope();
  }

  switch (selection.kind) {
    case 'start':
    case 'haxSpawnEffects':
    case 'haxSpawnEffect':
    case 'haxSpawnPortalPair':
    case 'haxSpawnZiplinePair':
      return { kind: 'document' };
    case 'level':
      return { kind: 'level', levelIndex: selection.levelIndex };
    case 'checkpoint':
    case 'momentumEntities':
    case 'haxEffects':
    case 'haxMissions':
    case 'haxMission':
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
    case 'bot':
    case 'impulse':
    case 'portal':
    case 'haxEffect':
    case 'haxPortalPair':
    case 'haxZiplinePair':
      return {
        kind: 'checkpoint',
        levelIndex: selection.levelIndex,
        checkpointIndex: selection.checkpointIndex
      };
  }
}

export function getWorkspaceScopeForNode(node: WorkspaceNodeSummary): WorkspaceScope {
  return getWorkspaceScopeForSelection(node.selection);
}

export function getWorkspaceScopeNodeId(scope: WorkspaceScope): string {
  switch (scope.kind) {
    case 'document':
      return 'root';
    case 'level':
      return getNodeIdFromSelection({ kind: 'level', levelIndex: scope.levelIndex });
    case 'checkpoint':
      return getNodeIdFromSelection({
        kind: 'checkpoint',
        levelIndex: scope.levelIndex,
        checkpointIndex: scope.checkpointIndex
      });
  }
}

export function isNodeScopeAnchor(node: WorkspaceNodeSummary, scope: WorkspaceScope): boolean {
  return node.id === getWorkspaceScopeNodeId(scope);
}

export function isNodeWithinScopeBranch(node: WorkspaceNodeSummary, scope: WorkspaceScope): boolean {
  switch (scope.kind) {
    case 'document':
      return (
        node.id === 'root' ||
        node.parentId === 'root' ||
        node.selection.kind === 'haxSpawnEffect' ||
        node.selection.kind === 'haxSpawnPortalPair' ||
        node.selection.kind === 'haxSpawnZiplinePair'
      );
    case 'level':
      return node.id === 'root' || (node.kind === 'level' && node.levelIndex === scope.levelIndex) || (
        node.kind === 'checkpoint' &&
        node.levelIndex === scope.levelIndex
      );
    case 'checkpoint':
      return (
        node.id === 'root' ||
        (node.kind === 'level' && node.levelIndex === scope.levelIndex) ||
        (
          node.levelIndex === scope.levelIndex &&
          node.checkpointIndex === scope.checkpointIndex
        )
      );
  }
}

export function buildWorkspaceScopeBreadcrumbs(scope: WorkspaceScope): WorkspaceScopeBreadcrumb[] {
  const breadcrumbs: WorkspaceScopeBreadcrumb[] = [
    {
      id: 'document',
      label: 'Spawn View',
      scope: { kind: 'document' }
    }
  ];

  if (scope.kind === 'document') {
    return breadcrumbs;
  }

  breadcrumbs.push({
    id: `level-${scope.levelIndex}`,
    label: `Level ${scope.levelIndex + 1}`,
    scope: { kind: 'level', levelIndex: scope.levelIndex }
  });

  if (scope.kind === 'checkpoint') {
    breadcrumbs.push({
      id: `level-${scope.levelIndex}-checkpoint-${scope.checkpointIndex}`,
      label: `Checkpoint ${scope.checkpointIndex + 1}`,
      scope: {
        kind: 'checkpoint',
        levelIndex: scope.levelIndex,
        checkpointIndex: scope.checkpointIndex
      }
    });
  }

  return breadcrumbs;
}

export function getWorkspaceScopeDescription(
  scope: WorkspaceScope,
  documentFormat?: WorkspaceDocument['format'] | null
): string {
  switch (scope.kind) {
    case 'document':
      return documentFormat === 'hax'
        ? 'Spawn View shows spawn, level boundaries, and top-level Hax wrappers'
        : 'Spawn View shows spawn and level boundaries';
    case 'level':
      return `Level ${scope.levelIndex + 1} and its checkpoints`;
    case 'checkpoint':
      return `Checkpoint ${scope.checkpointIndex + 1} and its local child nodes`;
  }
}
