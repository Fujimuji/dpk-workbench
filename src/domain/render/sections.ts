import type { AbilityFlags, BotAbilityFlags, CheckpointConfig, Vec3 } from '@/domain/model/types';

export const VARIABLE_BLOCK = `variables
{
\tglobal:
\t\t2: start
\t\t3: c_checkpointVectors
\t\t5: c_levelData
\t\t6: c_checkpointsLiquid
\t\t7: c_checkpointTimeLimits
\t\t8: c_checkpointHeightGoals
\t\t9: c_checkpointMinimumSpeeds
\t\t10: c_checkpointDisableAbilities
\t\t11: c_checkpointTouchOrbLocations
\t\t12: c_checkpointTouchOrbSizes
\t\t13: c_checkpointAbilityOrbLocations
\t\t14: c_checkpointAbilityOrbAbilities
\t\t15: c_checkpointAbilityOrbSizes
\t\t16: c_checkpointLavaLocations
\t\t17: c_checkpointLavaSizes
\t\t18: c_checkpointBotLocation
\t\t19: c_checkpointBotValidAbilities
\t\t20: ctrl
\t\t21: c_checkpointSizes
\t\t22: c_checkpointImpulseLocations
\t\t23: c_checkpointImpulseDirections
\t\t24: c_checkpointImpulseSpeeds
\t\t25: c_checkpointPortals

\tplayer:
\t\t5: isInLevel
}`;

export const LEVEL_EFFECTS_BLOCK = `\t"Level Effects"
\tCreate Effect(Local Player.isInLevel ? Null : Local Player, Ring, Color(Gray), Global.start, 3, Visible To);
\tFor Global Variable(ctrl, 0, Count Of(Global.c_levelData), 1);
\t\tCreate Effect(Local Player.isInLevel ? Null : Local Player, Ring, Global.c_levelData[Global.ctrl][1], First Of(
\t\t\tGlobal.c_checkpointVectors[Global.ctrl]), 2, Visible To);
\t\tCreate In-World Text(Local Player.isInLevel ? Null : Local Player, Global.c_levelData[Global.ctrl][0], First Of(
\t\t\tGlobal.c_checkpointVectors[Global.ctrl]) + Up * 1.500, 1.200, Do Not Clip, Visible To, Global.c_levelData[Global.ctrl][1],
\t\t\tDefault Visibility);
\tEnd;`;

function boolText(value: boolean): string {
  return value ? 'True' : 'False';
}

export function renderAbilityFlags(flags: AbilityFlags): string {
  return `Array(${boolText(flags.seismicSlam)}, ${boolText(flags.powerblock)}, ${boolText(flags.rocketPunch)})`;
}

export function renderBotAbilityFlags(flags: BotAbilityFlags): string {
  return `Array(${boolText(flags.primaryFire)}, ${boolText(flags.seismicSlam)}, ${boolText(flags.rocketPunch)})`;
}

export function renderVector(vector: Vec3): string {
  return `Vector(${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)})`;
}

export function renderConfigSlots(
  configs: CheckpointConfig[],
  renderSlot: (config: CheckpointConfig) => string | null
): string {
  const rendered = configs.map(renderSlot);
  if (rendered.every((slot) => slot === null)) {
    return 'Null';
  }

  return `Array(${rendered.map((slot) => slot ?? 'Null').join(', ')})`;
}

export function escapeWorkshopString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return safe.toFixed(3).replace(/\.?0+$/, '');
}
