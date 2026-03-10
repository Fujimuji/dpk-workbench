import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  CircleDot,
  Crosshair,
  DoorOpen,
  FlagTriangleRight,
  Ghost,
  Hand,
  Orbit,
  Route,
  RotateCw,
  Shield,
  Skull,
  Sparkles,
  Timer,
  Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import {
  insertHaxCheckpointMission,
  updateHaxCheckpointAbilityCount,
  updateHaxCheckpointFakeUpper,
  updateHaxCheckpointMissionAt,
  updateHaxCheckpointPosition,
  updateHaxCheckpointPrimeSwitches,
  updateHaxCheckpointRadius,
  updateHaxCheckpointTeleport,
  updateHaxCheckpointTimeTrialMinimum,
  removeHaxCheckpointMissionAt,
  insertHaxCheckpointEffects
} from '@/domain/import/hax/mutators';
import {
  getMissionDisplayName,
  HAX_MISSION_ORDER
} from '@/domain/import/hax/missionRules';
import { getHaxAbsoluteCheckpointIndex } from '@/domain/import/hax/levelLayout';
import type { HaxDocument } from '@/domain/import/hax/types';
import {
  DraftPositionField,
  ToggleSwitch,
  VectorField
} from '@/features/workspace/canvas/CanvasFieldControls';
import {
  createHaxEffectsFromTemplate,
  type HaxEffectTemplateId
} from '@/features/workspace/hax/effectNodes';
import { HaxEffectNodeEditor } from '@/features/workspace/inspector/HaxEffectNodeEditor';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import { workspaceDisclosureVariants } from '@/features/workspace/motion/workspaceMotion';
import type { EditorSelection } from '@/features/workspace/types';

function getPrimeSwitchFields(fakeUpper: boolean): Array<{ key: keyof HaxDocument['spawn']['prime']; label: string }> {
  return [
    { key: 'rocketPunchDisabled', label: 'Disable Rocket Punch' },
    { key: 'powerblockDisabled', label: fakeUpper ? 'Disable Uppercut' : 'Disable Powerblock' },
    { key: 'seismicSlamDisabled', label: 'Disable Seismic Slam' },
    { key: 'centerlessCheckpoint', label: 'Centerless Checkpoint' },
    { key: 'effectLock', label: 'Effect Lock' }
  ];
}

const HAX_EFFECT_TEMPLATE_OPTIONS: Array<{
  accentTone:
    | 'ability'
    | 'haxTime'
    | 'haxDeath'
    | 'haxPermeation'
    | 'haxCheckpoint'
    | 'haxPortal'
    | 'haxBlackhole'
    | 'haxZipline'
    | 'haxShootableOrb'
    | 'haxBounce';
  icon: ReactNode;
  label: string;
  template: HaxEffectTemplateId;
}> = [
  { accentTone: 'haxTime', icon: <Timer className="button-icon" />, label: 'Time Effect', template: 'time' },
  { accentTone: 'haxDeath', icon: <Skull className="button-icon" />, label: 'Death Effect', template: 'death' },
  { accentTone: 'ability', icon: <Zap className="button-icon" />, label: 'Ability Effect', template: 'ability' },
  { accentTone: 'haxPermeation', icon: <Ghost className="button-icon" />, label: 'Permeation Effect', template: 'permeation' },
  { accentTone: 'haxCheckpoint', icon: <FlagTriangleRight className="button-icon" />, label: 'Checkpoint Effect', template: 'checkpoint' },
  { accentTone: 'haxPortal', icon: <DoorOpen className="button-icon" />, label: 'Portal', template: 'portal' },
  { accentTone: 'haxZipline', icon: <Route className="button-icon" />, label: 'Zipline', template: 'zipline' },
  { accentTone: 'haxBlackhole', icon: <Orbit className="button-icon" />, label: 'Blackhole', template: 'blackhole' },
  { accentTone: 'haxShootableOrb', icon: <Crosshair className="button-icon" />, label: 'Shootable Orb', template: 'shootableOrb' },
  { accentTone: 'haxBounce', icon: <Sparkles className="button-icon" />, label: 'Bounce Orb', template: 'bounce' }
];

