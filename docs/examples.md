# Examples

## Source References

Use the bundled example constants in `src/app/examples.ts` as the canonical example inputs:

- `HAX_EXAMPLE_INPUT`
- `MOMENTUM_EXAMPLE_INPUT`

## Representative Scenarios

### Single-Level Import

Any Hax input without a prime-factor-13 level entrance marker becomes one Project Momentum level starting at checkpoint 1.

### Multi-Level Import

Any Hax input with multiple prime-factor-13 checkpoints becomes multiple levels, split at those entrances.

### Import With Warnings

Unsupported Hax effects, lightshaft-style negative radii, unsupported payload shapes, and extra shootable orbs generate Hax conversion notes.

### Bot Ability Mapping

Shootable orb payloads import into bot valid abilities in this order:

- `Primary Fire`
- `Seismic Slam`
- `Rocket Punch`

### Touch Orb Mapping

An ability effect whose payload includes factor `11` imports as a touch orb, not an ability orb.
