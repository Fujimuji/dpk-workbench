# ADR 0001: Single Workspace Shell

## Context

The project began as a step-based converter, but editing the converted map required moving back and forth between separate phases.

## Decision

Use a single full-screen workspace shell with:

- title bar
- split inspector + map
- bottom status bar

## Consequences

- Editing and conversion happen in one place
- The inspector and map stay visible together
- UI work should preserve the workspace model unless there is a strong reason to revert

## Revisit If

- The product adds fundamentally separate workflows that cannot fit one workbench
- Mobile-first usage becomes a priority
