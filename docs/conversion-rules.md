# Conversion Rules

## Input Variables

The parser reads these Hax globals from Workshop source:

- `Global.CPposition`
- `Global.Prime`
- `Global.Effect`

`src/domain/import/hax/parseHaxWorkshop.ts` now converts Hax source into a first-class `HaxDocument`.

The Hax parser also reads the broader documented Hax globals:

- `Global.Radius_VA_GoBackCP`
- `Global.Connections`
- `Global.Mission`
- `Global.AbilityCount`
- `Global.HiddenCP_TpRad_TT`
- `Global.TP`
- `Global.FakeUpperCP`

The app can also import Project Momentum Workshop source directly through `src/domain/import/pm/parseMomentumWorkshop.ts`. PM import is a permissive subset importer:

- it reads only the PM variables the editor owns
- it ignores unrelated Workshop logic and comments
- it fills safe defaults for missing supported PM fields
- it does not generate import notes during PM import in the current implementation

## Level Inference

- `checkpointPositions[0]` becomes the Project Momentum spawn vector.
- Levels start at checkpoints after index `0`.
- Prime factor `13` marks a level entrance.
- If no level entrance is found, checkpoint `1` is treated as the start of Level 1.
- If later level entrances exist but checkpoint `1` is not marked, the converter inserts an implicit Level 1 start and emits a warning.

## Prime Factor Meanings

Used during Hax parsing and Hax -> PM conversion:

- `2`: Rocket Punch disabled
- `3`: Powerblock disabled
- `5`: Seismic Slam disabled
- `11`: special ability-effect branch for touch orb conversion
- `13`: level entrance marker

Other prime factors are ignored unless a specific effect mapping uses them.

## Supported Hax Effect Mappings

### `type 1` (`death effect`)

- Converts to Project Momentum lava
- Multiple death effects on the same checkpoint become multiple lava orbs
- Negative radius becomes positive and emits a `lightshaft_lost` warning

### `type 2` (`ability effect`)

- If payload has factor `11`: converts to touch orb
- Otherwise: converts to ability orb
- Ability orb payload uses inverted Hax disable logic because PM stores "ability available"
- Unsupported payload shape emits `unsupported_payload`

### `type 10` (`shootable orb effect`)

- Converts to a Project Momentum bot
- Only one bot is allowed per checkpoint slot
- Extra shootable orbs emit `extra_bot_dropped`
- Bot ability order is:
  - `Primary Fire`
  - `Seismic Slam`
  - `Rocket Punch`

### `type 5` + `type 6` (`portal entry` + `portal exit`)

- one portal entry/exit pair converts into the PM checkpoint `portal` value
- converted single portals no longer emit `unsupported_effect_removed`
- extra or unmatched portal endpoints still emit an unsupported checkpoint warning because PM supports only one portal pair per checkpoint

### `type 11` (`bounce effect`)

- only Hax `Impulse` bounces convert into PM `impulses`
- Hax bounce radius is not represented in PM and is dropped silently
- `Stall` and `Kill Momentum` variants stay unsupported and emit `unsupported_bounce_variant`
- unsupported numeric bounce payloads emit `unsupported_payload`

## Unsupported Effects

Unsupported Hax effects are removed and emit `unsupported_effect_removed`.

Important warning behavior:

- zipline start + zipline end collapse into one `zipline effect` warning per checkpoint
- unsupported bounce variants are not grouped into `unsupported_effect_removed`; they keep their own warning code so partial checkpoint conversion is clearer

## Warning Semantics

Warnings are import notes:

- they describe what happened during explicit Hax -> PM conversion
- they stay attached to the imported map after editing
- they are not automatically cleared by later manual edits
- they should target the most specific surviving editable element
  - `abilityOrb`, `touchOrb`, `lavaOrb`, or `bot` when a converted entity exists
  - otherwise the parent `checkpoint`, `level`, or `start`

Checkpoint warnings are phrased in past tense because they describe completed import actions.

## Hax Output Rules

- Hax documents render back through `src/domain/render/renderHaxWorkshop.ts`
- mission arrays are regenerated from semantic mission state
- mission slot order is sorted by mission prime ascending
- mission slot `0` is regenerated as the product of selected mission primes
- portal effect radii are normalized to the framework constant `1.1`
- bounce effects preserve their direction vector, while `Stall` and `Kill Momentum` map to their fixed framework power values on output
- `Connections`, `GoBackCP`, and obsolete hidden checkpoint state are regenerated or normalized during render

## PM Defaults Applied During Conversion

When a new editable PM model is created, these start as defaults:

- `liquid = false`
- `timeLimit = null`, unless the source Hax checkpoint has `timeTrialMinimum`, in which case that value becomes the PM time limit
- `minimumSpeed = null`
- `heightGoal = null`
- `impulses = null`
- `portal = null`
- checkpoint radius defaults to `2` for non-Hax sources and uses the Hax checkpoint radius when converting a first-class `HaxDocument`

The converter fills PM-specific defaults so the model is fully editable immediately after import.
