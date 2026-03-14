import type {
  AbilityFlags,
  AbilityOrb,
  BotAbilityFlags,
  BotConfig,
  CheckpointMarker,
  CheckpointConfig,
  DraftVec3,
  ImpulseEffect,
  LavaOrb,
  LevelModel,
  MomentumMapModel,
  PortalPair,
  TouchOrb,
  Vec3
} from '@/domain/model/types';
import type { ConversionWarning, WarningTargetKind } from '@/domain/warnings/types';
import type {
  EditorLayoutState,
  EditorSelection,
  MultiNodeSelection
} from '@/features/workspace/types';
import { AppError } from '@/shared/errors/AppError';
import { WORKSHOP_COLORS } from '@/shared/workshop/colors';
import { isMissionId } from '@/domain/import/hax/missionRules';
import type {
  HaxAbilityCount,
  HaxCheckpoint,
  HaxDocument,
  HaxEffect,
  HaxPrimeSwitches,
  HaxTeleport,
  Vec3Payload
} from '@/domain/import/hax/types';
import type { WorkspaceDocument } from '@/domain/document/types';

export const WORKSPACE_SESSION_SNAPSHOT_SCHEMA_VERSION = 4;
const SUPPORTED_WORKSPACE_SESSION_SNAPSHOT_SCHEMA_VERSIONS = new Set([2, 3, WORKSPACE_SESSION_SNAPSHOT_SCHEMA_VERSION]);

export type WorkspaceSessionSnapshotSource = 'manual-save' | 'autosave';

export interface WorkspaceSessionSnapshotPayload {
  inputText: string;
  document: WorkspaceDocument | null;
  warnings: ConversionWarning[];
  readNoteNodeIds: string[];
  selection: EditorSelection | null;
  multiSelection: MultiNodeSelection;
  layout: EditorLayoutState;
}

export interface WorkspaceSessionSnapshot extends WorkspaceSessionSnapshotPayload {
  schemaVersion: number;
  savedAt: string;
  source: WorkspaceSessionSnapshotSource;
}

const WARNING_CODES = new Set([
  'missing_first_level_marker',
  'unsupported_effect_removed',
  'extra_bot_dropped',
  'lightshaft_lost',
  'invalid_checkpoint_shape',
  'length_mismatch',
  'unsupported_payload',
  'unsupported_bounce_variant'
]);

const WARNING_TARGET_KINDS = new Set<WarningTargetKind>([
  'start',
  'level',
  'checkpoint',
  'touchOrb',
  'abilityOrb',
  'lavaOrb',
  'bot',
  'impulse',
  'portal'
]);

const WORKSHOP_COLOR_SET = new Set(WORKSHOP_COLORS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullable<T>(value: unknown, guard: (candidate: unknown) => candidate is T): value is T | null {
  return value === null || guard(value);
}

function isOptionalNullable<T>(value: unknown, guard: (candidate: unknown) => candidate is T): boolean {
  return value === undefined || isNullable(value, guard);
}

function isArrayOf<T>(value: unknown, guard: (candidate: unknown) => candidate is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function isVec3(value: unknown): value is Vec3 {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.z)
  );
}

function isDraftVec3(value: unknown): value is DraftVec3 {
  return (
    isRecord(value) &&
    isNullable(value.x, isFiniteNumber) &&
    isNullable(value.y, isFiniteNumber) &&
    isNullable(value.z, isFiniteNumber)
  );
}

function isAbilityFlags(value: unknown): value is AbilityFlags {
  return (
    isRecord(value) &&
    isBoolean(value.seismicSlam) &&
    isBoolean(value.powerblock) &&
    isBoolean(value.rocketPunch)
  );
}

function isBotAbilityFlags(value: unknown): value is BotAbilityFlags {
  return (
    isRecord(value) &&
    isBoolean(value.primaryFire) &&
    isBoolean(value.seismicSlam) &&
    isBoolean(value.rocketPunch)
  );
}

function isTouchOrb(value: unknown): value is TouchOrb {
  return isRecord(value) && isDraftVec3(value.position) && isFiniteNumber(value.radius);
}

function isAbilityOrb(value: unknown): value is AbilityOrb {
  return isRecord(value) && isDraftVec3(value.position) && isFiniteNumber(value.radius) && isAbilityFlags(value.abilities);
}

function isLavaOrb(value: unknown): value is LavaOrb {
  return isRecord(value) && isDraftVec3(value.position) && isFiniteNumber(value.radius);
}

function isBotConfig(value: unknown): value is BotConfig {
  return isRecord(value) && isDraftVec3(value.position) && isBotAbilityFlags(value.validAbilities);
}

function isImpulseEffect(value: unknown): value is ImpulseEffect {
  return isRecord(value) && isDraftVec3(value.position) && isVec3(value.direction) && isFiniteNumber(value.speed);
}

function isPortalPair(value: unknown): value is PortalPair {
  return isRecord(value) && isDraftVec3(value.entry) && isDraftVec3(value.exit);
}

function isCheckpointMarker(value: unknown): value is CheckpointMarker {
  return isRecord(value) && isDraftVec3(value.position) && isFiniteNumber(value.radius);
}

