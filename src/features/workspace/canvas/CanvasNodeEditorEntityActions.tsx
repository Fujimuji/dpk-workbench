import { Trash2 } from 'lucide-react';

interface CanvasNodeEditorEntityActionsProps {
  onRemove: () => void;
  onReturnToCheckpoint: () => void;
}

export function CanvasNodeEditorEntityActions({
  onRemove,
  onReturnToCheckpoint
}: CanvasNodeEditorEntityActionsProps) {
  return (
    <div className="canvas-node-editor-actions">
      <button
        className="button button-ghost button-mini"
        onClick={onReturnToCheckpoint}
        type="button"
      >
        Return To Checkpoint
      </button>
      <button
        className="button button-ghost button-mini"
        onClick={onRemove}
        type="button"
      >
        <Trash2 aria-hidden="true" className="button-icon" />
        Remove
      </button>
    </div>
  );
}
