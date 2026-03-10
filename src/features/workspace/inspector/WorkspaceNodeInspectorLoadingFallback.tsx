import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react';
import { getEditorHeaderMeta, getEditorHeaderTitle } from '@/features/workspace/canvas/CanvasNodeEditor.shared';
import type { MomentumMapModel } from '@/domain/model/types';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';

interface WorkspaceNodeInspectorLoadingFallbackProps {
  className?: string;
  editorChromeStyle?: CSSProperties;
  editorRef?: RefObject<HTMLDivElement | null>;
  editorStyle?: CSSProperties;
  map: MomentumMapModel | null;
  node: WorkspaceNodeSummary;
  onTitlePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

export function WorkspaceNodeInspectorLoadingFallback({
  className = 'canvas-node-editor canvas-node-editor-compact',
  editorChromeStyle,
  editorRef,
  editorStyle,
  map,
  node,
  onTitlePointerDown
}: WorkspaceNodeInspectorLoadingFallbackProps) {
  const editorHeaderMeta = getEditorHeaderMeta(node, map);

  return (
    <div
      className={className}
      ref={editorRef}
      style={{ ...editorStyle, ...editorChromeStyle }}
    >
      <div className="canvas-node-editor-shell">
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
        </div>
        <div className="canvas-node-editor-body">
          <div className="canvas-node-editor-scroll">
            <div className="canvas-node-editor-section">
              <h3>Loading</h3>
              <p className="workspace-overlay-copy">Loading editor controls for this node.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
