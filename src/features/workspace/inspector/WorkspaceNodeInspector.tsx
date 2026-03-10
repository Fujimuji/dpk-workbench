import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react';
import { Suspense, lazy, useEffect } from 'react';
import { NodeIcon } from '@/features/workspace/canvas/CanvasNodeLayer';
import { isMomentumDocument, type WorkspaceDocument } from '@/domain/document/types';
import {
  getEditorHeaderMeta,
  getEditorHeaderTitle,
  type NodeEditorTab
} from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import { createWorkspaceFloatingVariants, workspaceTabVariants } from '@/features/workspace/motion/workspaceMotion';
import type { EditorSelection } from '@/features/workspace/types';

const floatingEditorVariants = createWorkspaceFloatingVariants(10);
const LazyMomentumNodeEditorMainTab = lazy(async () => {
  const module = await import('@/features/workspace/canvas/CanvasNodeEditorMainTab');
  return { default: module.CanvasNodeEditorMainTab };
});
const LazyHaxNodeEditorMainTab = lazy(async () => {
  const module = await import('@/features/workspace/inspector/HaxNodeEditorMainTab');
  return { default: module.HaxNodeEditorMainTab };
});

interface WorkspaceNodeInspectorProps {
  activeTab: NodeEditorTab;
  className?: string;
  document: WorkspaceDocument;
  editorChromeStyle?: CSSProperties;
  editorRef?: RefObject<HTMLDivElement | null>;
  editorStyle?: CSSProperties;
  map: MomentumMapModel | null;
  mountAnimation?: 'floating' | 'none';
  node: WorkspaceNodeSummary;
  onClose: () => void;
  onDocumentChange: (document: WorkspaceDocument) => void;
  onNotesViewed: (nodeId: string) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
  onSelectNodeBySelection: (selection: EditorSelection, tab?: NodeEditorTab) => void;
  onTabChange: (tab: NodeEditorTab) => void;
  onTitlePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  warnings: ConversionWarning[];
}

function renderWarnings(nodeWarnings: ConversionWarning[]) {
  return nodeWarnings.length > 0 ? (
    <ul className="note-list">
      {nodeWarnings.map((warning, index) => (
        <li key={`${warning.code}-${index}`}>{warning.message}</li>
      ))}
    </ul>
  ) : null;
}

function EditorTabLoadingState({
  label
}: {
  label: string;
}) {
  return (
    <div className="canvas-node-editor-scroll">
      <div className="canvas-node-editor-section">
        <h3>Loading</h3>
        <p className="workspace-overlay-copy">Loading {label} editor controls.</p>
      </div>
    </div>
  );
}

export function WorkspaceNodeInspector({
  activeTab,
  className = 'canvas-node-editor canvas-node-editor-compact',
  editorChromeStyle,
  editorRef,
  editorStyle,
  document,
  map,
  mountAnimation = 'none',
  node,
  onClose,
  onDocumentChange,
  onNotesViewed,
  onReturnToCheckpoint,
  onSelectNodeBySelection,
  onTabChange,
  onTitlePointerDown,
  warnings
}: WorkspaceNodeInspectorProps) {
  const editorHeaderMeta = getEditorHeaderMeta(node, map);
  const tabs = [
    { key: 'main' as const, label: 'Main' },
    ...(warnings.length > 0 ? [{ key: 'notes' as const, label: 'Notes' }] : [])
  ];
  const safeTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : tabs[0]?.key ?? 'main';

  useEffect(() => {
    if (safeTab === 'notes') {
      onNotesViewed(node.id);
    }
  }, [node.id, onNotesViewed, safeTab]);

  return (
    <motion.div
      animate={mountAnimation === 'floating' ? 'animate' : undefined}
      className={className}
      exit={mountAnimation === 'floating' ? 'exit' : undefined}
      initial={mountAnimation === 'floating' ? 'initial' : false}
      ref={editorRef}
      style={{ ...editorStyle, ...editorChromeStyle }}
      variants={mountAnimation === 'floating' ? floatingEditorVariants : undefined}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate="animate"
          className="canvas-node-editor-shell"
          exit="exit"
          initial="initial"
          key={node.id}
          variants={workspaceTabVariants}
        >
          <div
            className={`canvas-node-editor-head${onTitlePointerDown ? '' : ' is-static'}`}
            onPointerDown={onTitlePointerDown}
          >
            <div>
              <h2>{getEditorHeaderTitle(node)}</h2>
              {editorHeaderMeta ? (
                <p className="canvas-node-editor-context">{editorHeaderMeta}</p>
              ) : null}
            </div>
            <div className="canvas-node-editor-head-tools">
              <NodeIcon iconKey={node.iconKey} kind={node.kind} />
              <button
                aria-label="Close editor"
                className="button button-ghost button-mini"
                onClick={onClose}
                onPointerDown={(event) => event.stopPropagation()}
                title="Close editor"
                type="button"
              >
                <X aria-hidden="true" className="button-icon" />
              </button>
            </div>
          </div>
          <div className="canvas-node-editor-tabs">
            {tabs.map((tab) => (
              <button
                className={`canvas-node-tab${safeTab === tab.key ? ' is-active' : ''}`}
                key={tab.key}
                onClick={() => {
                  onTabChange(tab.key);
                  if (tab.key === 'notes') {
                    onNotesViewed(node.id);
                  }
                }}
                type="button"
              >
                {safeTab === tab.key ? (
                  <motion.span
                    className="canvas-node-tab-indicator"
                    layoutId={`canvas-node-tab-indicator-${node.id}`}
                  />
                ) : null}
                <span className="canvas-node-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="canvas-node-editor-body">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate="animate"
                className="canvas-node-editor-body-panel"
                exit="exit"
                initial="initial"
                key={`${node.id}-${safeTab}`}
                variants={workspaceTabVariants}
              >
                {safeTab === 'main' && isMomentumDocument(document) && map ? (
                  <Suspense
                    fallback={<EditorTabLoadingState label="Momentum" />}
                  >
                    <LazyMomentumNodeEditorMainTab
                      map={map}
                      node={node}
                      onMapChange={(nextMap) => onDocumentChange({ format: 'momentum', map: nextMap })}
                      onSelectNodeBySelection={(selection) => onSelectNodeBySelection(selection)}
                      onReturnToCheckpoint={onReturnToCheckpoint}
                    />
                  </Suspense>
                ) : null}
                {safeTab === 'main' && document.format === 'hax' ? (
                  <Suspense
                    fallback={<EditorTabLoadingState label="Hax" />}
                  >
                    <LazyHaxNodeEditorMainTab
                      document={document}
                      node={node}
                      onDocumentChange={onDocumentChange}
                      onSelectNodeBySelection={(selection) => onSelectNodeBySelection(selection)}
                    />
                  </Suspense>
                ) : null}
                {safeTab === 'notes' ? <div className="canvas-node-editor-scroll">{renderWarnings(warnings)}</div> : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
