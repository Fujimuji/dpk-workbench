import type { NodeEditorTab } from '@/features/workspace/canvas/CanvasNodeEditor';
import { AnimatePresence, motion } from 'motion/react';
import type { WorkspaceDocument } from '@/domain/document/types';
import type { MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import { Suspense, lazy, type CSSProperties } from 'react';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import { WorkspaceNodeInspectorLoadingFallback } from '@/features/workspace/inspector/WorkspaceNodeInspectorLoadingFallback';
import { workspaceTabVariants } from '@/features/workspace/motion/workspaceMotion';
import type { EditorSelection } from '@/features/workspace/types';

const LazyWorkspaceNodeInspector = lazy(async () => {
  const module = await import('@/features/workspace/inspector/WorkspaceNodeInspector');
  return { default: module.WorkspaceNodeInspector };
});

interface WorkspaceInspectorPanelProps {
  activeTab: NodeEditorTab;
  document: WorkspaceDocument | null;
  map: MomentumMapModel | null;
  multiSelectionActive: boolean;
  onClearSelection: () => void;
  onDocumentChange: (document: WorkspaceDocument) => void;
  onNotesViewed: (nodeId: string) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
  onSelectNodeBySelection: (selection: EditorSelection, tab?: NodeEditorTab) => void;
  onTabChange: (tab: NodeEditorTab) => void;
  selectedNode: WorkspaceNodeSummary | null;
  selectedWarnings: ConversionWarning[];
}

export function getWorkspaceInspectorChromeStyle(node: WorkspaceNodeSummary | null): CSSProperties | undefined {
  if (!node) {
    return undefined;
  }

  return {
    '--panel-accent': node.panelAccentColor ?? node.accentColor ?? '#95d9ff',
    '--panel-accent-soft': node.panelAccentSoftColor ?? node.accentSoftColor ?? 'rgba(95, 217, 255, 0.18)',
    '--panel-accent-alt':
      node.panelAccentAltColor ?? node.panelAccentColor ?? node.accentColor ?? '#95d9ff',
    '--panel-accent-alt-soft':
      node.panelAccentAltSoftColor ??
      node.panelAccentSoftColor ??
      node.accentSoftColor ??
      'rgba(95, 217, 255, 0.18)'
  } as CSSProperties;
}

export function WorkspaceInspectorPanel({
  activeTab,
  document,
  map,
  multiSelectionActive,
  onClearSelection,
  onDocumentChange,
  onNotesViewed,
  onReturnToCheckpoint,
  onSelectNodeBySelection,
  onTabChange,
  selectedNode,
  selectedWarnings
}: WorkspaceInspectorPanelProps) {
  const editorChromeStyle = getWorkspaceInspectorChromeStyle(selectedNode);
  const isPortalPair =
    selectedNode?.kind === 'haxEffectPair' &&
    (selectedNode.selection.kind === 'haxSpawnPortalPair' || selectedNode.selection.kind === 'haxPortalPair');
  const inspectorClassName = `canvas-node-editor canvas-node-editor-compact workspace-node-inspector${isPortalPair ? ' is-portal-pair' : ''}`;

  return (
    <section
      className={`workspace-panel outline-inspector-panel${selectedNode ? ' is-accented' : ''}`}
      data-guide-target="inspector-panel"
      style={editorChromeStyle}
    >
      <AnimatePresence initial={false} mode="wait">
        {document && selectedNode && !multiSelectionActive ? (
          <motion.div
            animate="animate"
            className="workspace-inspector-presence"
            exit="exit"
            initial="initial"
            key="inspector-selected"
            variants={workspaceTabVariants}
          >
            <Suspense
              fallback={
                <WorkspaceNodeInspectorLoadingFallback
                  className={inspectorClassName}
                  editorChromeStyle={editorChromeStyle}
                  map={map}
                  node={selectedNode}
                />
              }
            >
              <LazyWorkspaceNodeInspector
                activeTab={activeTab}
                className={inspectorClassName}
                document={document}
                editorChromeStyle={editorChromeStyle}
                map={map}
                node={selectedNode}
                onClose={onClearSelection}
                onDocumentChange={onDocumentChange}
                onNotesViewed={onNotesViewed}
                onReturnToCheckpoint={onReturnToCheckpoint}
                onSelectNodeBySelection={onSelectNodeBySelection}
                onTabChange={onTabChange}
                warnings={selectedWarnings}
              />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            animate="animate"
            className="workspace-inspector-presence"
            exit="exit"
            initial="initial"
            key={multiSelectionActive ? 'inspector-multi' : 'inspector-empty'}
            variants={workspaceTabVariants}
          >
            <div className="workspace-empty-state outline-inspector-empty">
              <div>
                <strong>{multiSelectionActive ? 'Multi-selection is canvas-only.' : 'No item selected.'}</strong>
                <p>
                  {multiSelectionActive
                    ? 'Return to the scoped canvas to edit a multi-selection, or pick a single item from the navigator.'
                    : 'Select an item from the navigator or scoped canvas to inspect and edit it here.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
