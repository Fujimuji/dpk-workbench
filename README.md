# DPK Workbench

Browser-based Doomfist Parkour workbench for importing, editing, converting, and exporting both Hax Framework and Project Momentum Workshop map data.

## What It Does

DPK Workbench is for map makers and players who want to work with Doomfist Parkour map data without digging through raw Workshop arrays by hand.

With it, you can:

- load Hax Framework or Project Momentum Workshop source
- inspect the map in a visual node-based workspace
- edit levels, checkpoints, entities, effects, and missions
- convert Hax maps into Project Momentum format
- export Workshop-ready output

## Main Features

- Clean bundled Hax and Momentum examples
- Visual map editing with scoped navigation
- Hax and Momentum support in the same tool
- Guided in-app onboarding for the editor workflow
- Draft validation before Output or conversion
- Copy-ready Workshop output

## Typical Workflow

1. Open a Hax or Momentum map, or load an example.
2. Navigate through Spawn View, levels, and checkpoints.
3. Edit checkpoints, entities, effects, or missions.
4. Open Output to copy Workshop data.
5. If you started with Hax, optionally convert it to Momentum first.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser.

## Build and Test

```bash
npm test
npm run build
```

## Reference Docs

These files document the Workshop rules and reference material the app is built around:

- `Hax Framework - Effects.md`
- `Hax Framework - Missions.md`
- `docs/hax-prime-switches.md`
- `docs/examples.md`
- `docs/workshop-colors.md`

## Dev Notes

If you are changing the app itself, start with `docs/index.md`.
