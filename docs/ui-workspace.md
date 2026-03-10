# UI Workspace Conventions

## Current Shell

The app is a desktop-first workspace editor.

Current structure:

- shared hierarchy-first shell with a persistent navigator, scoped canvas, and docked inspector
- floating command dock
- floating source/output overlay panels
- floating recovery and confirmation prompts
- a first-run welcome prompt plus a replayable interactive guide hub
- floating status chips
- floating toast feedback
- floating light/dark theme controls in the command dock

There is intentionally no decorative activity rail.

## Structure Map

- is the primary editing surface
- is organized around focused modules:
- `MapCanvas.tsx` for orchestration
- `WorkspaceNavigator.tsx` for the shared hierarchy tree
- `useWorkspaceSelectionState.ts` for shared selection, note-read, and inspector-tab state
- `useMapCanvasGraph.ts` for graph memoization and structural auto-fit behavior
- `useMapStructureActions.ts` for structural edit handlers and remap application
- `buildNodeContextMenu.tsx` for pure node context menu item assembly
- `useCanvasKeyboardShortcuts.ts` for shortcut resolution and guards
- `CanvasGraphSurface.tsx` for the layered canvas renderer and scene hit-testing
- `buildCanvasSceneSnapshot.ts` for node/edge projection into renderer-facing draw geometry
- `useCanvasInteractions.ts` for pointer and drag flow
- `useCanvasViewport.ts` for viewport fit, centering, and zoom-anchor math
- `CanvasNodeEditor.tsx`, `WorkspaceNodeInspector.tsx`, `WorkspaceInspectorPanel.tsx`, and subcomponents for shared inspector content
- `documentIndex.ts` and `workspaceScope.ts` for global structural indexing, reveal/breadcrumb state, and navigator data
- `graph/buildScopeGraph.ts` for scope-native canvas graph building (`document`, `level`, `checkpoint`)
- supports zoom and pan
- supports node selection
- supports model-history undo and redo for map mutations
- supports session save/open as portable JSON snapshots
- supports debounced browser-local recovery autosave with startup restore prompt
- persists read/dismissed import-note markers in saved sessions and recovery snapshots
- supports additive `Ctrl + Click` multi-selection for visible nodes
- supports confirmed bulk delete for removable multi-selection sets
- uses strict depth columns (`root`, `level`, `checkpoint`, `child`) with deterministic swimlane band packing
- stores manual node drag as per-node `yOffset` only (no persisted `x` drag)
- dragging a node carries its full rendered subtree, not just the selected row itself
- node drag uses transient canvas preview offsets during pointermove and commits layout on pointerup
- uses explicit workspace scope:
  - `document`: Spawn View, plus levels and any format-specific top-level wrappers that are intentionally visible
  - `level`: one level and its checkpoints
  - `checkpoint`: one checkpoint plus its child wrappers/entities
