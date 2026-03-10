import { describe, expect, it } from 'vitest';
import {
  isEditableEventTarget,
  resolveCanvasShortcutAction
} from '../features/workspace/canvas/useCanvasKeyboardShortcuts';

describe('useCanvasKeyboardShortcuts helpers', () => {
  it('identifies editable event targets', () => {
    const input = document.createElement('input');
    expect(isEditableEventTarget(input)).toBe(true);

    const textarea = document.createElement('textarea');
    expect(isEditableEventTarget(textarea)).toBe(true);

    const contentEditable = document.createElement('div');
    contentEditable.setAttribute('contenteditable', 'true');
    expect(isEditableEventTarget(contentEditable)).toBe(true);

    const normalDiv = document.createElement('div');
    expect(isEditableEventTarget(normalDiv)).toBe(false);
  });

  it('resolves keyboard shortcuts with focus gating and capability checks', () => {
    expect(
      resolveCanvasShortcutAction(
        { key: 'z', ctrlKey: true, metaKey: false, shiftKey: false },
        {
          canDeleteSelection: false,
          canRedo: false,
          canUndo: true,
          hasSelection: false,
          isCanvasFocused: false
        }
      )
    ).toBe('undo');

    expect(
      resolveCanvasShortcutAction(
        { key: 'Delete', ctrlKey: false, metaKey: false, shiftKey: false },
        {
          canDeleteSelection: true,
          canRedo: false,
          canUndo: false,
          hasSelection: true,
          isCanvasFocused: false
        }
      )
    ).toBe('delete');

    expect(
      resolveCanvasShortcutAction(
        { key: 'a', ctrlKey: true, metaKey: false, shiftKey: false },
        {
          canDeleteSelection: false,
          canRedo: false,
          canUndo: false,
          hasSelection: false,
          isCanvasFocused: false
        }
      )
    ).toBeNull();

    expect(
      resolveCanvasShortcutAction(
        { key: 'a', ctrlKey: true, metaKey: false, shiftKey: false },
        {
          canDeleteSelection: false,
          canRedo: false,
          canUndo: false,
          hasSelection: false,
          isCanvasFocused: true
        }
      )
    ).toBe('select-all');

    expect(
      resolveCanvasShortcutAction(
        { key: 'f', ctrlKey: false, metaKey: false, shiftKey: false },
        {
          canDeleteSelection: false,
          canRedo: false,
          canUndo: false,
          hasSelection: false,
          isCanvasFocused: true
        }
      )
    ).toBe('fit-graph');

    expect(
      resolveCanvasShortcutAction(
        { key: 'Escape', ctrlKey: false, metaKey: false, shiftKey: false },
        {
          canDeleteSelection: false,
          canRedo: false,
          canUndo: false,
          hasSelection: true,
          isCanvasFocused: false
        }
      )
    ).toBe('clear-selection');
  });
});
