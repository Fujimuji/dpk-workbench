import { useEffect, type ReactNode, useState } from 'react';

export interface CanvasContextMenuItem {
  accentTone?:
    | 'default'
    | 'touch'
    | 'ability'
    | 'lava'
    | 'bot'
    | 'haxTime'
    | 'haxDeath'
    | 'haxPermeation'
    | 'haxCheckpoint'
    | 'haxPortal'
    | 'haxBlackhole'
    | 'haxZipline'
    | 'haxShootableOrb'
    | 'haxBounce';
  separated?: boolean;
  id: string;
  icon?: ReactNode;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

interface CanvasContextMenuState {
  x: number;
  y: number;
  items: CanvasContextMenuItem[];
}

export function useCanvasContextMenu() {
  const [menu, setMenu] = useState<CanvasContextMenuState | null>(null);

  useEffect(() => {
    if (!menu) {
      return;
    }

    function handleMouseDown(): void {
      setMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setMenu(null);
      }
    }

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menu]);

  function openContextMenu(x: number, y: number, items: CanvasContextMenuItem[]): void {
    if (items.length === 0) {
      setMenu(null);
      return;
    }

    setMenu({ x, y, items });
  }

  function closeContextMenu(): void {
    setMenu(null);
  }

  return {
    closeContextMenu,
    menu,
    openContextMenu
  };
}
