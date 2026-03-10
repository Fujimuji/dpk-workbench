# Architecture

## Overview

The app is now organized around explicit boundaries:

- `src/app`: top-level orchestration and session state
- `src/domain`: canonical model, import, and render logic
- `src/features/workspace`: editor-only UI and graph concerns
- `src/shared`: reusable utilities without workflow ownership

The previous `src/lib` and `src/components` compatibility shims have been removed. The current source of truth is the `app/domain/features/shared` layout.

## Core Flow

1. `src/app/App.tsx` creates the workspace session through `useWorkspaceSession`
2. `src/app/importSourceText.ts` detects the source format
3. Hax input uses `src/domain/import/hax/parseHaxWorkshop.ts` and stays as a first-class Hax document
4. PM input uses `src/domain/import/pm/parseMomentumWorkshop.ts`
5. `src/app/useWorkspaceSession.ts` stores a discriminated workspace document, a derived graph projection map, conversion warnings, and editor-only state
6. `src/features/workspace/shell/WorkspaceShell.tsx` renders the shell
7. `src/features/workspace/canvas/MapCanvas.tsx` orchestrates the canvas, while `useCanvasInteractions.ts`, `useMapCanvasSelection.ts`, and `MapCanvasOverlay.tsx` hold the main interaction and overlay seams
8. `src/domain/model/mutators/` applies immutable PM model updates, while `src/domain/import/hax/mutators.ts` applies immutable Hax document updates
9. `src/domain/render/renderMomentumWorkshop.ts` and `src/domain/render/renderHaxWorkshop.ts` regenerate Workshop output

## Ownership

### `src/app`

- owns import success/failure transitions
- owns copy status and clipboard orchestration
- does not own domain parsing or rendering rules

### `src/domain`

- owns canonical model types
- owns immutable model mutation helpers
- owns parser and renderer entrypoints
- must not import from `src/features`

### `src/features/workspace`

- owns editor-only types
- owns new graph utility entrypoints
- may consume `src/domain` and `src/shared`

### `src/shared`

- owns low-level utility code such as error types and Workshop expression parsing

## Edit This When

- the ownership boundaries change
- orchestration moves between layers
- source entrypoints move between top-level areas

## Files Owned

- `docs/architecture.md`
- `src/app/*`
- `src/domain/*`
- `src/features/workspace/*`
- `src/shared/*`

## Tests That Must Stay Green

- `npm test`
- `npm run build`