function isCheckpointConfig(value: unknown): value is CheckpointConfig {
  return (
    isRecord(value) &&
    isBoolean(value.liquid) &&
    isNullable(value.timeLimit, isFiniteNumber) &&
    isNullable(value.minimumSpeed, isFiniteNumber) &&
    isNullable(value.heightGoal, isFiniteNumber) &&
    isNullable(value.disableAbilities, isAbilityFlags) &&
    isNullable(value.touchOrbs, (candidate): candidate is TouchOrb[] => isArrayOf(candidate, isTouchOrb)) &&
    isNullable(value.abilityOrbs, (candidate): candidate is AbilityOrb[] => isArrayOf(candidate, isAbilityOrb)) &&
    isNullable(value.lava, (candidate): candidate is LavaOrb[] => isArrayOf(candidate, isLavaOrb)) &&
    isNullable(value.bot, isBotConfig) &&
    isOptionalNullable(value.impulses, (candidate): candidate is ImpulseEffect[] => isArrayOf(candidate, isImpulseEffect)) &&
    isOptionalNullable(value.portal, isPortalPair) &&
    isOptionalNullable(value.portals, (candidate): candidate is PortalPair[] => isArrayOf(candidate, isPortalPair))
  );
}

function isLevelModel(value: unknown): value is LevelModel {
  return (
    isRecord(value) &&
    isString(value.name) &&
    isString(value.color) &&
    WORKSHOP_COLOR_SET.has(value.color as LevelModel['color']) &&
    Array.isArray(value.checkpoints) &&
    value.checkpoints.every((checkpoint) => isVec3(checkpoint) || isCheckpointMarker(checkpoint)) &&
    isArrayOf(value.checkpointConfigs, isCheckpointConfig) &&
    value.checkpointConfigs.length === Math.max(0, value.checkpoints.length - 1)
  );
}

function isMomentumMapModel(value: unknown): value is MomentumMapModel {
  return isRecord(value) && isVec3(value.start) && isArrayOf(value.levels, isLevelModel);
}

function isConversionWarning(value: unknown): value is ConversionWarning {
  return (
    isRecord(value) &&
    isString(value.code) &&
    WARNING_CODES.has(value.code) &&
    isString(value.message) &&
    isString(value.targetKind) &&
    WARNING_TARGET_KINDS.has(value.targetKind as WarningTargetKind) &&
    (value.levelIndex === undefined || isInteger(value.levelIndex)) &&
    (value.checkpointIndex === undefined || isInteger(value.checkpointIndex)) &&
    (value.checkpointNumber === undefined || isInteger(value.checkpointNumber)) &&
    (value.orbIndex === undefined || isInteger(value.orbIndex))
  );
}

function isEditorSelection(value: unknown): value is EditorSelection {
  if (!isRecord(value) || !isString(value.kind)) {
    return false;
  }

  switch (value.kind) {
    case 'start':
      return true;
    case 'level':
      return isInteger(value.levelIndex);
    case 'checkpoint':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex);
    case 'momentumEntities':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex);
    case 'haxSpawnEffects':
      return true;
    case 'haxEffects':
    case 'haxMissions':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex);
    case 'haxMission':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex) && isInteger(value.missionIndex);
    case 'touchOrb':
    case 'abilityOrb':
    case 'lavaOrb':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex) && isInteger(value.orbIndex);
    case 'bot':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex);
    case 'impulse':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex) && isInteger(value.impulseIndex);
    case 'portal':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex) && isInteger(value.portalIndex);
    case 'haxSpawnEffect':
      return isInteger(value.effectIndex);
    case 'haxEffect':
      return isInteger(value.levelIndex) && isInteger(value.checkpointIndex) && isInteger(value.effectIndex);
    case 'haxSpawnPortalPair':
    case 'haxSpawnZiplinePair':
      return isInteger(value.effectIndex) && isInteger(value.pairEffectIndex);
    case 'haxPortalPair':
    case 'haxZiplinePair':
      return (
        isInteger(value.levelIndex) &&
        isInteger(value.checkpointIndex) &&
        isInteger(value.effectIndex) &&
        isInteger(value.pairEffectIndex)
      );
    default:
      return false;
  }
}

function isEditorLayoutState(value: unknown): value is EditorLayoutState {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) => isRecord(entry) && isFiniteNumber(entry.yOffset)
    )
  );
}

function isVec3Payload(value: unknown): value is Vec3Payload {
  return isRecord(value) && isVec3(value.direction) && isFiniteNumber(value.power);
}

function isHaxEffect(value: unknown): value is HaxEffect {
  return (
    isRecord(value) &&
    isDraftVec3(value.position) &&
    isFiniteNumber(value.radius) &&
    isInteger(value.type) &&
    value.type >= 0 &&
    value.type <= 11 &&
    (isFiniteNumber(value.payload) || isVec3Payload(value.payload))
  );
}

