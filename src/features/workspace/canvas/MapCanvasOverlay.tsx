import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  CanvasNodeEditor,
  type NodeEditorTab
} from '@/features/workspace/canvas/CanvasNodeEditor';
import type { WorkspaceDocument } from '@/domain/document/types';
import type { MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import type { EditorNodeSummary } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';

interface MapCanvasScreenPosition {
  x: number;
  y: number;
  metrics: {
    rect: DOMRect;
    renderScale: number;
  };
}

interface MapCanvasOverlayProps {
  activeTab: NodeEditorTab;
  document: WorkspaceDocument;
  editorRef: RefObject<HTMLDivElement | null>;
  map: MomentumMapModel | null;
  onClose: () => void;
  onDocumentChange: (document: WorkspaceDocument) => void;
  onNotesViewed: (nodeId: string) => void;
  onReturnToCheckpoint: (levelIndex: number, checkpointIndex: number) => void;
  onSelectNodeBySelection: (selection: EditorSelection, tab?: NodeEditorTab) => void;
  onStartPanelDrag: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTabChange: (tab: NodeEditorTab) => void;
  panelOffset: { x: number; y: number };
  screenPosition: MapCanvasScreenPosition | null;
  selectedNode: EditorNodeSummary | null;
  selectedWarnings: ConversionWarning[];
  showEditorPanel: boolean;
  viewScale: number;
}

export function MapCanvasOverlay({
  activeTab,
  document,
  editorRef,
  map,
  onClose,
  onDocumentChange,
  onNotesViewed,
  onReturnToCheckpoint,
  onSelectNodeBySelection,
  onStartPanelDrag,
  onTabChange,
  panelOffset,
  screenPosition,
  selectedNode,
  selectedWarnings,
  showEditorPanel,
  viewScale
}: MapCanvasOverlayProps) {
  const renderedNodeWidth =
    selectedNode && screenPosition
      ? selectedNode.width * viewScale * screenPosition.metrics.renderScale
      : 0;
  const requestedOverlayWidth = selectedNode?.overlayWidth ?? 300;
  const preferredOverlayHeight = selectedNode?.overlayHeight ?? 320;
  const availableViewportWidth = screenPosition ? Math.max(300, screenPosition.metrics.rect.width - 24) : requestedOverlayWidth;
  const overlayWidth = Math.min(requestedOverlayWidth, availableViewportWidth);
  const availableViewportHeight = screenPosition ? Math.max(280, screenPosition.metrics.rect.height - 24) : 360;
  const preferredPanelGap =
    selectedNode && screenPosition
      ? Math.max(16, 18 * screenPosition.metrics.renderScale)
      : 16;
  const editorBox =
    selectedNode && screenPosition
      ? {
          left:
            Math.max(
              12,
              Math.min(
                screenPosition.metrics.rect.width - overlayWidth - 12,
                screenPosition.x + renderedNodeWidth + preferredPanelGap
              )
            ) + panelOffset.x,
          top:
            Math.max(
              12,
              Math.min(screenPosition.metrics.rect.height - preferredOverlayHeight - 12, screenPosition.y - 72)
            ) + panelOffset.y,
          width: overlayWidth,
          maxHeight: availableViewportHeight
        }
      : null;
  const editorStyle =
    editorBox
      ? ({
          left: `${editorBox.left}px`,
          top: `${editorBox.top}px`,
          width: `${editorBox.width}px`,
          maxHeight: `${editorBox.maxHeight}px`
        } as CSSProperties)
      : null;
  const editorChromeStyle =
    selectedNode
      ? ({
          '--panel-accent': selectedNode.panelAccentColor ?? selectedNode.accentColor ?? '#95d9ff',
          '--panel-accent-soft': selectedNode.panelAccentSoftColor ?? selectedNode.accentSoftColor ?? 'rgba(95, 217, 255, 0.18)',
          '--panel-accent-alt': selectedNode.panelAccentAltColor ?? selectedNode.panelAccentColor ?? selectedNode.accentColor ?? '#95d9ff',
          '--panel-accent-alt-soft':
            selectedNode.panelAccentAltSoftColor ??
            selectedNode.panelAccentSoftColor ??
            selectedNode.accentSoftColor ??
            'rgba(95, 217, 255, 0.18)'
        } as CSSProperties)
      : undefined;

  return (
    <div className="map-overlay-layer">
      <AnimatePresence>
        {showEditorPanel && selectedNode && editorStyle ? (
          <CanvasNodeEditor
            activeTab={activeTab}
            document={document}
            editorChromeStyle={editorChromeStyle}
            editorRef={editorRef}
            editorStyle={editorStyle}
            map={map}
            mountAnimation="floating"
            node={selectedNode}
            onClose={onClose}
            onDocumentChange={onDocumentChange}
            onNotesViewed={onNotesViewed}
            onReturnToCheckpoint={onReturnToCheckpoint}
            onSelectNodeBySelection={onSelectNodeBySelection}
            onStartPanelDrag={onStartPanelDrag}
            onTabChange={onTabChange}
            warnings={selectedWarnings}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
