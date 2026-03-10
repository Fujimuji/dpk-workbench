# Parkour Data Converter

Browser-based Hax Framework and Project Momentum Workshop importer/editor. The app accepts either Hax or Project Momentum Workshop source, imports it into an editable Project Momentum map model, lets the user adjust the imported structure in a freeform canvas-based node workspace, and generates a ready-to-paste Workshop block.

## Current Features

- Import Hax or Project Momentum data from pasted Workshop source
- Convert Hax checkpoints/effects into an editable Project Momentum map model
- Edit the imported map through a draggable canvas-based node editor
- Generate Project Momentum Workshop output live
- Copy the current output from the Output overlay

## Tech Stack

- Vite
- React
- TypeScript
- Vitest
- `lucide-react`

## Local Commands

```bash
npm install
npm run dev
npm test
npm run build
```

## Start Here

- Read `docs/index.md` first for the current ownership map and change playbooks
- Read `AGENTS.md` for repo-specific rules

## Folder Map

- `src/app`: top-level orchestration and workspace session state
- `src/domain`: canonical model, import, and render layers
- `src/features/workspace`: workspace types, graph helpers, and new feature entrypoints
- `src/shared`: low-level reusable utilities
- `src/styles`: stylesheet entrypoint and split CSS files for the workspace shell, canvas, and node editor
- `src/test`: test suite

## Important Domain References

These reference docs are part of the project's domain truth and should be treated as input documentation, not incidental notes:

- `Hax Framework - Effects.md`
- `Hax Framework - Missions.md`
- `docs/hax-prime-switches.md`
- `docs/examples.md`
- `docs/workshop-colors.md`

## Deeper Docs

- Read `docs/index.md` for navigation
- Read `docs/conversion-rules.md` before changing converter logic
- Read `docs/rendering-rules.md` before changing Workshop output shape
- Read `docs/ui-workspace.md` before changing the canvas editor or shell interactions
