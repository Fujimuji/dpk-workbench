import type { MomentumMapModel } from '@/domain/model/types';

export type WarningTargetKind =
  | 'start'
  | 'level'
  | 'checkpoint'
  | 'touchOrb'
  | 'abilityOrb'
  | 'lavaOrb'
  | 'bot'
  | 'impulse'
  | 'portal';

export interface ConversionWarning {
  code:
    | 'missing_first_level_marker'
    | 'unsupported_effect_removed'
    | 'extra_bot_dropped'
    | 'lightshaft_lost'
    | 'invalid_checkpoint_shape'
    | 'length_mismatch'
    | 'unsupported_payload'
    | 'unsupported_bounce_variant';
  message: string;
  targetKind: WarningTargetKind;
  checkpointIndex?: number;
  checkpointNumber?: number;
  levelIndex?: number;
  orbIndex?: number;
  effectIndex?: number;
}

export interface ConversionResult {
  model: MomentumMapModel;
  outputText: string;
  warnings: ConversionWarning[];
}