const HAX_MISSION_TEMPLATE_OPTIONS = HAX_MISSION_ORDER.map((mission) => ({
  accentTone: 'haxCheckpoint' as const,
  icon: (
    {
      noRocketPunch: <Hand className="button-icon" />,
      noUppercut: <Shield className="button-icon" />,
      noSeismicSlam: <ArrowDown className="button-icon" />,
      stallless: <CircleDot className="button-icon" />,
      headbounce: <Crosshair className="button-icon" />,
      spin360: <RotateCw className="button-icon" />,
      useRocketPunchFirst: <ArrowRight className="button-icon" />,
      useUppercutFirst: <ArrowUp className="button-icon" />,
      useSeismicSlamFirst: <ArrowDown className="button-icon" />,
      diagonalRocketPunch: <ArrowUpRight className="button-icon" />,
      downDiagonalRocketPunch: <ArrowDownRight className="button-icon" />,
      rocketPunchBounce: <Sparkles className="button-icon" />
    }[mission.id]
  ),
  missionId: mission.id,
  label: mission.label
}));

interface HaxNodeEditorMainTabProps {
  document: HaxDocument;
  node: WorkspaceNodeSummary;
  onDocumentChange: (document: HaxDocument) => void;
  onSelectNodeBySelection: (selection: EditorSelection) => void;
}

type HaxCheckpointSectionKey = 'geometry' | 'prime' | 'abilityCounts' | 'teleport' | 'timeTrial';

interface HaxCheckpointSectionProps {
  children: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  title: string;
}

