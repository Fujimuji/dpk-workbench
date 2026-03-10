import type {
  CheckpointConfig,
  CheckpointMarker,
  LevelModel,
  MomentumMapModel
} from '@/domain/model/types';
import { buildHaxSourceData } from '@/domain/import/hax/documentModel';
import type { ConvertOptions, HaxDocument, HaxSourceData } from '@/domain/import/hax/types';
import type { ConversionResult, ConversionWarning } from '@/domain/warnings/types';
import { convertCheckpointConfig } from '@/domain/import/hax/effectMappings';
import { hasFactor } from '@/domain/import/hax/primeRules';
import { pushWarning } from '@/domain/import/hax/warningRules';
import { renderMomentumWorkshop } from '@/domain/render/renderMomentumWorkshop';
import { getDefaultLevelColor, getDefaultLevelName } from '@/shared/workshop/colors';
import { ConversionError } from '@/shared/errors/AppError';

function getLevelStarts(source: HaxSourceData, warnings: ConversionWarning[]): number[] {
  const starts = source.checkpointPrimes
    .map((prime, checkpointIndex) => ({ prime, checkpointIndex }))
    .filter(({ checkpointIndex, prime }) => checkpointIndex > 0 && hasFactor(prime, 13))
    .map(({ checkpointIndex }) => checkpointIndex);

  if (starts.length === 0) {
    return [1];
  }

  if (starts[0] !== 1) {
    pushWarning(warnings, {
      code: 'missing_first_level_marker',
      message: 'No Level 1 entrance marker was found, so the converter treated checkpoint 1 as the start of Level 1.',
      targetKind: 'level',
      checkpointIndex: 1,
      checkpointNumber: 1,
      levelIndex: 0
    });
    starts.unshift(1);
  }

  return starts;
}

function buildLevels(
  source: HaxSourceData,
  document: HaxDocument | null,
  options: ConvertOptions,
  warnings: ConversionWarning[]
): LevelModel[] {
  const starts = getLevelStarts(source, warnings);

  return starts.map((startIndex, levelIndex) => {
    const nextStart = starts[levelIndex + 1] ?? source.checkpointPositions.length;
    const checkpoints: CheckpointMarker[] = source.checkpointPositions.slice(startIndex, nextStart).map((position, checkpointOffset) => {
      const sourceCheckpoint = document?.checkpoints[startIndex + checkpointOffset - 1] ?? null;
      return {
        position,
        radius: sourceCheckpoint?.radius ?? 2
      };
    });

    if (checkpoints.length < 2) {
      throw new ConversionError(
        'invalid_checkpoint_shape',
        `Level ${levelIndex + 1} resolves to fewer than two checkpoints and cannot be converted.`
      );
    }

    const checkpointConfigs: CheckpointConfig[] = [];

    for (let checkpointIndex = startIndex; checkpointIndex < nextStart - 1; checkpointIndex += 1) {
      const config = convertCheckpointConfig(source, levelIndex, checkpointIndex, checkpointIndex - startIndex + 1, warnings);
      const sourceCheckpoint = document?.checkpoints[checkpointIndex - 1] ?? null;
      checkpointConfigs.push({
        ...config,
        timeLimit: sourceCheckpoint?.timeTrialMinimum ?? config.timeLimit
      });
    }

    return {
      name: options.levelNames?.[levelIndex] ?? getDefaultLevelName(levelIndex),
      color: options.levelColors?.[levelIndex] ?? getDefaultLevelColor(levelIndex),
      checkpoints,
      checkpointConfigs
    };
  });
}

export function convertHaxToMomentum(source: HaxSourceData | HaxDocument, options: ConvertOptions = {}): ConversionResult {
  let haxDocument: HaxDocument | null = null;
  let normalizedSource: HaxSourceData;

  if ('format' in source) {
    haxDocument = source;
    normalizedSource = buildHaxSourceData(source);
  } else {
    normalizedSource = source;
  }

  const warnings: ConversionWarning[] = [];
  const model: MomentumMapModel = {
    start: normalizedSource.checkpointPositions[0],
    levels: buildLevels(normalizedSource, haxDocument, options, warnings)
  };

  return {
    model,
    outputText: renderMomentumWorkshop(model),
    warnings
  };
}
