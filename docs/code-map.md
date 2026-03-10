# Code Map

## Source Tree

### `src/app`

- Purpose: top-level orchestration and workspace session state.
- Allowed imports: `src/domain`, `src/features`, `src/shared`.
- Edit here when: import flow wiring or app-level state transitions change.
- Key files:
  - `App.tsx` composes the workspace provider and shell
  - `themePreference.ts` owns browser-local theme override persistence and root theme application
  - `useThemePreference.ts` wires system color tracking and manual theme switching into the shell
  - `useWorkspaceSession.ts` owns reducer/session transitions including undo-redo history, dirty tracking, and autosave recovery wiring
  - `workspaceSessionSnapshot.ts` defines the portable session snapshot schema and parse/serialize helpers
  - `workspaceSessionRecovery.ts` owns browser-local recovery storage helpers
  - `WorkspaceSessionContext.tsx` and `useSessionState.ts` expose session state/actions without prop drilling

### `src/domain`

- Purpose: canonical model semantics, import logic, and output rendering.
- Allowed imports: `src/shared` only.
- Edit here when: parsing, conversion, model invariants, or rendering behavior changes.

### `src/features/workspace`

- Purpose: editor-only types, graph helpers, and workspace UI entrypoints.
- Allowed imports: `src/domain`, `src/shared`.
- Edit here when: canvas interaction, graph layout, or workspace chrome changes.
- Key canvas modules:
  - `shell/WorkspaceShell.tsx` owns the navigator + scoped canvas shell, overlays, and the shared command palette
  - `canvas/MapCanvas.tsx` orchestrates rendering and interaction hooks for the scoped canvas
  - `canvas/useCanvasViewport.ts` owns viewport-fit, centering, and zoom-anchor math for the scoped canvas
  - `canvas/CanvasGraphSurface.tsx` owns the multi-layer Canvas 2D scene renderer and hit-test surface
  - `canvas/buildCanvasSceneSnapshot.ts` derives renderer-facing node, edge, and hotspot geometry from the editor graph
  - `outline/WorkspaceNavigator.tsx` renders the shared hierarchy rail for scope navigation
  - `useWorkspaceSelectionState.ts` owns shared selection, read-note, and inspector-tab behavior across the navigator, scoped canvas, and inspector
  - `inspector/WorkspaceNodeInspector.tsx` is the shared node inspector shell used by the docked workspace inspector
  - `documentIndex.ts` builds the document-wide structural index used by the navigator, command palette, reveal flow, and unread-note aggregation
  - `graph/buildScopeGraph.ts` builds compact scope-native canvas graphs for `document`, `level`, and `checkpoint` views
  - `canvas/useMapCanvasGraph.ts` computes the editor graph and structural auto-fit triggers
  - `canvas/useMapStructureActions.ts` centralizes document-aware structural editing handlers for both PM and Hax
  - `canvas/buildNodeContextMenu.tsx` builds format-aware context menu data from current workspace state
  - `canvas/useCanvasKeyboardShortcuts.ts` handles keyboard shortcuts and canvas-focus guards
  - `outline/buildOutlineTree.ts` derives the navigator tree model from the structural document index
  - `graph/entityConfig.ts` is the shared source of orb/bot accent and label config
  - `hax/effectNodes.ts` owns Hax effect child-node derivation, including pair nodes and wrapper-owned child entries for scoped Hax editing

### `src/shared`

- Purpose: reusable low-level utilities that do not own workflow semantics.
- Allowed imports: none of the app or feature layers.
- Edit here when: generic errors, color helpers, or Workshop expression parsing helpers change.

### `src/styles`

- Purpose: the stylesheet entrypoint plus split style files for base UI, shell, canvas, and node editor concerns.
- Allowed imports: CSS only.
- Edit here when: styling organization or stylesheet loading changes.
- Node editor style split:
  - `node-editor-base.css`
  - `node-editor-checkpoint.css`
  - `node-editor-fields.css`
  - `node-editor-entities.css`

## Edit This When

- the folder structure changes
- a new top-level source area is introduced

## Files Owned

- `docs/code-map.md`
- `src/app/*`
- `src/domain/*`
- `src/features/workspace/*`
- `src/shared/*`
- `src/styles/*`

## Tests That Must Stay Green

- `npm test`
- `npm run build`