function HaxCheckpointSection({
  children,
  collapsed,
  onToggle,
  title
}: HaxCheckpointSectionProps) {
  return (
    <div className={`canvas-node-editor-section${collapsed ? ' is-collapsed' : ''}`}>
      <button
        aria-expanded={!collapsed}
        className="canvas-node-editor-section-toggle"
        onClick={onToggle}
        type="button"
      >
        <span className="canvas-node-editor-section-title">{title}</span>
        <ChevronDown className={`canvas-node-editor-section-toggle-icon${collapsed ? ' is-collapsed' : ''}`} size={16} />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            animate="expanded"
            className="canvas-node-field-group canvas-node-editor-section-body"
            exit="collapsed"
            initial="collapsed"
            style={{ overflow: 'hidden' }}
            variants={workspaceDisclosureVariants}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function resolveCheckpointContext(document: HaxDocument, node: WorkspaceNodeSummary) {
  if (
    node.kind === 'start' ||
    node.selection.kind === 'haxSpawnEffects' ||
    node.selection.kind === 'haxSpawnEffect' ||
    node.selection.kind === 'haxSpawnPortalPair' ||
    node.selection.kind === 'haxSpawnZiplinePair'
  ) {
    return {
      absoluteCheckpointIndex: 0,
      checkpoint: document.spawn
    };
  }

  if (node.levelIndex === undefined || node.checkpointIndex === undefined) {
    return null;
  }

  const absoluteCheckpointIndex = getHaxAbsoluteCheckpointIndex(document, node.levelIndex, node.checkpointIndex);
  if (absoluteCheckpointIndex === null) {
    return null;
  }

  return {
    absoluteCheckpointIndex,
    checkpoint: document.checkpoints[absoluteCheckpointIndex - 1] ?? null
  };
}

export function HaxNodeEditorMainTab({
  document,
  node,
  onDocumentChange,
  onSelectNodeBySelection
}: HaxNodeEditorMainTabProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<HaxCheckpointSectionKey, boolean>>({
    geometry: false,
    prime: false,
    abilityCounts: false,
    teleport: false,
    timeTrial: false
  });

  if (node.kind === 'level') {
    return (
      <div className="canvas-node-editor-scroll">
        <div className="canvas-node-editor-section">
          <h3>Level</h3>
          <p className="workspace-overlay-copy">
            Hax levels are currently derived from level-start checkpoints.
          </p>
          <p className="workspace-overlay-copy">
            Editable level names and colors are not available yet.
          </p>
        </div>
      </div>
    );
  }

  if (node.kind === 'haxEffect' || node.kind === 'haxEffectPair') {
    return (
      <HaxEffectNodeEditor
        document={document}
        node={node}
        onDocumentChange={onDocumentChange}
        onSelectNodeBySelection={onSelectNodeBySelection}
      />
    );
  }

  const checkpointContext = resolveCheckpointContext(document, node);
  if (!checkpointContext?.checkpoint) {
    return null;
  }

  const { absoluteCheckpointIndex, checkpoint } = checkpointContext;

  function handleAddEffect(template: HaxEffectTemplateId): void {
    if (node.kind !== 'haxEffects') {
      return;
    }

    const nextEffects = createHaxEffectsFromTemplate(template);
    const firstNewEffectIndex = checkpoint.effects.length;
    onDocumentChange(insertHaxCheckpointEffects(document, absoluteCheckpointIndex, nextEffects));

    if (nextEffects.length === 1) {
      onSelectNodeBySelection({
        ...(absoluteCheckpointIndex === 0
          ? { kind: 'haxSpawnEffect', effectIndex: firstNewEffectIndex }
          : {
              kind: 'haxEffect',
              levelIndex: node.levelIndex!,
              checkpointIndex: node.checkpointIndex!,
              effectIndex: firstNewEffectIndex
            }),
      });
      return;
    }

    if (absoluteCheckpointIndex === 0) {
      onSelectNodeBySelection({
        kind: template === 'portal' ? 'haxSpawnPortalPair' : 'haxSpawnZiplinePair',
        effectIndex: firstNewEffectIndex,
        pairEffectIndex: firstNewEffectIndex + 1
      });
      return;
    }

    onSelectNodeBySelection({
      kind: template === 'portal' ? 'haxPortalPair' : 'haxZiplinePair',
      levelIndex: node.levelIndex!,
      checkpointIndex: node.checkpointIndex!,
      effectIndex: firstNewEffectIndex,
      pairEffectIndex: firstNewEffectIndex + 1
    });
  }

  function handleAddMission(missionId: (typeof HAX_MISSION_ORDER)[number]['id']): void {
    if (node.levelIndex === undefined || node.checkpointIndex === undefined || absoluteCheckpointIndex === 0) {
      return;
    }

    if (checkpoint.missions.length >= 4 || checkpoint.missions.some((mission) => mission.id === missionId)) {
      return;
    }

    const nextMissionIndex = checkpoint.missions.length;
    onDocumentChange(
      insertHaxCheckpointMission(document, absoluteCheckpointIndex, {
        id: missionId,
        kind: 'lock',
        timeDelta: null
      })
    );
    onSelectNodeBySelection({
      kind: 'haxMission',
      levelIndex: node.levelIndex,
      checkpointIndex: node.checkpointIndex,
      missionIndex: nextMissionIndex
    });
  }

  if (node.kind === 'haxEffects') {
    return (
      <div className="canvas-node-editor-scroll">
        <div className="canvas-node-editor-section">
          <h3>Add Effect</h3>
          <div className="canvas-node-action-grid">
            {HAX_EFFECT_TEMPLATE_OPTIONS.map((option) => (
              <button
                className={`canvas-node-action-card is-accent-${option.accentTone}`}
                key={option.template}
                onClick={() => handleAddEffect(option.template)}
                type="button"
              >
                <span className="canvas-node-action-card-icon" aria-hidden="true">
                  {option.icon}
                </span>
                <span className="canvas-node-action-card-label">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (node.kind === 'haxMissions') {
    const usedMissionIds = new Set(checkpoint.missions.map((mission) => mission.id));
    const missionLimitReached = checkpoint.missions.length >= 4;

    return (
      <div className="canvas-node-editor-scroll">
        <div className="canvas-node-editor-section">
          <h3>Add Mission</h3>
          <div className="canvas-node-action-grid">
            {HAX_MISSION_TEMPLATE_OPTIONS.map((option) => (
              <button
                className={`canvas-node-action-card is-accent-${option.accentTone}`}
                disabled={missionLimitReached || usedMissionIds.has(option.missionId)}
                key={option.missionId}
                onClick={() => handleAddMission(option.missionId)}
                type="button"
              >
                <span className="canvas-node-action-card-icon" aria-hidden="true">
                  {option.icon}
                </span>
                <span className="canvas-node-action-card-label">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
        {checkpoint.missions.length > 0 ? (
          <div className="canvas-node-field-group">
            {checkpoint.missions.map((mission, missionIndex) => (
              <button
                className="button button-ghost button-mini"
                key={`${mission.id}-${missionIndex}`}
                onClick={() =>
                  onSelectNodeBySelection({
                    kind: 'haxMission',
                    levelIndex: node.levelIndex!,
                    checkpointIndex: node.checkpointIndex!,
                    missionIndex
                  })
                }
                type="button"
              >
                {getMissionDisplayName(mission.id)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (node.kind === 'haxMission') {
    const missionSelection = node.selection.kind === 'haxMission' ? node.selection : null;
    const mission = missionSelection ? checkpoint.missions[missionSelection.missionIndex] : null;
    if (!mission || !missionSelection || node.levelIndex === undefined || node.checkpointIndex === undefined || absoluteCheckpointIndex === 0) {
      return null;
    }

    const usedMissionIds = new Set(
      checkpoint.missions
        .map((entry, missionIndex) => (missionIndex === missionSelection.missionIndex ? null : entry.id))
        .filter((entry): entry is typeof mission.id => Boolean(entry))
    );

    return (
      <div className="canvas-node-editor-scroll">
        <label className="field-stack">
          <span>Mission</span>
          <select
            className="workspace-input"
            onChange={(event) =>
              onDocumentChange(
                updateHaxCheckpointMissionAt(document, absoluteCheckpointIndex, missionSelection.missionIndex, (entry) => ({
                  ...entry,
                  id: event.target.value as typeof entry.id
                }))
              )
            }
            value={mission.id}
          >
            {HAX_MISSION_ORDER.map((entry) => (
              <option disabled={usedMissionIds.has(entry.id)} key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field-stack">
          <span>Mission Type</span>
          <div className={`segmented-control ${mission.kind === 'time' ? 'is-time' : 'is-lock'}`}>
            <span aria-hidden="true" className="segmented-control-indicator" />
            <button
              className={`segmented-control-button${mission.kind === 'lock' ? ' is-active' : ''}`}
              onClick={() =>
                onDocumentChange(
                  updateHaxCheckpointMissionAt(document, absoluteCheckpointIndex, missionSelection.missionIndex, (entry) => ({
                    ...entry,
                    kind: 'lock',
                    timeDelta: null
                  }))
                )
              }
              type="button"
            >
              Lock
            </button>
            <button
              className={`segmented-control-button${mission.kind === 'time' ? ' is-active' : ''}`}
              onClick={() =>
                onDocumentChange(
                  updateHaxCheckpointMissionAt(document, absoluteCheckpointIndex, missionSelection.missionIndex, (entry) => ({
                    ...entry,
                    kind: 'time',
                    timeDelta: entry.timeDelta ?? 0
                  }))
                )
              }
              type="button"
            >
              Time
            </button>
          </div>
        </div>
        {mission.kind === 'time' ? (
          <label className="field-stack">
            <span>Time Delta</span>
            <input
              className="workspace-input"
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (Number.isNaN(nextValue)) {
                  return;
                }

                onDocumentChange(
                  updateHaxCheckpointMissionAt(document, absoluteCheckpointIndex, missionSelection.missionIndex, (entry) => ({
                    ...entry,
                    timeDelta: nextValue
                  }))
                );
              }}
              type="number"
              value={mission.timeDelta ?? 0}
            />
          </label>
        ) : null}
        <div className="canvas-node-editor-actions is-stretch">
          <button
            className="button button-ghost button-mini canvas-node-editor-danger-action"
            onClick={() => {
              onDocumentChange(removeHaxCheckpointMissionAt(document, absoluteCheckpointIndex, missionSelection.missionIndex));
              onSelectNodeBySelection({
                kind: 'haxMissions',
                levelIndex: node.levelIndex!,
                checkpointIndex: node.checkpointIndex!
              });
            }}
            type="button"
          >
            Remove Mission
          </button>
        </div>
      </div>
    );
  }

  if (node.kind !== 'start' && node.kind !== 'checkpoint') {
    return null;
  }

  const primeSwitchFields = getPrimeSwitchFields(checkpoint.fakeUpper);
  const toggleSection = (section: HaxCheckpointSectionKey) =>
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section]
    }));

  return (
    <div className="canvas-node-editor-scroll">
      <HaxCheckpointSection
        collapsed={collapsedSections.geometry}
        onToggle={() => toggleSection('geometry')}
        title={node.kind === 'start' ? 'Spawn' : 'Checkpoint'}
      >
        {node.kind === 'start' ? (
          <VectorField
            label="Spawn Vector"
            onChange={(position) => onDocumentChange(updateHaxCheckpointPosition(document, absoluteCheckpointIndex, position))}
            value={{
              x: checkpoint.position.x ?? 0,
              y: checkpoint.position.y ?? 0,
              z: checkpoint.position.z ?? 0
            }}
          />
        ) : (
          <DraftPositionField
            label="Checkpoint Vector"
            onChange={(position) => onDocumentChange(updateHaxCheckpointPosition(document, absoluteCheckpointIndex, position))}
            value={checkpoint.position}
          />
        )}
        <label className="field-stack">
          <span>Radius</span>
          <input
            className="workspace-input"
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (!Number.isNaN(nextValue)) {
                onDocumentChange(updateHaxCheckpointRadius(document, absoluteCheckpointIndex, nextValue));
              }
            }}
            type="number"
            value={checkpoint.radius}
          />
        </label>
      </HaxCheckpointSection>

      <HaxCheckpointSection
        collapsed={collapsedSections.prime}
        onToggle={() => toggleSection('prime')}
        title="Prime Switches"
      >
          <ToggleSwitch
            checked={checkpoint.fakeUpper}
            label="Fake Uppercut"
            onChange={(value) => onDocumentChange(updateHaxCheckpointFakeUpper(document, absoluteCheckpointIndex, value))}
          />
          {primeSwitchFields.map((field) => (
            <ToggleSwitch
              checked={Boolean(checkpoint.prime[field.key])}
              key={field.key}
              label={field.label}
              onChange={(value) =>
                onDocumentChange(
                  updateHaxCheckpointPrimeSwitches(document, absoluteCheckpointIndex, {
                    ...checkpoint.prime,
                    [field.key]: value
                  })
                )
              }
            />
          ))}
      </HaxCheckpointSection>

      <HaxCheckpointSection
        collapsed={collapsedSections.abilityCounts}
        onToggle={() => toggleSection('abilityCounts')}
        title="Ability Counts"
      >
          <ToggleSwitch
            checked={Boolean(checkpoint.abilityCount)}
            label="Enable Ability Counts"
            onChange={(value) =>
              onDocumentChange(
                updateHaxCheckpointAbilityCount(
                  document,
                  absoluteCheckpointIndex,
                  value ? checkpoint.abilityCount ?? { rocketPunch: 0, powerblock: 0, seismicSlam: 0 } : null
                )
              )
            }
          />
          {checkpoint.abilityCount ? (
            <div className="stack-grid">
              <label className="field-stack">
                <span>Rocket Punch</span>
                <input
                  className="workspace-input"
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (!Number.isNaN(nextValue)) {
                      onDocumentChange(
                        updateHaxCheckpointAbilityCount(document, absoluteCheckpointIndex, {
                          ...checkpoint.abilityCount!,
                          rocketPunch: nextValue
                        })
                      );
                    }
                  }}
                  type="number"
                  value={checkpoint.abilityCount.rocketPunch}
                />
              </label>
              <label className="field-stack">
                <span>{checkpoint.fakeUpper ? 'Uppercut' : 'Powerblock'}</span>
                <input
                  className="workspace-input"
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (!Number.isNaN(nextValue)) {
                      onDocumentChange(
                        updateHaxCheckpointAbilityCount(document, absoluteCheckpointIndex, {
                          ...checkpoint.abilityCount!,
                          powerblock: nextValue
                        })
                      );
                    }
                  }}
                  type="number"
                  value={checkpoint.abilityCount.powerblock}
                />
              </label>
              <label className="field-stack">
                <span>Seismic Slam</span>
                <input
                  className="workspace-input"
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (!Number.isNaN(nextValue)) {
                      onDocumentChange(
                        updateHaxCheckpointAbilityCount(document, absoluteCheckpointIndex, {
                          ...checkpoint.abilityCount!,
                          seismicSlam: nextValue
                        })
                      );
                    }
                  }}
                  type="number"
                  value={checkpoint.abilityCount.seismicSlam}
                />
              </label>
            </div>
          ) : null}
      </HaxCheckpointSection>

      <HaxCheckpointSection
        collapsed={collapsedSections.teleport}
        onToggle={() => toggleSection('teleport')}
        title="Teleport"
      >
          <ToggleSwitch
            checked={Boolean(checkpoint.teleport)}
            label="Enable Teleport"
            onChange={(value) =>
              onDocumentChange(
                updateHaxCheckpointTeleport(
                  document,
                  absoluteCheckpointIndex,
                  value
                    ? checkpoint.teleport ?? { destination: { x: 0, y: 0, z: 0 }, radius: 0 }
                    : null
                )
              )
            }
          />
          {checkpoint.teleport ? (
            <>
              <VectorField
                label="Teleport Destination"
                onChange={(destination) =>
                  onDocumentChange(
                    updateHaxCheckpointTeleport(document, absoluteCheckpointIndex, {
                      ...checkpoint.teleport!,
                      destination
                    })
                  )
                }
                value={checkpoint.teleport.destination}
              />
              <label className="field-stack">
                <span>Teleport Radius</span>
                <input
                  className="workspace-input"
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (!Number.isNaN(nextValue)) {
                      onDocumentChange(
                        updateHaxCheckpointTeleport(document, absoluteCheckpointIndex, {
                          ...checkpoint.teleport!,
                          radius: nextValue
                        })
                      );
                    }
                  }}
                  type="number"
                  value={checkpoint.teleport.radius}
                />
              </label>
            </>
          ) : null}
      </HaxCheckpointSection>

      <HaxCheckpointSection
        collapsed={collapsedSections.timeTrial}
        onToggle={() => toggleSection('timeTrial')}
        title="Time Trial"
      >
        <div className="canvas-node-field-row">
          <input
            className="workspace-input"
            min={0.25}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue === '') {
                onDocumentChange(updateHaxCheckpointTimeTrialMinimum(document, absoluteCheckpointIndex, null));
                return;
              }
              const parsed = Number(nextValue);
              if (!Number.isNaN(parsed)) {
                onDocumentChange(updateHaxCheckpointTimeTrialMinimum(document, absoluteCheckpointIndex, Math.max(0.25, parsed)));
              }
            }}
            type="number"
            value={checkpoint.timeTrialMinimum ?? ''}
          />
          <button
            className="button button-ghost button-mini field-reset-button"
            onClick={() => onDocumentChange(updateHaxCheckpointTimeTrialMinimum(document, absoluteCheckpointIndex, null))}
            type="button"
          >
            Reset
          </button>
        </div>
      </HaxCheckpointSection>
    </div>
  );
}
