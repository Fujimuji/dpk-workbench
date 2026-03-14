import { formatIncompleteDraftVec3Message, isCompleteDraftVec3 } from '@/domain/model/draftVectors';
import type { MomentumMapModel } from '@/domain/model/types';

export interface RenderReadiness {
  isRenderReady: boolean;
  blockingReasons: string[];
}

export function validateDraftMap(map: MomentumMapModel | null): RenderReadiness {
  if (!map) {
    return {
      isRenderReady: false,
      blockingReasons: []
    };
  }

  const blockingReasons: string[] = [];

  if (map.levels.length === 0) {
    blockingReasons.push('Add at least one level to generate output.');
  }

  map.levels.forEach((level, levelIndex) => {
    if (level.checkpoints.length === 0) {
      blockingReasons.push(`Level ${levelIndex + 1} needs at least one checkpoint before output is available.`);
    }

    if (level.checkpointConfigs.length !== Math.max(0, level.checkpoints.length - 1)) {
      blockingReasons.push(`Level ${levelIndex + 1} is missing a valid finish checkpoint layout.`);
    }

    level.checkpoints.forEach((checkpoint, checkpointIndex) => {
      if (!isCompleteDraftVec3(checkpoint.position)) {
        blockingReasons.push(
          formatIncompleteDraftVec3Message(`Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1}`, checkpoint.position)
        );
      }
    });

    level.checkpointConfigs.forEach((config, checkpointIndex) => {
      config.touchOrbs?.forEach((orb, orbIndex) => {
        if (!isCompleteDraftVec3(orb.position)) {
          blockingReasons.push(
            formatIncompleteDraftVec3Message(
              `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} Touch Orb ${orbIndex + 1}`,
              orb.position
            )
          );
        }
      });
      config.abilityOrbs?.forEach((orb, orbIndex) => {
        if (!isCompleteDraftVec3(orb.position)) {
          blockingReasons.push(
            formatIncompleteDraftVec3Message(
              `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} Ability Orb ${orbIndex + 1}`,
              orb.position
            )
          );
        }
      });
      config.lava?.forEach((orb, orbIndex) => {
        if (!isCompleteDraftVec3(orb.position)) {
          blockingReasons.push(
            formatIncompleteDraftVec3Message(
              `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} Lava Orb ${orbIndex + 1}`,
              orb.position
            )
          );
        }
      });
      if (config.bot && !isCompleteDraftVec3(config.bot.position)) {
        blockingReasons.push(
          formatIncompleteDraftVec3Message(`Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} Bot`, config.bot.position)
        );
      }
      config.impulses?.forEach((impulse, impulseIndex) => {
        if (!isCompleteDraftVec3(impulse.position)) {
          blockingReasons.push(
            formatIncompleteDraftVec3Message(
              `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} Impulse ${impulseIndex + 1}`,
              impulse.position
            )
          );
        }
      });
      if (config.portal && !isCompleteDraftVec3(config.portal.entry)) {
        blockingReasons.push(
          formatIncompleteDraftVec3Message(
            `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} Portal Entry`,
            config.portal.entry
          )
        );
      }
      if (config.portal && !isCompleteDraftVec3(config.portal.exit)) {
        blockingReasons.push(
          formatIncompleteDraftVec3Message(
            `Level ${levelIndex + 1} checkpoint ${checkpointIndex + 1} Portal Exit`,
            config.portal.exit
          )
        );
      }
    });
  });

  return {
    isRenderReady: blockingReasons.length === 0,
    blockingReasons
  };
}
