import type { HaxEffect } from '@/domain/import/hax/types';
import type { ConversionWarning } from '@/domain/warnings/types';

export function getEffectName(effectType: HaxEffect['type']): string {
  switch (effectType) {
    case 0:
      return 'time effect';
    case 1:
      return 'death effect';
    case 2:
      return 'ability effect';
    case 3:
      return 'permeation effect';
    case 4:
      return 'checkpoint effect';
    case 5:
    case 6:
      return 'portal effect';
    case 7:
      return 'blackhole effect';
    case 8:
    case 9:
      return 'zipline effect';
    case 10:
      return 'shootable orb effect';
    case 11:
      return 'bounce effect';
  }
}

export function getUnsupportedEffectWarningKey(effectType: HaxEffect['type']): string {
  switch (effectType) {
    case 5:
    case 6:
      return 'portal-effect';
    case 8:
    case 9:
      return 'zipline-effect';
    default:
      return `effect-${effectType}`;
  }
}

export function getUnsupportedEffectGroupName(effectType: HaxEffect['type']): string {
  switch (effectType) {
    case 0:
      return 'time';
    case 3:
      return 'permeation';
    case 4:
      return 'checkpoint';
    case 5:
    case 6:
      return 'portal';
    case 7:
      return 'blackhole';
    case 8:
    case 9:
      return 'zipline';
    case 11:
      return 'bounce';
    default:
      return getEffectName(effectType).replace(/ effect$/, '');
  }
}

export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function pushWarning(warnings: ConversionWarning[], warning: ConversionWarning): void {
  warnings.push(warning);
}

export function normalizeSupportedRadius(
  radius: number,
  warnings: ConversionWarning[],
  effect: HaxEffect,
  levelIndex: number,
  checkpointIndex: number,
  checkpointNumber: number,
  targetKind: ConversionWarning['targetKind'],
  orbIndex?: number
): number {
  if (radius < 0) {
    pushWarning(warnings, {
      code: 'lightshaft_lost',
      message: `An imported ${getEffectName(
        effect.type
      )} used a lightshaft-style radius, but Project Momentum only supports a sphere, so the lightshaft behavior was removed.`,
      targetKind,
      checkpointIndex,
      checkpointNumber,
      levelIndex,
      orbIndex
    });
  }

  return Math.abs(radius);
}
