# ADR 0002: Canonical Editable PM Model

## Context

The app needs to import Hax data, allow edits, and render Project Momentum output repeatedly.

## Decision

Use `MomentumMapModel` with editable `checkpointConfigs` as the canonical in-memory model.

## Consequences

- Conversion writes into the same shape the editor mutates
- Rendering reads from the same shape the editor mutates
- The app avoids separate "import model" and "editor model" layers

## Revisit If

- Import-only metadata grows enough to require a separate staged domain model
