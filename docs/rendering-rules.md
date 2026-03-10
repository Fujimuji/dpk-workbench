# Rendering Rules

## Entry Point

`src/domain/render/renderMomentumWorkshop.ts` owns Workshop output generation.

Main function:

- `renderMomentumWorkshop(model: MomentumMapModel): string`

## Global Output Shape

The renderer always emits:

1. A full `variables` block
2. An `actions` block
3. The standard "Level Effects" footer

## Number Formatting

`formatNumber()` in `src/domain/render/sections.ts`:

- rounds to 3 decimals
- trims trailing zeroes
- avoids `-0`

## `Null` vs `Array(...)`

The renderer follows a strict rule:

- If an entire level does not use a feature, emit `Null` for that level variable.
- If any slot uses a feature, emit an array aligned to `checkpointConfigs`.
- Unused slots inside that array render as `Null`.

This rule is intentional and should not be simplified casually.

## Per-Level Slot Alignment

All per-checkpoint gameplay arrays except `c_checkpointSizes` are aligned to `checkpointConfigs`, not to all checkpoints.

That means:

- only active checkpoint slots are represented
- finish checkpoints do not get gameplay config slots
- `c_checkpointSizes` stays aligned to all level checkpoints, including the finish checkpoint

## PM-Specific Field Rules

### `c_checkpointsLiquid`

- whole level `Null` if no slot is liquid
- otherwise per-slot values:
  - `True` when liquid
  - `Null` when not liquid

Never render `False` for non-liquid slots.

### `c_checkpointTimeLimits`
### `c_checkpointMinimumSpeeds`
### `c_checkpointHeightGoals`

- whole level `Null` if unused
- otherwise per-slot:
  - numeric value
  - `Null` when unset

## Nested Array Features

These features use nested arrays per slot:

- `c_checkpointTouchOrbLocations`
- `c_checkpointTouchOrbSizes`
- `c_checkpointAbilityOrbLocations`
- `c_checkpointAbilityOrbAbilities`
- `c_checkpointAbilityOrbSizes`
- `c_checkpointLavaLocations`
- `c_checkpointLavaSizes`
- `c_checkpointImpulseLocations`
- `c_checkpointImpulseDirections`
- `c_checkpointImpulseSpeeds`

If a slot has values, the slot itself renders as `Array(...)`.

Impulse direction and speed arrays may render either flat or grouped-by-position, depending on how many impulses share the same location in a checkpoint slot.

## Portal Rules

- `c_checkpointPortals` is aligned to `checkpointConfigs`
- each populated slot renders as `Array(Array(entry, exit), ...)`
- whole level `Null` if no checkpoint uses portals

## Checkpoint Size Rules

- `c_checkpointSizes` is aligned to all `checkpoints`
- older PM imports may omit it; the importer defaults missing sizes to `2`
- the renderer always emits it for canonical PM documents

## Bot Rules

Bots are single-value per checkpoint slot:

- `c_checkpointBotLocation`
- `c_checkpointBotValidAbilities`

There is no multi-bot rendering path.

Bot ability order is:

- `Primary Fire`
- `Seismic Slam`
- `Rocket Punch`

## Variable Ordering

The renderer currently emits these relevant globals:

- `start`
- `c_checkpointVectors`
- `c_levelData`
- `c_checkpointsLiquid`
- `c_checkpointTimeLimits`
- `c_checkpointHeightGoals`
- `c_checkpointMinimumSpeeds`
- `c_checkpointDisableAbilities`
- `c_checkpointTouchOrbLocations`
- `c_checkpointTouchOrbSizes`
- `c_checkpointAbilityOrbLocations`
- `c_checkpointAbilityOrbAbilities`
- `c_checkpointAbilityOrbSizes`
- `c_checkpointLavaLocations`
- `c_checkpointLavaSizes`
- `c_checkpointBotLocation`
- `c_checkpointBotValidAbilities`
- `c_checkpointSizes`
- `c_checkpointImpulseLocations`
- `c_checkpointImpulseDirections`
- `c_checkpointImpulseSpeeds`
- `c_checkpointPortals`

Do not reorder these casually; they are intentionally matched to the current Project Momentum example format.
