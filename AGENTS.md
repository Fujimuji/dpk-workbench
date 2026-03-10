# AGENTS.md

## Project Summary

This repo is a browser-based Hax Framework to Project Momentum converter/editor. It is not just a parser: it converts source Workshop data into a canonical editable Project Momentum model, then lets the user edit that model through a canvas-based node editor.

## Source-of-Truth Domain Files

Treat these files as domain references:

- `Hax Framework - Effects.md`
- `Hax Framework - Checkpoint Prime Number Switches.txt`
- `Hax Framework - Example Map Data.txt`
- `Project Momentum - Example Map Data.txt`
- `Colors in Workshop.txt`

Do not casually "clean up" or reinterpret code semantics without checking these files first.

## Docs Entry Point

- Start with `docs/index.md` for the current code map and change playbooks.

## Core Code Files

- `src/app/App.tsx`: top-level composition
- `src/app/useWorkspaceSession.ts`: workspace session state and import transitions
- `src/domain/import/hax/parseHaxWorkshop.ts`: parses Hax Workshop source into `HaxSourceData`
- `src/domain/import/hax/convertHaxToMomentum.ts`: converts parsed Hax data into the editable PM model and import warnings
- `src/domain/render/renderMomentumWorkshop.ts`: renders the current PM model back into Workshop text
- `src/domain/model/mutators/`: immutable model update helpers used by the canvas editor
- `src/domain/model/mutators/structure.ts`: structural draft authoring helpers for levels/checkpoints
- `src/domain/model/validateDraftMap.ts`: draft render-readiness rules for scratch-authored maps
- `src/features/workspace/shell/WorkspaceShell.tsx`: workspace chrome and layout entrypoint
- `src/features/workspace/canvas/MapCanvas.tsx`: canvas orchestration entrypoint
- `src/features/workspace/canvas/useCanvasInteractions.ts`: pointer, drag, pan, zoom, and marquee interaction flow
- `src/features/workspace/canvas/useCanvasContextMenu.ts`: canvas right-click menu state
- `src/features/workspace/canvas/CanvasNodeEditor.tsx`: node editor shell entrypoint
- `src/features/workspace/documentIndex.ts`: structural document index for navigator, reveal, and command-palette lookups
- `src/features/workspace/structureRemap.ts`: editor-state remapping after structural edits
- `src/features/workspace/workspaceScope.ts`: scope helpers for document, level, and checkpoint views
- `src/features/workspace/graph/buildScopeGraph.ts`: scope-native canvas graph entrypoint
- `src/features/workspace/graph/buildLevelGraph.ts`: level graph assembly orchestration
- `src/features/workspace/graph/computeSwimlaneLayout.ts`: strict-column swimlane band planner

## High-Value Invariants

- `CheckpointConfig[]` always lines up with active checkpoints only.
- `checkpointConfigs.length` must always equal `checkpoints.length - 1`.
- Final checkpoints do not have gameplay config.
- Nullable PM fields use `null`, not sentinel values.
- Warnings are import notes from conversion and are not auto-resolved by later edits.
- Workspace layout state stores only `yOffset` overrides per node id.
- Default node placement is deterministic from swimlane bands; do not reintroduce absolute persisted `x/y` node coordinates.
- The scoped canvas builds only the active `document`, `level`, or `checkpoint` graph; global document awareness lives in the structural document index.
- Draft scratch-authored maps may be structurally incomplete in-session, but Output must stay blocked until render-ready.
- Bot abilities use a different order than standard ability flags:
  - `Primary Fire`
  - `Seismic Slam`
  - `Rocket Punch`

## Editing Rules

- Do not change conversion semantics casually.
- Preserve `Null` vs `Array(...)` rendering rules.
- Preserve nested array rendering for touch orbs, ability orbs, and lava.
- Preserve the "single bot per checkpoint slot" constraint unless Project Momentum semantics change.
- Prefer consistent icon usage through Lucide.
- Avoid adding decorative or non-functional UI chrome.
- Preserve the desktop-first workspace behavior unless the change explicitly redesigns the layout.
- Keep strict depth columns for graph layout (`start`, `level`, `checkpoint`, `child`).

## Required Validation

After changes, run:

```bash
npm test
npm run build
```

## When a Change Requires Docs Updates

Update docs when you change:

- conversion semantics
- renderer output shape
- core data model semantics
- workspace interaction rules
- known intentional limitations
