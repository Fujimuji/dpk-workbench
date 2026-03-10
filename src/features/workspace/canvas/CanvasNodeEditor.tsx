import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react';
import { Suspense, lazy } from 'react';
import {
  countEnabledAbilities,
  countEnabledBotAbilities,
  formatNumber,
  getEditorHeaderMeta,
  getEditorHeaderTitle,
  getNodeLabel,
  isEntityNodeKind,
  type NodeEditorTab
} from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { WorkspaceDocument } from '@/domain/document/types';
import type { MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import { WorkspaceNodeInspectorLoadingFallback } from '@/features/workspace/inspector/WorkspaceNodeInspectorLoadingFallback';
import type { EditorSelection } from '@/features/workspace/types';

export {
  countEnabledAbilities,
  countEnabledBotAbilities,
  formatNumber,
  getEditorHeaderMeta,
  getEditorHeaderTitle,
  getNodeLabel,
  isEntityNodeKind
} from '@/features/workspace/canvas/CanvasNodeEditor.shared';
export type { NodeEditorTab } from '@/features/workspace/canvas/CanvasNodeEditor.shared';

const LazyWorkspaceNodeInspector = lazy(async () => {
  const module = await import('@/features/workspace/inspector/WorkspaceNodeInspector');
  return { default: module.WorkspaceNodeInspector };
});

interface CanvasNodeEditorProps {
  activeTab: NodeEditorTab;
  document: WorkspaceDocument;
  editorChromeStyle?: CSSProperties;
  editorStyle: CSSProperties;
  editorRef: RefObject<HTMLDivElement | null>;
  map: MomentumMapModel | null;
  mountAnimation?: 'floating' | 'none';
  node: WorkspaceNodeSummary;
  onClose: () => void;
  onDocumentChange: (document: WorkspaceDocument) => void;
  onNotesViewed: (nodeId: string) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
  onSelectNodeBySelection: (selection: EditorSelection, tab?: NodeEditorTab) => void;
  onStartPanelDrag: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTabChange: (tab: NodeEditorTab) => void;
  warnings: ConversionWarning[];
}

export function CanvasNodeEditor(props: CanvasNodeEditorProps) {
  const isPortalPair = props.node.kind === 'haxEffectPair' && props.node.selection.kind === 'haxPortalPair';
  const className = `canvas-node-editor canvas-node-editor-compact${isPortalPair ? ' is-portal-pair' : ''}`;

  return (
    <Suspense
      fallback={
        <WorkspaceNodeInspectorLoadingFallback
          className={className}
          editorChromeStyle={props.editorChromeStyle}
          editorRef={props.editorRef}
          editorStyle={props.editorStyle}
          map={props.map}
          node={props.node}
          onTitlePointerDown={props.onStartPanelDrag}
        />
      }
    >
      <LazyWorkspaceNodeInspector
        {...props}
        className={className}
        mountAnimation={props.mountAnimation}
        onTitlePointerDown={props.onStartPanelDrag}
      />
    </Suspense>
  );
}
