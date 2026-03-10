# Glossary

## checkpoint

A checkpoint vector inside a level's `checkpoints` array.

## checkpoint config

A `CheckpointConfig` entry for one active checkpoint slot. This does not exist for the final checkpoint.

## finish checkpoint

The last checkpoint in a level. It has a vector but no gameplay config slot.

## level entrance

A Hax checkpoint marked with prime factor `13`, used to split levels during import.

## import note

A conversion warning produced during Hax -> PM import. These notes remain after editing and are not live validation.

## touch orb

A Project Momentum touch orb. In Hax import, this can come from an ability effect whose payload includes factor `11`.

## ability orb

A Project Momentum ability orb that carries available ability flags.

## lava orb

A Project Momentum lava entry. Hax death effects convert here.

## bot

A Project Momentum bot entry for one checkpoint slot. Only one bot is supported per slot.

## disabled abilities

Checkpoint-level lock flags stored in `disableAbilities`. These use `AbilityFlags`.

## valid abilities

Abilities available to ability orbs or bots. Ability orbs use `AbilityFlags`; bots use `BotAbilityFlags`.

## source data

Parsed Hax input, represented as `HaxSourceData`.

## rendered output

The Workshop text string produced from the current `MomentumMapModel` by `renderMomentumWorkshop()`.
