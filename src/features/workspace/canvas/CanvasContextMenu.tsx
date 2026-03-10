import { useLayoutEffect, useRef, useState } from 'react';
import type { CanvasContextMenuItem } from '@/features/workspace/canvas/useCanvasContextMenu';

interface CanvasContextMenuProps {
  items: CanvasContextMenuItem[];
  x: number;
  y: number;
}

export function CanvasContextMenu({ items, x, y }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - rect.height - 8, y))
    });
  }, [items, x, y]);

  return (
    <div
      className="canvas-context-menu"
      onMouseDown={(event) => event.stopPropagation()}
      ref={menuRef}
      role="menu"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {items.map((item) => (
        <button
          className={`canvas-context-menu-item${item.accentTone ? ` is-accent-${item.accentTone}` : ''}${item.danger ? ' is-danger' : ''}${item.separated ? ' has-separator' : ''}`}
          disabled={item.disabled}
          key={item.id}
          onClick={(event) => {
            event.stopPropagation();
            if (!item.disabled) {
              item.onSelect();
            }
          }}
          type="button"
        >
          {item.icon ? <span className="canvas-context-menu-item-icon" aria-hidden="true">{item.icon}</span> : null}
          {item.label}
        </button>
      ))}
    </div>
  );
}