- recomputes a denser local tree layout per scope instead of reusing full-document positions verbatim
- keeps a persistent left navigator, scoped center canvas, and docked right inspector in the primary layout
- uses a slim editorial navigator rail instead of boxed tree cards
- keeps navigator rows single-line and disclosure separate from selection
- expands navigator branches only through the chevron or explicit reveal flows
- keeps level disclosure accordion-style at the root and checkpoint disclosure accordion-style within each level
- hides child entity detail outside checkpoint scope by default
- uses a custom right-click context menu for wrapper-owned child creation and quick remove actions
- routes context-menu delete through bulk delete when the clicked node is part of an active multi-selection
- lets users double-click a level or checkpoint node on the canvas to drill into its scoped view
- creation actions always reveal the new node immediately instead of leaving selection off-screen
- level creation from document scope keeps the canvas in document view, and checkpoint creation from level scope keeps the canvas in level view
- no longer shows checkpoint add sockets on selected checkpoints
- uses compact tabbed node editors instead of long stacked cards
- uses subtle node-owned note markers instead of badge rows
- exposes a compact `?` help popover in the canvas toolbar for shortcut discovery
- exposes `Open Guide` from both the command palette and the canvas `?` help popover
- uses icon-plus-pill shortcut rows instead of raw keyboard markup inside the help popover
- uses clean bundled examples as the interactive-guide environment when a guide needs predictable practice data
- renders the graph surface through layered Canvas 2D (`grid`, `scene`, `hud`) instead of SVG
- uses node-side selection emphasis instead of a tether line between the node and the docked inspector
- renders Hax checkpoint effects as child nodes instead of inline checkpoint rows
- renders a Hax `Effects` wrapper under Spawn so spawn-owned Hax effects are editable as scoped-canvas and navigator child nodes too
- reserves dedicated canvas space for the Hax spawn `Effects` subtree between `Spawn` and the derived level tree so it does not tangle with level/checkpoint edge flow
- renders `Effects` and `Missions` wrapper nodes under every Hax checkpoint, even when empty
- renders an `Entities` wrapper node under every non-finish Project Momentum checkpoint, even when empty
- moves Project Momentum touch orb, ability orb, lava orb, bot, impulse, and portal creation onto the `Entities` wrapper in both the navigator and the scoped canvas inspector
- renders PM impulses and portals as individual child nodes under `Entities`; portals stay a single paired node rather than split entry/exit children
- keeps PM impulse and portal layout simple in v1: no grouping or stack presentation
- uses paired Hax child nodes for portal entry/exit and zipline start/end editing
- keeps Hax effect editing in dedicated effect-node inspectors instead of embedding effect controls into checkpoint inspectors
- keeps Hax mission editing in dedicated mission-node inspectors instead of embedding mission controls into checkpoint inspectors
- uses a structured Hax `Missions` action palette in the inspector instead of a single add button
- keeps Hax checkpoint inspector sections individually collapsible so long framework panels can be compacted without leaving the shared inspector surface
- keeps Project Momentum checkpoint and entity inspectors sectioned with the same shared disclosure pattern, including geometry and secondary settings blocks
- hides portal radius controls because Hax portals use a fixed framework radius
- uses semantic `Normal / Shootable` controls for Hax time effects instead of exposing radius sign behavior directly
- uses semantic `Sphere / Light Shaft` controls for Hax light-shaft-capable effects instead of exposing radius sign behavior directly
- uses a grouped `Impulse / Stall / Kill Momentum` selector for Hax bounce effects, showing manual power and direction only for `Impulse`
- uses a structured Hax `Effects` action palette in the inspector instead of a flat add-button list
- supports keyboard shortcuts:
  - `Delete` / `Backspace`: remove the selected removable node or confirmed removable multi-selection
  - `Escape`: clear canvas selection
  - `Ctrl` / `Cmd` + `K`: open the command palette
  - `Ctrl+Z`: undo
  - `Ctrl+Shift+Z` / `Ctrl+Y`: redo
  - `Ctrl+A`: select all rendered nodes when the canvas viewport is focused
  - `F`: fit graph when the canvas viewport is focused
- `Fit graph` centers the visible node bounds inside the current scoped viewport instead of resetting to a raw default view
- includes a command palette for navigation and global workspace commands:
  - is owned at the workspace shell level so it works across navigator, scoped canvas, and inspector interactions
  - searches the document index, including hidden-scope descendants, without depending on canvas geometry
  - treats node-type queries such as `level`, `checkpoint`, `bot`, and `touch` as type intent instead of broad substring matches
  - uses location context like `level 2 checkpoint 4` to narrow deeper node queries without making descendants match broad ancestor-only searches
  - updates workspace scope before revealing and centering the chosen node in the scoped canvas
  - runs non-structural workspace commands such as theme switching, session save/open/recovery, Source/Output opening, explicit Hax/Momentum example loading, copy output, fit graph, and shortcut help
  - keeps keyboard-driven highlight stable until the pointer moves again inside the palette
- uses grouped command-dock controls for theme, session actions, history actions, and Source/Output toggles while keeping `New Map` separate
- supports `New Map` draft authoring directly from the command dock, with explicit `Project Momentum` vs `Hax Framework` format choice
- prompts before replacing a dirty session with a new map, session file, or source import
- uses restrained motion for disclosure, floating overlays, dialogs, popovers, toast, and inspector state changes while keeping canvas pan/zoom/drag and graph relayout immediate
- uses the right-click menu for structural editing:
  - `Add Level` from Spawn
  - add / move / delete for levels, with level insertion only exposed in document scope
  - add-below / delete for non-finish checkpoints, with checkpoint insertion only exposed in level scope
- exposes equivalent structural right-click actions for Hax levels and checkpoints
- scopes Hax `Add <effect type>` actions to the `Effects` wrapper node and `Add Mission` to the `Missions` wrapper node
- shows a minimal placeholder inspector for Hax level nodes until parsed level names and colors become editable
- allows empty draft maps and empty levels to remain editable on the canvas
- allows empty Hax documents (`spawn` with no checkpoints) to remain editable on the canvas
- blocks Output while a draft is structurally incomplete or has unfinished position vectors
- uses a floating interactive-guide panel with three compact workflow guides instead of a long read-only tour:
  - `Navigation and Scope`
  - `Momentum Workflow`
  - `Hax Workflow and Conversion`
