import type { CSSProperties } from 'react';
import {
  decodeHaxEffectPrimeState,
  encodeHaxEffectPrimeState,
  getHaxEffectPrimeFields,
  updateHaxEffectPrimeFlag
} from '@/domain/import/hax/effectPrimePayloads';
import {
  HAX_BOUNCE_DEFAULT_IMPULSE_POWER,
  HAX_BOUNCE_FIXED_DIRECTION,
  HAX_BOUNCE_KILL_MOMENTUM_POWER,
  HAX_BOUNCE_STALL_POWER,
  applyHaxRadiusMode,
  applyHaxTimeEffectMode,
  getHaxBounceVariant,
  getHaxRadiusMode,
  getHaxTimeEffectMode,
  supportsHaxLightShaftMode,
  type HaxRadiusMode,
  type HaxTimeEffectMode,
  type HaxBounceVariant
} from '@/domain/import/hax/effectRules';
import {
  removeHaxCheckpointEffectsAt,
  updateHaxCheckpointEffectAt
} from '@/domain/import/hax/mutators';
import type { HaxDocument, HaxEffect, Vec3Payload } from '@/domain/import/hax/types';
import { getHaxAbsoluteCheckpointIndex } from '@/domain/import/hax/levelLayout';
import {
  DraftPositionField,
  ToggleSwitch,
  VectorField
} from '@/features/workspace/canvas/CanvasFieldControls';
import {
  buildHaxCheckpointEffectEntries,
  buildHaxSpawnEffectEntries
} from '@/features/workspace/hax/effectNodes';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import type { EditorSelection } from '@/features/workspace/types';

function isVec3Payload(payload: number | Vec3Payload): payload is Vec3Payload {
  return typeof payload !== 'number';
}

function withCurrentRadiusSign(nextMagnitude: number, currentRadius: number): number {
  return currentRadius < 0 ? -Math.abs(nextMagnitude || 1) : Math.abs(nextMagnitude || 1);
}

function renderPrimeAttributeEditor(
  effect: HaxEffect,
  fakeUpper: boolean,
  onChange: (nextPayload: number) => void,
  resetLabel = 'Resets Cooldowns'
) {
  if (typeof effect.payload !== 'number') {
    return null;
  }

  const fields = getHaxEffectPrimeFields(effect.type);
  if (fields.length === 0) {
    return null;
  }

  const primeState = decodeHaxEffectPrimeState(effect.type, effect.payload);

  return (
    <div className="canvas-node-field-group">
      <strong>Prime Attributes</strong>
      {fields.map((field) => (
        <ToggleSwitch
          checked={primeState.flags[field.key]}
          key={field.key}
          label={field.key === 'powerblockDisabled' && fakeUpper ? 'Disable Uppercut' : field.label}
          onChange={(value) =>
            onChange(
              encodeHaxEffectPrimeState(effect.type, {
                ...primeState,
                flags: updateHaxEffectPrimeFlag(effect.type, primeState.flags, field.key, value)
              })
            )
          }
        />
      ))}
      <ToggleSwitch
        checked={primeState.resetCooldowns}
        label={resetLabel}
        onChange={(value) =>
          onChange(
            encodeHaxEffectPrimeState(effect.type, {
              ...primeState,
              resetCooldowns: value
            })
          )
        }
      />
    </div>
  );
}

function renderNumberInput(
  label: string,
  value: number,
  onChange: (value: number) => void
) {
  return (
    <label className="field-stack">
      <span>{label}</span>
      <input
        className="workspace-input"
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (!Number.isNaN(nextValue)) {
            onChange(nextValue);
          }
        }}
        type="number"
        value={value}
      />
    </label>
  );
}

function renderRadiusInput(
  label: string,
  radius: number,
  onChange: (nextRadius: number) => void
) {
  return renderNumberInput(label, Math.abs(radius), (nextValue) => onChange(withCurrentRadiusSign(nextValue, radius)));
}

function getBounceVariantIndex(variant: HaxBounceVariant): number {
  switch (variant) {
    case 'stall':
      return 1;
    case 'killMomentum':
      return 2;
    default:
      return 0;
  }
}

function getBinaryModeIndex(mode: HaxTimeEffectMode | HaxRadiusMode): number {
  return mode === 'normal' || mode === 'sphere' ? 0 : 1;
}

