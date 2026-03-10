import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { CommandPaletteEntry, CommandPaletteResults } from '@/features/workspace/canvas/commandPaletteTypes';
import { createWorkspaceFloatingVariants, workspaceScrimVariants } from '@/features/workspace/motion/workspaceMotion';

const commandPaletteVariants = createWorkspaceFloatingVariants(10);

interface CanvasCommandPaletteProps {
  highlightedEntry: CommandPaletteEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onEntryHover: (entry: CommandPaletteEntry) => void;
  onEntrySelect: (entry: CommandPaletteEntry) => void;
  onExecuteHighlightedEntry: () => void;
  onMoveHighlight: (delta: number) => void;
  onQueryChange: (value: string) => void;
  query: string;
  results: CommandPaletteResults;
}

export function CanvasCommandPalette({
  highlightedEntry,
  isOpen,
  onClose,
  onEntryHover,
  onEntrySelect,
  onExecuteHighlightedEntry,
  onMoveHighlight,
  onQueryChange,
  query,
  results
}: CanvasCommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const highlightedRef = useRef<HTMLButtonElement | null>(null);
  const [hoverSuspended, setHoverSuspended] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    highlightedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [highlightedEntry]);

  useEffect(() => {
    if (!isOpen) {
      setHoverSuspended(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleEntryRender(entry: CommandPaletteEntry) {
    const isHighlighted = highlightedEntry?.id === entry.id;

    return (
      <button
        className={`canvas-command-palette-item${isHighlighted ? ' is-highlighted' : ''}`}
        key={`${entry.entryType}-${entry.id}`}
        onClick={() => onEntrySelect(entry)}
        onPointerMove={() => {
          if (hoverSuspended) {
            setHoverSuspended(false);
          }
          onEntryHover(entry);
        }}
        ref={isHighlighted ? highlightedRef : undefined}
        type="button"
      >
        <span className="canvas-command-palette-item-label">{entry.label}</span>
        {entry.meta ? <span className="canvas-command-palette-item-meta">{entry.meta}</span> : null}
      </button>
    );
  }

  return (
    <motion.div
      animate="animate"
      className="canvas-command-palette-layer"
      exit="exit"
      initial="initial"
      onPointerDown={onClose}
      variants={workspaceScrimVariants}
    >
      <motion.div
        animate="animate"
        aria-label="Command palette"
        className="canvas-command-palette"
        exit="exit"
        initial="initial"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
        variants={commandPaletteVariants}
      >
        <div className="canvas-command-palette-head">
          <div className="canvas-command-palette-search">
            <Search aria-hidden="true" className="button-icon" />
            <input
              className="workspace-input canvas-command-palette-input"
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                switch (event.key) {
                  case 'ArrowDown':
                    event.preventDefault();
                    setHoverSuspended(true);
                    onMoveHighlight(1);
                    break;
                  case 'ArrowUp':
                    event.preventDefault();
                    setHoverSuspended(true);
                    onMoveHighlight(-1);
                    break;
                  case 'Enter':
                    event.preventDefault();
                    onExecuteHighlightedEntry();
                    break;
                  case 'Escape':
                    event.preventDefault();
                    onClose();
                    break;
                }
              }}
              placeholder="Jump to a node or run a workspace command"
              ref={inputRef}
              spellCheck={false}
              value={query}
            />
          </div>
          <button
            aria-label="Close command palette"
            className="button button-ghost button-mini"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="button-icon" />
          </button>
        </div>

        <div className="canvas-command-palette-results">
          {results.commands.length > 0 ? (
            <section className="canvas-command-palette-section" aria-label="Commands">
              <h2>Commands</h2>
              <div className="canvas-command-palette-list">
                {results.commands.map((entry) => handleEntryRender(entry))}
              </div>
            </section>
          ) : null}

          {results.nodes.length > 0 ? (
            <section className="canvas-command-palette-section" aria-label="Nodes">
              <h2>Nodes</h2>
              <div className="canvas-command-palette-list">
                {results.nodes.map((entry) => handleEntryRender(entry))}
              </div>
            </section>
          ) : null}

          {results.commands.length === 0 && results.nodes.length === 0 ? (
            <p className="canvas-command-palette-empty">No matching commands or nodes.</p>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
