import { useEffect } from 'react';

export type CanvasShortcutAction =
  | 'undo'
  | 'redo'
  | 'delete'
  | 'clear-selection'
  | 'select-all'
  | 'fit-graph'
  | null;

export interface CanvasShortcutResolutionInput {
  canDeleteSelection: boolean;
  canRedo: boolean;
  canUndo: boolean;
  hasSelection: boolean;
  isCanvasFocused: boolean;
}

export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function resolveCanvasShortcutAction(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
  input: CanvasShortcutResolutionInput
): CanvasShortcutAction {
  const hasPrimaryModifier = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (hasPrimaryModifier && key === 'z') {
    if (event.shiftKey) {
      return input.canRedo ? 'redo' : null;
    }

    return input.canUndo ? 'undo' : null;
  }

  if (hasPrimaryModifier && key === 'y') {
    return input.canRedo ? 'redo' : null;
  }

  if ((key === 'delete' || key === 'backspace') && input.canDeleteSelection) {
    return 'delete';
  }

  if (key === 'escape' && input.hasSelection) {
    return 'clear-selection';
  }

  if (hasPrimaryModifier && key === 'a' && input.isCanvasFocused) {
    return 'select-all';
  }

  if (key === 'f' && input.isCanvasFocused) {
    return 'fit-graph';
  }

  return null;
}

interface UseCanvasKeyboardShortcutsOptions {
  canDeleteSelection: boolean;
  canRedo: boolean;
  canUndo: boolean;
  hasSelection: boolean;
  isCanvasFocused: () => boolean;
  onClearSelection: () => void;
  onCloseTransientUi: () => void;
  onDeleteSelection: () => void;
  onFitGraph: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onUndo: () => void;
}

export function useCanvasKeyboardShortcuts({
  canDeleteSelection,
  canRedo,
  canUndo,
  hasSelection,
  isCanvasFocused,
  onClearSelection,
  onCloseTransientUi,
  onDeleteSelection,
  onFitGraph,
  onRedo,
  onSelectAll,
  onUndo
}: UseCanvasKeyboardShortcutsOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isEditableEventTarget(event.target)) {
        return;
      }

      const action = resolveCanvasShortcutAction(event, {
        canDeleteSelection,
        canRedo,
        canUndo,
        hasSelection,
        isCanvasFocused: isCanvasFocused()
      });
      if (!action) {
        return;
      }

      event.preventDefault();

      switch (action) {
        case 'undo':
          onUndo();
          break;
        case 'redo':
          onRedo();
          break;
        case 'delete':
          onDeleteSelection();
          break;
        case 'clear-selection':
          onClearSelection();
          break;
        case 'select-all':
          onSelectAll();
          break;
        case 'fit-graph':
          onFitGraph();
          break;
      }

      onCloseTransientUi();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    canDeleteSelection,
    canRedo,
    canUndo,
    hasSelection,
    isCanvasFocused,
    onClearSelection,
    onCloseTransientUi,
    onDeleteSelection,
    onFitGraph,
    onRedo,
    onSelectAll,
    onUndo
  ]);
}
