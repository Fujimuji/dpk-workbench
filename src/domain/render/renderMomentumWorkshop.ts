import { requireCompleteDraftVec3 } from '@/domain/model/draftVectors';
import type { MomentumMapModel } from '@/domain/model/types';
import {
  escapeWorkshopString,
  formatNumber,
  LEVEL_EFFECTS_BLOCK,
  renderAbilityFlags,
  renderBotAbilityFlags,
  renderConfigSlots,
  renderVector,
  VARIABLE_BLOCK
} from '@/domain/render/sections';

function getVec3Key(vector: { x: number; y: number; z: number }): string {
  return `${vector.x}|${vector.y}|${vector.z}`;
}

function groupImpulsesByPosition(impulses: NonNullable<MomentumMapModel['levels'][number]['checkpointConfigs'][number]['impulses']>) {
  const groups: typeof impulses[] = [];

  impulses.forEach((impulse) => {
    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      getVec3Key(requireCompleteDraftVec3(lastGroup[0].position, 'Impulse position')) ===
        getVec3Key(requireCompleteDraftVec3(impulse.position, 'Impulse position'))
    ) {
      lastGroup.push(impulse);
      return;
    }

    groups.push([impulse]);
  });

  return groups;
}

export function renderMomentumWorkshop(model: MomentumMapModel): string {
  const lines: string[] = [VARIABLE_BLOCK, 'actions', '{'];

  lines.push(`\tGlobal.start = ${renderVector(model.start)};`);
  lines.push('');

  model.levels.forEach((level, levelIndex) => {
    const checkpoints = level.checkpoints.map((checkpoint) =>
      'position' in checkpoint ? checkpoint : { position: checkpoint, radius: 2 }
    );
    lines.push(
      `\tGlobal.c_levelData[${levelIndex}] = Array(Custom String("${escapeWorkshopString(level.name)}"), Color(${level.color}));`
    );
    lines.push(
      `\tGlobal.c_checkpointVectors[${levelIndex}] = Array(${checkpoints
        .map((checkpoint, checkpointIndex) =>
          renderVector(requireCompleteDraftVec3(checkpoint.position, `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} position`))
        )
        .join(', ')});`
    );
    lines.push(
      `\tGlobal.c_checkpointSizes[${levelIndex}] = Array(${checkpoints.map((checkpoint) => formatNumber(checkpoint.radius)).join(', ')});`
    );
    lines.push(
      `\tGlobal.c_checkpointsLiquid[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.liquid ? 'True' : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointTimeLimits[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.timeLimit !== null ? formatNumber(config.timeLimit) : null
      )};`
    );
    lines.push(
      `\tGlobal.c_heightGoals[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.heightGoal !== null ? formatNumber(config.heightGoal) : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointMinimumSpeeds[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.minimumSpeed !== null ? formatNumber(config.minimumSpeed) : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointDisableAbilities[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.disableAbilities ? renderAbilityFlags(config.disableAbilities) : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointTouchOrbLocations[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.touchOrbs
          ? `Array(${config.touchOrbs
              .map((orb, orbIndex) =>
                renderVector(
                  requireCompleteDraftVec3(orb.position, `Level ${levelIndex + 1} touch orb ${orbIndex + 1} position`)
                )
              )
              .join(', ')})`
          : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointTouchOrbSizes[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.touchOrbs ? `Array(${config.touchOrbs.map((orb) => formatNumber(orb.radius)).join(', ')})` : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointAbilityOrbLocations[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.abilityOrbs
          ? `Array(${config.abilityOrbs
              .map((orb, orbIndex) =>
                renderVector(
                  requireCompleteDraftVec3(orb.position, `Level ${levelIndex + 1} ability orb ${orbIndex + 1} position`)
                )
              )
              .join(', ')})`
          : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointAbilityOrbAbilities[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.abilityOrbs
          ? `Array(${config.abilityOrbs.map((orb) => renderAbilityFlags(orb.abilities)).join(', ')})`
          : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointAbilityOrbSizes[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.abilityOrbs ? `Array(${config.abilityOrbs.map((orb) => formatNumber(orb.radius)).join(', ')})` : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointLavaLocations[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.lava
          ? `Array(${config.lava
              .map((orb, orbIndex) =>
                renderVector(
                  requireCompleteDraftVec3(orb.position, `Level ${levelIndex + 1} lava orb ${orbIndex + 1} position`)
                )
              )
              .join(', ')})`
          : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointLavaSizes[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.lava ? `Array(${config.lava.map((orb) => formatNumber(orb.radius)).join(', ')})` : null
      )};`
    );
    lines.push(
      `\tGlobal.c_botLocation[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.bot ? renderVector(requireCompleteDraftVec3(config.bot.position, `Level ${levelIndex + 1} bot position`)) : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointBotValidAbilities[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.bot ? renderBotAbilityFlags(config.bot.validAbilities) : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointImpulseLocations[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.impulses
          ? `Array(${groupImpulsesByPosition(config.impulses)
              .map((group, groupIndex) =>
                renderVector(
                  requireCompleteDraftVec3(group[0].position, `Level ${levelIndex + 1} impulse group ${groupIndex + 1} position`)
                )
              )
              .join(', ')})`
          : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointImpulseDirections[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.impulses
          ? `Array(${groupImpulsesByPosition(config.impulses)
              .map((group) =>
                group.length === 1
                  ? renderVector(group[0].direction)
                  : `Array(${group.map((impulse) => renderVector(impulse.direction)).join(', ')})`
              )
              .join(', ')})`
          : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointImpulseSpeeds[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.impulses
          ? `Array(${groupImpulsesByPosition(config.impulses)
              .map((group) =>
                group.length === 1
                  ? formatNumber(group[0].speed)
                  : `Array(${group.map((impulse) => formatNumber(impulse.speed)).join(', ')})`
              )
              .join(', ')})`
          : null
      )};`
    );
    lines.push(
      `\tGlobal.c_checkpointPortals[${levelIndex}] = ${renderConfigSlots(level.checkpointConfigs, (config) =>
        config.portal
          ? `Array(${renderVector(requireCompleteDraftVec3(config.portal.entry, `Level ${levelIndex + 1} portal entry position`))}, ${renderVector(requireCompleteDraftVec3(config.portal.exit, `Level ${levelIndex + 1} portal exit position`))})`
          : null
      )};`
    );
    lines.push('');
  });

  lines.push(LEVEL_EFFECTS_BLOCK);
  lines.push('}');

  return lines.join('\n');
}
