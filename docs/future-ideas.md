# Future Ideas

This file captures medium-term and long-term project direction that is useful context for maintainers and AI agents.

These are not committed implementation plans unless a section explicitly says so. Treat them as directional context, not current behavior.

## Why This Exists

- keep future-facing product and architecture ideas out of chat history
- give AI agents context before they propose large refactors
- reduce re-discussing known future directions

## Near-Term Direction

### Navigator Refinement

The hierarchy-first navigator + scoped canvas shell is now the primary direction.

Expected direction:

- keep refining navigator density, hierarchy readability, and scoped-canvas transitions
- avoid reintroducing a second full workspace mode unless the product direction changes again
- preserve shared document semantics and the docked inspector around the navigator + canvas workflow

### Hax Framework Support

The project is no longer only a Hax-to-Momentum converter.

Expected direction:

- continue treating Hax as a first-class editable document format
- keep Hax semantics explicit in the UI instead of exposing raw encoded Workshop mechanics
- prefer semantic controls over sentinel values, sign-based meaning, or encoded prime products

## Longer-Term Ideas

### Canvas Rendering Performance

The current graph is Canvas-based.

Possible future work:

- increase zoom headroom beyond the current canvas cap when large maps need closer inspection
- add level-of-detail rendering at high zoom or high node counts
- cull offscreen nodes and edges
- simplify shadows and other expensive visuals during interaction

Long-term exploratory option:

- move graph rendering from Canvas 2D to WebGL or similar if graph size or interaction complexity outgrows the current approach

This is not a committed rewrite today, but it is an explicitly recognized future option.

## Guidance For AI Agents

- do not treat these ideas as already approved implementation work
- do use them as context when proposing architecture changes
- avoid suggesting solutions that directly conflict with these directions unless there is a strong technical reason
