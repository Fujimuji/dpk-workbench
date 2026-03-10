import { useEffect, useMemo, useState } from 'react';
import type {
  CommandPaletteCommandEntry,
  CommandPaletteEntry,
  CommandPaletteNodeEntry,
  CommandPaletteResults
} from '@/features/workspace/canvas/commandPaletteTypes';

interface UseCommandPaletteOptions {
  commands: CommandPaletteCommandEntry[];
  nodes: CommandPaletteNodeEntry[];
}

const EMPTY_RESULTS: CommandPaletteResults = {
  commands: [],
  nodes: [],
  flatEntries: []
};

export function useCommandPalette({ commands, nodes }: UseCommandPaletteOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [filterEntries, setFilterEntries] =
    useState<null | ((commands: CommandPaletteCommandEntry[], nodes: CommandPaletteNodeEntry[], query: string) => CommandPaletteResults)>(null);
  const results = useMemo(
    () => (isOpen && filterEntries ? filterEntries(commands, nodes, query) : EMPTY_RESULTS),
    [commands, filterEntries, isOpen, nodes, query]
  );

  useEffect(() => {
    if (!isOpen || filterEntries) {
      return;
    }

    let cancelled = false;

    void import('@/features/workspace/canvas/commandPalette').then((module) => {
      if (!cancelled) {
        setFilterEntries(() => module.filterCommandPaletteEntries);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filterEntries, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setHighlightedIndex((current) => {
      if (results.flatEntries.length === 0) {
        return 0;
      }

      return Math.min(current, results.flatEntries.length - 1);
    });
  }, [isOpen, results.flatEntries.length]);

  function openPalette(): void {
    setIsOpen(true);
    setQuery('');
    setHighlightedIndex(0);
  }

  function closePalette(): void {
    setIsOpen(false);
    setQuery('');
    setHighlightedIndex(0);
  }

  function moveHighlight(delta: number): void {
    if (results.flatEntries.length === 0) {
      return;
    }

    setHighlightedIndex((current) => {
      const next = current + delta;
      if (next < 0) {
        return results.flatEntries.length - 1;
      }

      if (next >= results.flatEntries.length) {
        return 0;
      }

      return next;
    });
  }

  function setHighlightedEntry(entry: CommandPaletteEntry): void {
    const nextIndex = results.flatEntries.findIndex((candidate) => candidate.id === entry.id);
    if (nextIndex >= 0) {
      setHighlightedIndex(nextIndex);
    }
  }

  function executeEntry(entry: CommandPaletteEntry): void {
    entry.onSelect();
    closePalette();
  }

  function executeHighlightedEntry(): void {
    const entry = results.flatEntries[highlightedIndex];
    if (!entry) {
      return;
    }

    executeEntry(entry);
  }

  return {
    closePalette,
    executeEntry,
    executeHighlightedEntry,
    highlightedEntry: results.flatEntries[highlightedIndex] ?? null,
    highlightedIndex,
    isOpen,
    moveHighlight,
    openPalette,
    query,
    results,
    setHighlightedEntry,
    setQuery
  };
}
