import type { LevelModel, MomentumMapModel } from '@/domain/model/types';
import { createDefaultCheckpointConfig, isVec3 } from '@/domain/import/pm/normalizers';
import { collectIndexedAssignments } from '@/domain/import/pm/readers/assignments';
import { readAbilityOrbs } from '@/domain/import/pm/readers/abilityOrbs';
import { readBots } from '@/domain/import/pm/readers/bots';
import {
  readDisableAbilities,
  readLiquidSlots,
  readNullableSlotNumbers
} from '@/domain/import/pm/readers/checkpointSettings';
import { readImpulses } from '@/domain/import/pm/readers/impulses';
import { readLavaOrbs } from '@/domain/import/pm/readers/lava';
import { buildLevelVectors, parseLevelDataAssignments } from '@/domain/import/pm/readers/levelData';
import { readPortals } from '@/domain/import/pm/readers/portals';
import { readTouchOrbs } from '@/domain/import/pm/readers/touchOrbs';
import { ParseError } from '@/shared/errors/AppError';
import { getDefaultLevelColor, getDefaultLevelName } from '@/shared/workshop/colors';
import { extractActionsBlock, extractAssignment, parseWorkshopValue } from '@/shared/workshop/workshopValues';

export function parseMomentumWorkshop(input: string): MomentumMapModel {
  const actionsBlock = extractActionsBlock(input);
  const start = parseWorkshopValue(extractAssignment(actionsBlock, 'Global.start'));
  if (!isVec3(start)) {
    throw new ParseError('invalid_syntax', 'Global.start must be a Vector value.');
  }

  const levelData = parseLevelDataAssignments(actionsBlock);
  const checkpointVectors = buildLevelVectors(
    collectIndexedAssignments(actionsBlock, 'Global.c_checkpointVectors'),
    collectIndexedAssignments(actionsBlock, 'Global.c_checkpointSizes')
  );
  const liquidAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointsLiquid');
  const timeLimitAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointTimeLimits');
  const heightGoalAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointHeightGoals');
  const minimumSpeedAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointMinimumSpeeds');
  const disableAbilityAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointDisableAbilities');
  const touchLocationAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointTouchOrbLocations');
  const touchSizeAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointTouchOrbSizes');
  const abilityLocationAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointAbilityOrbLocations');
  const abilityFlagAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointAbilityOrbAbilities');
  const abilitySizeAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointAbilityOrbSizes');
  const lavaLocationAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointLavaLocations');
  const lavaSizeAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointLavaSizes');
  const botLocationAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointBotLocation');
  const botAbilityAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointBotValidAbilities');
  const impulseLocationAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointImpulseLocations');
  const impulseDirectionAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointImpulseDirections');
  const impulseSpeedAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointImpulseSpeeds');
  const portalAssignments = collectIndexedAssignments(actionsBlock, 'Global.c_checkpointPortals');

  const levels: LevelModel[] = checkpointVectors.map(({ levelKey, checkpoints }, levelIndex) => {
    const defaults = levelData.get(levelKey);
    const checkpointConfigs = Array.from({ length: Math.max(0, checkpoints.length - 1) }, () =>
      createDefaultCheckpointConfig()
    );

    readLiquidSlots(liquidAssignments, levelKey, checkpointConfigs);
    readNullableSlotNumbers(timeLimitAssignments, levelKey, checkpointConfigs, 'timeLimit');
    readNullableSlotNumbers(heightGoalAssignments, levelKey, checkpointConfigs, 'heightGoal');
    readNullableSlotNumbers(minimumSpeedAssignments, levelKey, checkpointConfigs, 'minimumSpeed');
    readDisableAbilities(disableAbilityAssignments, levelKey, checkpointConfigs);
    readTouchOrbs(touchLocationAssignments, touchSizeAssignments, levelKey, checkpointConfigs);
    readAbilityOrbs(
      abilityLocationAssignments,
      abilityFlagAssignments,
      abilitySizeAssignments,
      levelKey,
      checkpointConfigs
    );
    readLavaOrbs(lavaLocationAssignments, lavaSizeAssignments, levelKey, checkpointConfigs);
    readBots(botLocationAssignments, botAbilityAssignments, levelKey, checkpointConfigs);
    readImpulses(
      impulseLocationAssignments,
      impulseDirectionAssignments,
      impulseSpeedAssignments,
      levelKey,
      checkpointConfigs
    );
    readPortals(portalAssignments, levelKey, checkpointConfigs);

    return {
      name: defaults?.name ?? getDefaultLevelName(levelIndex),
      color: defaults?.color ?? getDefaultLevelColor(levelIndex),
      checkpoints,
      checkpointConfigs
    };
  });

  return {
    start,
    levels
  };
}