- applies guide step setup only once when a step opens so drill-in, breadcrumbs, and overlays do not snap the user back mid-task
- auto-advances guide steps after a short success delay instead of requiring a manual `Next` click
- teaches the real editor interactions explicitly:
  - double-click for level/checkpoint drill-in
  - right-click for level, checkpoint, and wrapper actions
  - breadcrumbs for scope return
  - `?`, command palette, and `Fit Graph` for navigation helpers
- places the guide panel near the active target when possible and falls back away from overlays, toasts, and viewport edges
- spotlights concrete controls and the selected canvas node instead of broad panels when a step is about a specific action
- accepts both Hax and Project Momentum Workshop source through the Source overlay
- renders output back to the current active source format
- exposes `Convert to Momentum` from Hax sessions as an explicit destructive action
- the Source overlay prioritizes immediate load actions (`Load from Clipboard`, `Load Hax Example`, `Load Momentum Example`) and keeps manual textarea import behind an explicit `Manual Text` toggle
- explicit Hax and Momentum example actions stay available across the welcome prompt, Source overlay, and command palette
- Firefox may show a native paste-permission prompt before clipboard import succeeds; manual text remains the fallback
- the Output overlay uses a compact preview pane instead of a full-height editing textarea
- Source and Output overlays anchor below the dock's Source/Output command group
- Source and Output overlays dismiss when the user clicks an empty canvas background

## Current UX Conventions

- No decorative or non-functional controls
- Lucide is the shared icon system for buttons and inline editor actions
- Nullable numeric PM fields must expose an explicit reset control
- PM checkpoint inspectors expose both checkpoint position and checkpoint radius, including finish checkpoints
- The graph starts from deterministic defaults, then becomes freeform draggable in-session
- Child node creation is finalized by deterministic swimlane placement; ad-hoc spawn heuristics are non-authoritative
- Transient canvas interaction state (hover, marquee, drag preview) must not be written into durable workspace layout until commit
- Hax conversion warnings are shown as import notes and use past-tense phrasing
- Incomplete scratch drafts are valid editor states, but not valid render states
- Draft-authored blank positions are valid editor states, but not valid render or Hax-conversion states
- Newly authored Momentum levels use deterministic placeholder names from a curated pool instead of raw `Level N` labels
- Session snapshots persist the full durable workspace state, excluding undo/redo history, transient toasts, and open overlay UI
- Session snapshots include read-note state so already reviewed import notes stay dismissed after reopen or recovery restore
- Autosave recovery uses browser-local storage and is offered explicitly on startup instead of restoring automatically
- Theme preference is browser-local UI state, follows system color preference until overridden, and is not persisted into session files
- Guide progress is browser-local UI state, is versioned separately from session snapshots, and does not travel with saved sessions
- Workspace success/info toasts auto-dismiss after a short delay; error toasts stay visible
- Motion is subtle and accessibility-aware: disclosure and floating surfaces may fade/slide, but canvas geometry changes should not animate
- The shell status cluster shows unread import notes only while unread notes remain
- The command dock should stay minimal and should not duplicate actions that already exist inside overlays
- Structural edits stay in right-click menus and inline editors; the command palette is not a second structural-edit surface
- Breadcrumb scope changes may hide the current selection from the canvas, but they do not clear selection or inspector state
- The top-level scope is presented to users as `Spawn View`; the internal scope kind remains `document`
- Canvas behavior is format-parity: PM and Hax both use the same drag, scope-drill, context-menu, and bulk-delete interaction model, with format-specific document mutators behind the shared UI
- New PM impulse nodes default to the checkpoint position with `Up` direction and speed `10`
- New PM portal nodes default to `entry = checkpoint position` and `exit = next checkpoint position` when available
- Hax effect nodes use effect-type accents in both the scoped canvas and navigator to mirror Hax semantics instead of PM child categories
- Hax mission nodes use human-readable mission names and a segmented `Lock / Time` control in the shared inspector

## Styling Intent

- professional editor shell
- flatter surfaces
- paired light/dark palette driven by shared semantic tokens
- smaller radii
- denser, more structured controls

## Responsiveness

- desktop-first
- hierarchy-first navigator + scoped canvas layout remains primary on larger screens
- overlay controls should stay compact and non-obstructive
- responsive fallback may tighten overlays, but the desktop navigator + scoped canvas layout is the main target

## Things to Avoid Reintroducing

- unused chrome (for example, controls that do nothing)
- decorative-only panels
- hand-drawn icon styles that do not match Lucide
- warning text that repeats context already visible in the current selected node
- reintroducing badge strips for feature counts
- reintroducing the full-document child sprawl as the default canvas view
- reintroducing grouping or compact-subtree controls into the scoped canvas workflow
- navigator-only structural edit affordances that drift from the scoped canvas editing model
