# Domain Model

## Canonical Model

The workspace now edits a discriminated `WorkspaceDocument`.

- `MomentumDocument` owns `MomentumMapModel`
- `HaxDocument` owns the first-class Hax checkpoint model

## Types

### `MomentumMapModel`

- File: `src/domain/model/types.ts`
- Fields:
  - `start: Vec3`
  - `levels: LevelModel[]`

Represents the full editable Project Momentum map.

### `HaxDocument`

- File: `src/domain/import/hax/types.ts`
- Fields:
  - `spawn`
  - `checkpoints`

Represents a first-class editable Hax Framework document.

Each Hax checkpoint stores semantic fields rather than raw encoded arrays:

- `position`
- `radius`
- `prime`
- `isLevelStart`
- `missions`
- `abilityCount`
- `teleport`
- `timeTrialMinimum`
- `effects`
- `fakeUpper`

`viewAngle` is still preserved in the Hax checkpoint type for parse/render accuracy, but it is not part of the editable UI surface.
Hax effects remain stored on checkpoints in the canonical document, but the workspace presents them as child effect nodes with their own editors rather than checkpoint-panel sections.
The Hax spawn checkpoint also keeps canonical `effects`, and the workspace presents those through a UI-only `Effects` wrapper under `Spawn`.
Hax missions remain stored on checkpoints in the canonical document, but the workspace presents them as mission nodes under a UI-only `Missions` wrapper rather than checkpoint-panel sections.
The workspace also renders a UI-only `Effects` wrapper node so Hax effect and mission child trees stay parallel in the scoped canvas and navigator.
Derived Hax levels are contiguous checkpoint ranges whose first checkpoint has `isLevelStart = true`.

### `LevelModel`

- File: `src/domain/model/types.ts`
- Fields:
  - `name`
  - `color`
  - `checkpoints`
  - `checkpointConfigs`

Represents one Project Momentum level.

`checkpoints` is now a `CheckpointMarker[]`, not a raw `Vec3[]`.

### `CheckpointMarker`

- `position`
- `radius`

Stores the canonical Project Momentum checkpoint position draft plus its editable checkpoint radius.
This applies to both active checkpoints and finish checkpoints.
Checkpoint positions may be incomplete in-session while the user is drafting, but Output stays blocked until all required axes are filled.

### `CheckpointConfig`

- File: `src/domain/model/types.ts`
- Fields:
  - `liquid`
  - `timeLimit`
  - `minimumSpeed`
  - `heightGoal`
  - `disableAbilities`
  - `touchOrbs`
  - `abilityOrbs`
  - `lava`
  - `bot`
  - `impulses`
  - `portal`

Represents editable gameplay config for one active checkpoint slot.

## Ability Types

### `AbilityFlags`

Used for:

- checkpoint disabled abilities
- ability orb valid abilities

Order/meaning:

- `seismicSlam`
- `powerblock`
- `rocketPunch`

### `BotAbilityFlags`

Used only for bot valid abilities.

Order/meaning:

- `primaryFire`
- `seismicSlam`
- `rocketPunch`

This is intentionally different from `AbilityFlags`.

## Entity Types

### `TouchOrb`

- `position`
- `radius`

### `AbilityOrb`

- `position`
- `radius`
- `abilities`

### `LavaOrb`

- `position`
- `radius`

### `BotConfig`

- `position`
- `validAbilities`

### `ImpulseEffect`

- `position`
- `direction`
- `speed`

### `PortalPair`

- `entry`
- `exit`

On PM checkpoints and entities, authorable position fields use a nullable-axis draft vector shape so newly created items can start blank.
Non-position vectors such as PM `start`, impulse `direction`, Hax teleport destinations, and Hax bounce directions stay fully numeric.

## Hax Input Types

### `HaxSourceData`

Derived wire-format data used internally for Hax rendering and Hax -> PM conversion:

- `checkpointPositions`
- `checkpointPrimes`
- `checkpointEffects`

## UI Selection Type

### `EditorSelection`

- File: `src/features/workspace/types.ts`

Represents which editor target is active:

- start
- level
- checkpoint
- Hax effects wrapper
- Hax missions wrapper
- Hax mission
- touch orb
- ability orb
- lava orb
- bot
- impulse
- portal

This is the bridge between map interaction and inspector rendering.

## Child Groups

`ChildGroupState` is a format-aware editor-only union:

- PM orb groups keep `levelIndex`, `checkpointIndex`, `category`, and `orbIndexes`
- Hax effect groups use `format: 'hax'`, `levelIndex`, `checkpointIndex`, and grouped child `nodeIds`

These groups only affect canvas presentation. They never change canonical PM or Hax document semantics.

## Important Invariants

- `start` is always the Project Momentum spawn vector.
- `checkpointConfigs.length` must always equal `checkpoints.length - 1`.
- The final checkpoint in a level does not have gameplay config.
- Checkpoint radius is canonical level data and exists for finish checkpoints too.
- Draft-authored checkpoint/entity positions may be incomplete in-session, but render and Hax conversion stay blocked until those positions are complete.
- Nullable PM fields use `null`, never sentinel numbers.
- A checkpoint may have many touch/ability/lava orbs, but only one bot.
- A checkpoint may have many impulses and at most one portal pair.
- PM impulses and portal pairs align to active checkpoint slots only, never to finish checkpoints.
- Warnings are not part of the canonical model; they are session-only Hax conversion notes.
- Hax mission ordering, mission prime products, `Connections`, and `GoBackCP` are renderer/service responsibilities, not direct UI-authored raw state.
- Hax mission UI defaults to unused mission ids; duplicate mission ids are not offered through the editor because the Hax prime-product encoding cannot represent duplicates safely.
- The spawn marker prime is implicit for slot `0` and is not user-editable.
- Level entrance markers are represented as `isLevelStart` logic and are not user-editable prime switches.
- Only the Hax `Effect Lock` prime switch remains exposed in the editor; later Hax prime factors are treated as obsolete or preserved extras.
- Adding a Hax ability effect or shootable-orb effect auto-enables `Effect Lock` the first time one of those effect types is inserted on a checkpoint or spawn.
- Hax level structure is derived from checkpoint ordering plus `isLevelStart`; there is no separate stored level array in the Hax document.
- Editable Hax checkpoint/effect positions also use draft vectors, so new Hax checkpoints and effects can start blank while editing.
- Hax portal effect radius is fixed to `1.1` in canonical state and output; it is not editable in the UI.
- Hax time effects expose semantic `Normal` and `Shootable` modes in the editor; the backend still stores that mode through radius sign.
- Hax light-shaft-capable effects expose semantic `Sphere` and `Light Shaft` modes in the editor; the backend still stores that mode through radius sign.
- Hax bounce effects expose semantic `Impulse`, `Stall`, and `Kill Momentum` variants through the editor. `Stall` and `Kill Momentum` use framework-fixed direction data, and `Kill Momentum` always normalizes to a non-lightshaft radius.
- On Hax effect prime payloads, `No Ability Change` is mutually exclusive with explicit `Disable ...` ability switches; whichever one the user toggles last wins in the editor.
