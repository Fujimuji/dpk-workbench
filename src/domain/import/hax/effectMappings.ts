import type {
  CheckpointConfig,
  ImpulseEffect,
  LavaOrb
} from '@/domain/model/types';
import type { HaxSourceData } from '@/domain/import/hax/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import { getHaxBounceVariant } from '@/domain/import/hax/effectRules';
import { toBotValidAbilities, toDisabledAbilities, toValidAbilities, hasFactor } from '@/domain/import/hax/primeRules';
import {
  getUnsupportedEffectGroupName,
  getUnsupportedEffectWarningKey,
  joinWithAnd,
  normalizeSupportedRadius,
  pushWarning
} from '@/domain/import/hax/warningRules';

export function createEmptyCheckpointConfig(prime: number | null): CheckpointConfig {
  return {
    liquid: false,
    timeLimit: null,
    minimumSpeed: null,
    heightGoal: null,
    disableAbilities: toDisabledAbilities(prime),
    touchOrbs: null,
    abilityOrbs: null,
    lava: null,
    bot: null,
    impulses: null,
    portal: null
  };
}

export function convertCheckpointConfig(
  source: HaxSourceData,
  levelIndex: number,
  checkpointIndex: number,
  checkpointNumber: number,
  warnings: ConversionWarning[]
): CheckpointConfig {
  const effects = source.checkpointEffects[checkpointIndex];
  const config = createEmptyCheckpointConfig(source.checkpointPrimes[checkpointIndex]);
  const touchOrbs: NonNullable<CheckpointConfig['touchOrbs']> = [];
  const abilityOrbs: NonNullable<CheckpointConfig['abilityOrbs']> = [];
  const lavaOrbs: LavaOrb[] = [];
  const impulses: ImpulseEffect[] = [];
  const portalEntries: typeof effects = [];
  const portalExits: typeof effects = [];
  const seenUnsupportedEffects = new Set<string>();
  const unsupportedEffectNames: string[] = [];
  let sawBot = false;

  effects.forEach((effect) => {
    switch (effect.type) {
      case 1: {
        const orbIndex = lavaOrbs.length;
        lavaOrbs.push({
          position: effect.position,
          radius: normalizeSupportedRadius(
            effect.radius,
            warnings,
            effect,
            levelIndex,
            checkpointIndex,
            checkpointNumber,
            'lavaOrb',
            orbIndex
          )
        });
        return;
      }
      case 2: {
        if (typeof effect.payload !== 'number') {
          pushWarning(warnings, {
            code: 'unsupported_payload',
            message: 'This checkpoint used an ability effect with unsupported data, so it was removed.',
            targetKind: 'checkpoint',
            checkpointIndex,
            checkpointNumber,
            levelIndex
          });
          return;
        }

        if (hasFactor(effect.payload, 11)) {
          const orbIndex = touchOrbs.length;
          touchOrbs.push({
            position: effect.position,
            radius: normalizeSupportedRadius(
              effect.radius,
              warnings,
              effect,
              levelIndex,
              checkpointIndex,
              checkpointNumber,
              'touchOrb',
              orbIndex
            )
          });
          return;
        }

        const orbIndex = abilityOrbs.length;
        abilityOrbs.push({
          position: effect.position,
          radius: normalizeSupportedRadius(
            effect.radius,
            warnings,
            effect,
            levelIndex,
            checkpointIndex,
            checkpointNumber,
            'abilityOrb',
            orbIndex
          ),
          abilities: toValidAbilities(Math.abs(effect.payload))
        });
        return;
      }
      case 10: {
        if (typeof effect.payload !== 'number') {
          pushWarning(warnings, {
            code: 'unsupported_payload',
            message: 'This checkpoint used a shootable orb effect with unsupported data, so it was removed.',
            targetKind: 'checkpoint',
            checkpointIndex,
            checkpointNumber,
            levelIndex
          });
          return;
        }

        if (sawBot) {
          pushWarning(warnings, {
            code: 'extra_bot_dropped',
            message:
              'This checkpoint had multiple shootable orb effects. Project Momentum only supports one bot here, so only the first one was kept.',
            targetKind: 'checkpoint',
            checkpointIndex,
            checkpointNumber,
            levelIndex
          });
          return;
        }

        sawBot = true;
        config.bot = {
          position: effect.position,
          validAbilities: toBotValidAbilities(Math.abs(effect.payload))
        };
        return;
      }
      case 5:
        portalEntries.push(effect);
        return;
      case 6:
        portalExits.push(effect);
        return;
      case 11: {
        if (typeof effect.payload === 'number') {
          pushWarning(warnings, {
            code: 'unsupported_payload',
            message: 'This checkpoint used a bounce effect with unsupported data, so it was removed.',
            targetKind: 'checkpoint',
            checkpointIndex,
            checkpointNumber,
            levelIndex
          });
          return;
        }

        if (getHaxBounceVariant(effect.payload) !== 'impulse') {
          pushWarning(warnings, {
            code: 'unsupported_bounce_variant',
            message:
              'This checkpoint had a Hax stall or kill-momentum bounce effect. Project Momentum only supports impulse bounces here, so it was removed.',
            targetKind: 'checkpoint',
            checkpointIndex,
            checkpointNumber,
            levelIndex
          });
          return;
        }

        impulses.push({
          position: effect.position,
          direction: effect.payload.direction,
          speed: effect.payload.power
        });
        return;
      }
      default: {
        const warningKey = getUnsupportedEffectWarningKey(effect.type);
        if (seenUnsupportedEffects.has(warningKey)) {
          return;
        }

        seenUnsupportedEffects.add(warningKey);
        unsupportedEffectNames.push(getUnsupportedEffectGroupName(effect.type));
      }
    }
  });

  const portalPairCount = Math.min(portalEntries.length, portalExits.length);
  if (portalPairCount > 0) {
    config.portal = {
      entry: portalEntries[0]!.position,
      exit: portalExits[0]!.position
    };
  }

  if ((portalEntries.length > 0 || portalExits.length > 0) && (portalEntries.length !== 1 || portalExits.length !== 1)) {
    unsupportedEffectNames.push('portal');
  }

  if (unsupportedEffectNames.length > 0) {
    const groupedNames = joinWithAnd(unsupportedEffectNames);
    const plural = unsupportedEffectNames.length > 1;
    pushWarning(warnings, {
      code: 'unsupported_effect_removed',
      message: `This checkpoint had ${groupedNames} effect(s), which ${
        plural ? "aren't" : "isn't"
      } supported in Project Momentum and ${plural ? 'were' : 'was'} removed.`,
      targetKind: 'checkpoint',
      checkpointIndex,
      checkpointNumber,
      levelIndex
    });
  }

  config.touchOrbs = touchOrbs.length > 0 ? touchOrbs : null;
  config.abilityOrbs = abilityOrbs.length > 0 ? abilityOrbs : null;
  config.lava = lavaOrbs.length > 0 ? lavaOrbs : null;
  config.impulses = impulses.length > 0 ? impulses : null;
  return config;
}