interface HaxEffectNodeEditorProps {
  document: HaxDocument;
  node: WorkspaceNodeSummary;
  onDocumentChange: (document: HaxDocument) => void;
  onSelectNodeBySelection: (selection: EditorSelection) => void;
}

export function HaxEffectNodeEditor({
  document,
  node,
  onDocumentChange,
  onSelectNodeBySelection
}: HaxEffectNodeEditorProps) {
  if (node.kind !== 'haxEffect' && node.kind !== 'haxEffectPair') {
    return null;
  }

  const effectContext =
    node.selection.kind === 'haxSpawnEffect' ||
    node.selection.kind === 'haxSpawnPortalPair' ||
    node.selection.kind === 'haxSpawnZiplinePair'
      ? {
          absoluteCheckpointIndex: 0,
          checkpoint: document.spawn,
          entries: buildHaxSpawnEffectEntries(document.spawn.effects),
          parentSelection: { kind: 'haxSpawnEffects' } as const
        }
      : node.levelIndex !== undefined && node.checkpointIndex !== undefined
        ? (() => {
            const absoluteCheckpointIndex = getHaxAbsoluteCheckpointIndex(document, node.levelIndex, node.checkpointIndex);
            if (absoluteCheckpointIndex === null) {
              return null;
            }

            const checkpoint = document.checkpoints[absoluteCheckpointIndex - 1];
            if (!checkpoint) {
              return null;
            }

            return {
              absoluteCheckpointIndex,
              checkpoint,
              entries: buildHaxCheckpointEffectEntries(node.levelIndex, node.checkpointIndex, checkpoint.effects),
              parentSelection: {
                kind: 'haxEffects',
                levelIndex: node.levelIndex,
                checkpointIndex: node.checkpointIndex
              } as const
            };
          })()
        : null;

  if (!effectContext) {
    return null;
  }

  const { absoluteCheckpointIndex, checkpoint, entries, parentSelection } = effectContext;

  const entry = entries.find((candidate) => candidate.id === node.id);

  if (!entry) {
    return null;
  }

  const updateEffect = (effectIndex: number, updater: (effect: HaxEffect) => HaxEffect) => {
    onDocumentChange(updateHaxCheckpointEffectAt(document, absoluteCheckpointIndex, effectIndex, updater));
  };

  const removeEffectNode = () => {
    onDocumentChange(removeHaxCheckpointEffectsAt(document, absoluteCheckpointIndex, entry.effectIndexes));
    onSelectNodeBySelection(parentSelection);
  };

  if (entry.selection.kind === 'haxPortalPair') {
    const [entryIndex, exitIndex] = entry.effectIndexes;
    const entryEffect = checkpoint.effects[entryIndex];
    const exitEffect = checkpoint.effects[exitIndex];
    if (!entryEffect || !exitEffect || typeof entryEffect.payload !== 'number' || typeof exitEffect.payload !== 'number') {
      return null;
    }

    return (
      <div className="canvas-node-editor-scroll">
        <div className="canvas-node-editor-section-grid is-two-column">
          <div className="canvas-node-editor-section is-portal-entry">
            <h3>Entry Portal</h3>
            <DraftPositionField
              label="Entry Position"
              onChange={(position) => updateEffect(entryIndex, (effect) => ({ ...effect, position }))}
              value={entryEffect.position}
            />
            {renderPrimeAttributeEditor(
              entryEffect,
              checkpoint.fakeUpper,
              (payload) => updateEffect(entryIndex, (effect) => ({ ...effect, payload })),
              'Resets Cooldowns'
            )}
          </div>
          <div className="canvas-node-editor-section is-portal-exit">
            <h3>Exit Portal</h3>
            <DraftPositionField
              label="Exit Position"
              onChange={(position) => updateEffect(exitIndex, (effect) => ({ ...effect, position }))}
              value={exitEffect.position}
            />
            {renderPrimeAttributeEditor(
              exitEffect,
              checkpoint.fakeUpper,
              (payload) => updateEffect(exitIndex, (effect) => ({ ...effect, payload })),
              'Resets Cooldowns'
            )}
          </div>
        </div>

        <button className="button button-ghost button-mini canvas-node-editor-danger-action" onClick={removeEffectNode} type="button">
          Remove Portal
        </button>
      </div>
    );
  }

  if (entry.selection.kind === 'haxZiplinePair') {
    const [startIndex, endIndex] = entry.effectIndexes;
    const startEffect = checkpoint.effects[startIndex];
    const endEffect = checkpoint.effects[endIndex];
    if (!startEffect || !endEffect) {
      return null;
    }

    return (
      <div className="canvas-node-editor-scroll">
        <div className="canvas-node-editor-section">
          <h3>Start Point</h3>
          <DraftPositionField
            label="Start Position"
            onChange={(position) => updateEffect(startIndex, (effect) => ({ ...effect, position }))}
            value={startEffect.position}
          />
        </div>
        <div className="canvas-node-editor-section">
          <h3>End Point</h3>
          <DraftPositionField
            label="End Position"
            onChange={(position) => updateEffect(endIndex, (effect) => ({ ...effect, position }))}
            value={endEffect.position}
          />
        </div>
        <button className="button button-ghost button-mini canvas-node-editor-danger-action" onClick={removeEffectNode} type="button">
          Remove Zipline
        </button>
      </div>
    );
  }

  const effect = checkpoint.effects[entry.effectIndexes[0]];
  if (!effect) {
    return null;
  }

  const bounceVariant =
    effect.type === 11 && isVec3Payload(effect.payload) ? getHaxBounceVariant(effect.payload) : null;
  const timeMode = effect.type === 0 ? getHaxTimeEffectMode(effect.radius) : null;
  const radiusMode = supportsHaxLightShaftMode(effect) ? getHaxRadiusMode(effect.radius) : null;
  const bounceVariantControlStyle =
    bounceVariant === null
      ? undefined
      : ({
          '--segmented-count': 3,
          '--segmented-index': getBounceVariantIndex(bounceVariant)
        } as CSSProperties);
  const timeModeControlStyle =
    timeMode === null
      ? undefined
      : ({
          '--segmented-count': 2,
          '--segmented-index': getBinaryModeIndex(timeMode)
        } as CSSProperties);
  const radiusModeControlStyle =
    radiusMode === null
      ? undefined
      : ({
          '--segmented-count': 2,
          '--segmented-index': getBinaryModeIndex(radiusMode)
        } as CSSProperties);

  return (
    <div className="canvas-node-editor-scroll">
      <DraftPositionField
        label="Effect Position"
        onChange={(position) => updateEffect(entry.effectIndexes[0], (current) => ({ ...current, position }))}
        value={effect.position}
      />
      {renderRadiusInput('Radius', effect.radius, (radius) =>
        updateEffect(entry.effectIndexes[0], (current) => ({ ...current, radius }))
      )}

      {effect.type === 0 ? (
        <>
          <div className="field-stack">
            <span>Type</span>
            <div className="segmented-control" style={timeModeControlStyle}>
              <span aria-hidden="true" className="segmented-control-indicator" />
              <button
                className={`segmented-control-button${timeMode === 'normal' ? ' is-active' : ''}`}
                onClick={() =>
                  updateEffect(entry.effectIndexes[0], (current) => ({
                    ...current,
                    radius: applyHaxTimeEffectMode(current.radius, 'normal')
                  }))
                }
                type="button"
              >
                Normal
              </button>
              <button
                className={`segmented-control-button${timeMode === 'shootable' ? ' is-active' : ''}`}
                onClick={() =>
                  updateEffect(entry.effectIndexes[0], (current) => ({
                    ...current,
                    radius: applyHaxTimeEffectMode(current.radius, 'shootable')
                  }))
                }
                type="button"
              >
                Shootable
              </button>
            </div>
          </div>
          {renderNumberInput('Time Delta', typeof effect.payload === 'number' ? effect.payload : 0, (payload) =>
            updateEffect(entry.effectIndexes[0], (current) =>
              typeof current.payload === 'number' ? { ...current, payload } : current
            )
          )}
        </>
      ) : null}

      {radiusMode !== null && bounceVariant !== 'killMomentum' ? (
        <div className="field-stack">
          <span>Type</span>
          <div className="segmented-control" style={radiusModeControlStyle}>
            <span aria-hidden="true" className="segmented-control-indicator" />
            <button
              className={`segmented-control-button${radiusMode === 'sphere' ? ' is-active' : ''}`}
              onClick={() =>
                updateEffect(entry.effectIndexes[0], (current) => ({
                  ...current,
                  radius: applyHaxRadiusMode(current.radius, 'sphere')
                }))
              }
              type="button"
            >
              Sphere
            </button>
            <button
              className={`segmented-control-button${radiusMode === 'lightShaft' ? ' is-active' : ''}`}
              onClick={() =>
                updateEffect(entry.effectIndexes[0], (current) => ({
                  ...current,
                  radius: applyHaxRadiusMode(current.radius, 'lightShaft')
                }))
              }
              type="button"
            >
              Light Shaft
            </button>
          </div>
        </div>
      ) : null}

      {(effect.type === 2 || effect.type === 3 || effect.type === 4 || effect.type === 5 || effect.type === 6 || effect.type === 10) &&
      typeof effect.payload === 'number'
        ? renderPrimeAttributeEditor(effect, checkpoint.fakeUpper, (payload) =>
            updateEffect(entry.effectIndexes[0], (current) =>
              typeof current.payload === 'number' ? { ...current, payload } : current
            )
          )
        : null}

      {effect.type === 11 && isVec3Payload(effect.payload) ? (
        <>
          <div className="field-stack">
            <span>Variant</span>
            <div className="segmented-control" style={bounceVariantControlStyle}>
              <span aria-hidden="true" className="segmented-control-indicator" />
              <button
                className={`segmented-control-button${bounceVariant === 'impulse' ? ' is-active' : ''}`}
                onClick={() =>
                  updateEffect(entry.effectIndexes[0], (current) =>
                    isVec3Payload(current.payload)
                      ? {
                          ...current,
                          payload: {
                            ...current.payload,
                            power: HAX_BOUNCE_DEFAULT_IMPULSE_POWER
                          }
                        }
                      : current
                  )
                }
                type="button"
              >
                Impulse
              </button>
              <button
                className={`segmented-control-button${bounceVariant === 'stall' ? ' is-active' : ''}`}
                onClick={() =>
                  updateEffect(entry.effectIndexes[0], (current) =>
                    isVec3Payload(current.payload)
                      ? {
                          ...current,
                          payload: {
                            ...current.payload,
                            direction: HAX_BOUNCE_FIXED_DIRECTION,
                            power: HAX_BOUNCE_STALL_POWER
                          }
                        }
                      : current
                  )
                }
                type="button"
              >
                Stall
              </button>
              <button
                className={`segmented-control-button${bounceVariant === 'killMomentum' ? ' is-active' : ''}`}
                onClick={() =>
                  updateEffect(entry.effectIndexes[0], (current) =>
                    isVec3Payload(current.payload)
                      ? {
                          ...current,
                          radius: Math.abs(current.radius) || 2,
                          payload: {
                            ...current.payload,
                            direction: HAX_BOUNCE_FIXED_DIRECTION,
                            power: HAX_BOUNCE_KILL_MOMENTUM_POWER
                          }
                        }
                      : current
                  )
                }
                type="button"
              >
                Kill Momentum
              </button>
            </div>
          </div>
          {bounceVariant === 'impulse'
            ? (
                <>
                  {renderNumberInput('Power', effect.payload.power, (power) =>
                    updateEffect(entry.effectIndexes[0], (current) =>
                      isVec3Payload(current.payload)
                        ? { ...current, payload: { ...current.payload, power } }
                        : current
                    )
                  )}
                  <div className="field-stack">
                    <span>Impulse Direction</span>
                    <VectorField
                      label="Impulse Direction"
                      onChange={(direction) =>
                        updateEffect(entry.effectIndexes[0], (current) =>
                          isVec3Payload(current.payload)
                            ? { ...current, payload: { ...current.payload, direction } }
                            : current
                        )
                      }
                      value={effect.payload.direction}
                    />
                  </div>
                </>
              )
            : null}
        </>
      ) : null}
      <button className="button button-ghost button-mini canvas-node-editor-danger-action" onClick={removeEffectNode} type="button">
        Remove Effect
      </button>
    </div>
  );
}
