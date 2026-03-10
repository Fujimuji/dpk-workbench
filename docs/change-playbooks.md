# Change Playbooks

## Conversion Change

1. Read `docs/conversion-rules.md`.
2. Check root reference files before changing semantics.
3. Start in `src/domain/import/hax/`.
4. Run `npm test` and `npm run build`.

## PM Import Change

1. Read `docs/domain-model.md`.
2. Start in `src/domain/import/pm/parseMomentumWorkshop.ts` and `src/domain/import/pm/readers/`.
3. Keep `null` vs array semantics unchanged.
4. Run `npm test` and `npm run build`.

## Renderer Change

1. Read `docs/rendering-rules.md`.
2. Start in `src/domain/render/`.
3. Preserve `Null` vs `Array(...)` behavior.
4. Run `npm test` and `npm run build`.

## Workspace Interaction Change

1. Read `docs/ui-workspace.md`.
2. Start in `src/features/workspace/canvas/MapCanvas.tsx`, then check `useCanvasInteractions.ts`, `useMapCanvasSelection.ts`, `useCanvasContextMenu.ts`, and `MapCanvasOverlay.tsx` for interaction behavior.
3. For scoped graph and layout behavior, inspect `src/features/workspace/graph/buildScopeGraph.ts`, `src/features/workspace/graph/buildLevelGraph.ts`, `src/features/workspace/graph/buildLevelGraph.shared.ts`, and `src/features/workspace/canvas/useCanvasViewport.ts`.
4. For navigator, scope, or reveal behavior, inspect `src/features/workspace/documentIndex.ts`, `src/features/workspace/workspaceScope.ts`, and `src/features/workspace/outline/buildOutlineTree.ts`.
5. For draft authoring or output gating, inspect `src/app/useWorkspaceSession.ts`, `src/domain/model/validateDraftMap.ts`, `src/domain/model/mutators/structure.ts`, and `src/features/workspace/structureRemap.ts`.
6. Preserve strict depth columns, `yOffset`-only drag persistence, scope-native canvas graphs, and desktop-first behavior.
7. Run `npm test` and `npm run build`.

## App State Change

1. Start in `src/app/useWorkspaceSession.ts`.
2. Keep import success and failure reset behavior aligned.
3. Verify copy and clipboard edge cases.
4. Run `npm test` and `npm run build`.

## Edit This When

- you need a quick implementation path for a common task
- file ownership is clear but the change sequence is not

## Files Owned

- `docs/change-playbooks.md`

## Tests That Must Stay Green

- `npm test`
- `npm run build`
