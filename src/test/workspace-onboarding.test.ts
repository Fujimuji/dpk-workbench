import { describe, expect, it } from 'vitest';
import { createEmptyDraftVec3 } from '../domain/model/draftVectors';
import { createEmptyMap } from '../domain/model/mutators';
import {
  WORKSPACE_ONBOARDING_STORAGE_KEY,
  captureWorkspaceGuideBaseline,
  createDefaultWorkspaceOnboardingState,
  createWorkspaceGuideRun,
  evaluateWorkspaceGuideStepCompletion,
  getWorkspaceGuide,
  getWorkspaceGuideActiveStep,
  getWorkspaceGuideIds,
  getWorkspaceGuideTargetSelector,
  readStoredWorkspaceOnboarding,
  resolveWorkspaceGuideFormat,
  shouldAutoOpenWorkspaceOnboarding,
  writeStoredWorkspaceOnboarding,
  type WorkspaceOnboardingState
} from '../features/workspace/onboarding/workspaceOnboarding';

function createStorage() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  };
}

describe('workspace onboarding helpers', () => {
  it('reads the default onboarding state when nothing is stored', () => {
    expect(readStoredWorkspaceOnboarding(createStorage())).toEqual(createDefaultWorkspaceOnboardingState());
  });

  it('persists guide completion state', () => {
    const storage = createStorage();
    const nextState: WorkspaceOnboardingState = {
      ...createDefaultWorkspaceOnboardingState(),
      completedGuideIds: ['core', 'momentum'],
      lastCompletedGuideId: 'momentum',
      welcomeDismissed: true
    };

    expect(writeStoredWorkspaceOnboarding(nextState, storage)).toBe(true);
    expect(readStoredWorkspaceOnboarding(storage)).toEqual(nextState);
  });

  it('ignores malformed or outdated onboarding payloads safely', () => {
    const storage = createStorage();
    storage.setItem(WORKSPACE_ONBOARDING_STORAGE_KEY, '{not-valid-json');
    expect(readStoredWorkspaceOnboarding(storage)).toEqual(createDefaultWorkspaceOnboardingState());

    storage.setItem(
      WORKSPACE_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ version: 3, welcomeDismissed: true })
    );
    expect(readStoredWorkspaceOnboarding(storage)).toEqual(createDefaultWorkspaceOnboardingState());
  });

  it('opens the welcome prompt only for first-run empty workspaces without recovery', () => {
    const onboarding = createDefaultWorkspaceOnboardingState();

    expect(
      shouldAutoOpenWorkspaceOnboarding({
        hasDocument: false,
        hasRecoverySnapshot: false,
        onboarding
      })
    ).toBe(true);
    expect(
      shouldAutoOpenWorkspaceOnboarding({
        hasDocument: true,
        hasRecoverySnapshot: false,
        onboarding
      })
    ).toBe(false);
    expect(
      shouldAutoOpenWorkspaceOnboarding({
        hasDocument: false,
        hasRecoverySnapshot: true,
        onboarding
      })
    ).toBe(false);
  });

  it('defines the interactive guides in the expected order', () => {
    expect(getWorkspaceGuideIds()).toEqual(['core', 'momentum', 'hax']);
    expect(getWorkspaceGuide('core').label).toBe('Navigation and Scope');
    expect(getWorkspaceGuide('hax').defaultFormat).toBe('hax');
  });

  it('uses concrete DOM guide targets', () => {
    const run = createWorkspaceGuideRun('core');
    const step = getWorkspaceGuideActiveStep(run);

    expect(step).not.toBeNull();
    expect(getWorkspaceGuideTargetSelector(step!.target)).toBe('[data-guide-target="navigator-node:level-0"]');
    expect(getWorkspaceGuideTargetSelector(getWorkspaceGuide('core').steps[5].target)).toBe(
      '[data-guide-target="canvas-help-button"]'
    );
  });

  it('resolves guide formats to explicit example formats', () => {
    expect(resolveWorkspaceGuideFormat('core', 'hax')).toBe('momentum');
    expect(resolveWorkspaceGuideFormat('momentum', 'hax')).toBe('momentum');
    expect(resolveWorkspaceGuideFormat('hax', 'momentum')).toBe('hax');
  });

  it('keeps guide copy explicit about double-click and right-click interactions', () => {
    expect(getWorkspaceGuide('core').steps.some((step) => /double-click/i.test(step.instruction))).toBe(true);
    expect(getWorkspaceGuide('momentum').steps.some((step) => /right-click/i.test(step.instruction))).toBe(true);
    expect(getWorkspaceGuide('hax').steps.some((step) => /right-click/i.test(step.instruction))).toBe(true);
    expect(getWorkspaceGuide('core').steps.some((step) => /spawn view/i.test(step.instruction))).toBe(true);
  });

  it('completes the momentum right-click step only after the level context menu opens', () => {
    const step = getWorkspaceGuide('momentum').steps[1];
    const baseline = captureWorkspaceGuideBaseline(null, { contextMenuOpenNonce: 4 });

    expect(
      evaluateWorkspaceGuideStepCompletion(
        step,
        {
          document: null,
          isCommandPaletteOpen: false,
          isShortcutHelpOpen: false,
          lastContextMenuNodeId: 'level-0',
          lastContextMenuOpenNonce: 5,
          lastFitGraphNonce: 0,
          openOverlayPanel: null,
          renderReadiness: { isRenderReady: false, blockingReasons: [] },
          selection: { kind: 'level', levelIndex: 0 },
          workspaceScope: { kind: 'level', levelIndex: 0 }
        },
        baseline
      )
    ).toBe(true);
  });

  it('completes the fit-graph step only after fit graph runs', () => {
    const step = getWorkspaceGuide('core').steps[6];
    const baseline = captureWorkspaceGuideBaseline(null, { fitGraphNonce: 2 });

    expect(
      evaluateWorkspaceGuideStepCompletion(
        step,
        {
          document: null,
          isCommandPaletteOpen: false,
          isShortcutHelpOpen: false,
          lastContextMenuNodeId: null,
          lastContextMenuOpenNonce: 0,
          lastFitGraphNonce: 3,
          openOverlayPanel: null,
          renderReadiness: { isRenderReady: false, blockingReasons: [] },
          selection: null,
          workspaceScope: { kind: 'document' }
        },
        baseline
      )
    ).toBe(true);
  });

  it('completes the momentum add-checkpoint step when the level checkpoint count increases', () => {
    const guide = getWorkspaceGuide('momentum');
    const step = guide.steps[2];
    const baselineDocument = {
      format: 'momentum' as const,
      map: {
        ...createEmptyMap(),
        levels: [
          {
            name: 'Warmup',
            color: 'Aqua' as const,
            checkpoints: [
              { position: { x: 0, y: 0, z: 0 }, radius: 2 },
              { position: { x: 10, y: 0, z: 0 }, radius: 2 }
            ],
            checkpointConfigs: [
              {
                liquid: false,
                timeLimit: null,
                minimumSpeed: null,
                heightGoal: null,
                disableAbilities: null,
                touchOrbs: null,
                abilityOrbs: null,
                lava: null,
                bot: null,
                impulses: null,
                portals: null
              }
            ]
          }
        ]
      }
    };
    const nextDocument = {
      ...baselineDocument,
      map: {
        ...baselineDocument.map,
        levels: [
          {
            ...baselineDocument.map.levels[0],
            checkpoints: [
              ...baselineDocument.map.levels[0].checkpoints,
              { position: createEmptyDraftVec3(), radius: 2 }
            ],
            checkpointConfigs: [
              ...baselineDocument.map.levels[0].checkpointConfigs,
              baselineDocument.map.levels[0].checkpointConfigs[0]
            ]
          }
        ]
      }
    };

    expect(
      evaluateWorkspaceGuideStepCompletion(
        step,
        {
          document: nextDocument,
          isCommandPaletteOpen: false,
          isShortcutHelpOpen: false,
          lastContextMenuNodeId: 'level-0',
          lastContextMenuOpenNonce: 0,
          lastFitGraphNonce: 0,
          openOverlayPanel: null,
          renderReadiness: { isRenderReady: false, blockingReasons: ['Level 1 checkpoint 3 needs X, Y, and Z coordinates.'] },
          selection: { kind: 'checkpoint', levelIndex: 0, checkpointIndex: 2 },
          workspaceScope: { kind: 'level', levelIndex: 0 }
        },
        captureWorkspaceGuideBaseline(baselineDocument)
      )
    ).toBe(true);
  });

  it('completes the hax conversion step after the document becomes momentum', () => {
    const step = getWorkspaceGuide('hax').steps[4];

    expect(
      evaluateWorkspaceGuideStepCompletion(
        step,
        {
          document: {
            format: 'momentum',
            map: createEmptyMap()
          },
          isCommandPaletteOpen: false,
          isShortcutHelpOpen: false,
          lastContextMenuNodeId: null,
          lastContextMenuOpenNonce: 0,
          lastFitGraphNonce: 0,
          openOverlayPanel: 'output',
          renderReadiness: { isRenderReady: true, blockingReasons: [] },
          selection: { kind: 'start' },
          workspaceScope: { kind: 'document' }
        },
        captureWorkspaceGuideBaseline(null)
      )
    ).toBe(true);
  });
});
