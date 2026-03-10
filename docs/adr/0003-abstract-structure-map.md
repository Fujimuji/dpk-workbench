# ADR 0003: Abstract Structure Map

## Context

The map needs to help users navigate levels and checkpoints, but the source data is not being edited as a geometric scene.

## Decision

Use an abstract left-to-right structure map instead of a geometric layout editor.

## Consequences

- The map is reliable and readable for navigation
- Editing stays in the inspector
- The UI avoids the complexity of a spatial editor

## Revisit If

- The product later requires true coordinate-based visual editing