function isHaxPrimeSwitches(value: unknown): value is HaxPrimeSwitches {
  return (
    isRecord(value) &&
    isBoolean(value.rocketPunchDisabled) &&
    isBoolean(value.powerblockDisabled) &&
    isBoolean(value.seismicSlamDisabled) &&
    isBoolean(value.centerlessCheckpoint) &&
    isBoolean(value.effectLock) &&
    isArrayOf(value.extraFactors, isInteger)
  );
}

function isHaxAbilityCount(value: unknown): value is HaxAbilityCount {
  return (
    isRecord(value) &&
    isFiniteNumber(value.rocketPunch) &&
    isFiniteNumber(value.powerblock) &&
    isFiniteNumber(value.seismicSlam)
  );
}

function isHaxTeleport(value: unknown): value is HaxTeleport {
  return isRecord(value) && isVec3(value.destination) && isFiniteNumber(value.radius);
}

function isHaxMission(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isMissionId(value.id) &&
    (value.kind === 'lock' || value.kind === 'time') &&
    isNullable(value.timeDelta, isFiniteNumber)
  );
}

function isHaxCheckpoint(value: unknown): value is HaxCheckpoint {
  return (
    isRecord(value) &&
    isDraftVec3(value.position) &&
    isFiniteNumber(value.radius) &&
    isFiniteNumber(value.viewAngle) &&
    isBoolean(value.isLevelStart) &&
    isHaxPrimeSwitches(value.prime) &&
    isArrayOf(value.missions, (candidate): candidate is HaxCheckpoint['missions'][number] => isHaxMission(candidate)) &&
    isNullable(value.abilityCount, isHaxAbilityCount) &&
    isNullable(value.teleport, isHaxTeleport) &&
    isNullable(value.timeTrialMinimum, isFiniteNumber) &&
    isArrayOf(value.effects, isHaxEffect) &&
    isBoolean(value.fakeUpper)
  );
}

function isHaxDocument(value: unknown): value is HaxDocument {
  return (
    isRecord(value) &&
    value.format === 'hax' &&
    isHaxCheckpoint(value.spawn) &&
    isArrayOf(value.checkpoints, isHaxCheckpoint)
  );
}

function isWorkspaceDocument(value: unknown): value is WorkspaceDocument {
  return (
    isRecord(value) &&
    ((value.format === 'momentum' && isMomentumMapModel(value.map)) || isHaxDocument(value))
  );
}

export function createWorkspaceSessionSnapshot(
  payload: WorkspaceSessionSnapshotPayload,
  source: WorkspaceSessionSnapshotSource
): WorkspaceSessionSnapshot {
  return {
    schemaVersion: WORKSPACE_SESSION_SNAPSHOT_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    source,
    ...payload
  };
}

export function serializeWorkspaceSessionSnapshot(snapshot: WorkspaceSessionSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function serializeWorkspaceSessionSnapshotPayload(payload: WorkspaceSessionSnapshotPayload): string {
  return JSON.stringify(payload);
}

export function hasMeaningfulWorkspaceSessionSnapshot(payload: WorkspaceSessionSnapshotPayload): boolean {
  return Boolean(payload.document || payload.inputText.trim() || payload.warnings.length > 0);
}

export function parseWorkspaceSessionSnapshot(input: string): WorkspaceSessionSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new AppError('invalid_session_snapshot', 'The session file could not be parsed.');
  }

  if (!isRecord(parsed)) {
    throw new AppError('invalid_session_snapshot', 'The session file does not contain a valid snapshot object.');
  }

  if (!isInteger(parsed.schemaVersion)) {
    throw new AppError('invalid_session_snapshot', 'The session file is missing a schema version.');
  }

  if (!SUPPORTED_WORKSPACE_SESSION_SNAPSHOT_SCHEMA_VERSIONS.has(parsed.schemaVersion)) {
    throw new AppError(
      'unsupported_session_snapshot_version',
      `Unsupported session file version ${parsed.schemaVersion}.`
    );
  }

  if (!isString(parsed.savedAt) || !isString(parsed.source)) {
    throw new AppError('invalid_session_snapshot', 'The session file metadata is incomplete.');
  }

  if (parsed.source !== 'manual-save' && parsed.source !== 'autosave') {
    throw new AppError('invalid_session_snapshot', 'The session file source is invalid.');
  }

  if (
    !isString(parsed.inputText) ||
    !isNullable(parsed.document, isWorkspaceDocument) ||
    !isArrayOf(parsed.warnings, isConversionWarning) ||
    !isArrayOf(parsed.readNoteNodeIds, isString) ||
    !isNullable(parsed.selection, isEditorSelection) ||
    !isArrayOf(parsed.multiSelection, isString) ||
    !isEditorLayoutState(parsed.layout)
  ) {
    throw new AppError('invalid_session_snapshot', 'The session file contents are invalid.');
  }

  return {
    schemaVersion: parsed.schemaVersion,
    savedAt: parsed.savedAt,
    source: parsed.source,
    inputText: parsed.inputText,
    document: parsed.document,
    warnings: parsed.warnings,
    readNoteNodeIds: parsed.readNoteNodeIds,
    selection: parsed.selection,
    multiSelection: parsed.multiSelection,
    layout: parsed.layout
  };
}
