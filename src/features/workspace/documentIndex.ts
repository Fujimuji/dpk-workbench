import { getHaxLevelStartIndexes } from '@/domain/import/hax/levelLayout';
import type { WorkspaceDocument } from '@/domain/document/types';
import type { CheckpointConfig } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import {
  buildVisibleCheckpointChildren,
  getAbilityNamesSummary,
  getCheckpointRole,
  getEntityAccent,
  hasDirectSettings,
  truncateLabel
} from '@/features/workspace/graph/buildLevelGraph.shared';
import {
  BOT_ENTITY_CONFIG,
  ORB_ENTITY_CONFIG,
  ORB_ENTITY_CONFIG_BY_KIND
} from '@/features/workspace/graph/entityConfig';
import {
  getCheckpointNodeId,
  getMomentumEntitiesNodeId,
  getHaxEffectsNodeId,
  getHaxMissionNodeId,
  getHaxMissionsNodeId,
  getHaxSpawnEffectsNodeId
} from '@/features/workspace/graph/nodeIds';
import type { WorkspaceNodeSummary } from '@/features/workspace/graph/types';
import { getWarningsForNode } from '@/features/workspace/graph/warningIndex';
import {
  buildVisibleHaxCheckpointChildren,
  buildVisibleHaxSpawnChildren
} from '@/features/workspace/hax/effectNodes';
import {
  getDefaultLevelColor,
  getWorkshopColorCss
} from '@/shared/workshop/colors';
import { measureWithPerf } from '@/shared/devPerf';

export interface WorkspaceDocumentIndex {
  ancestorIdsById: Record<string, string[]>;
  childrenById: Record<string, string[]>;
  nodeById: Record<string, WorkspaceNodeSummary>;
  nodes: WorkspaceNodeSummary[];
  orderedIds: string[];
  warningsById: Record<string, ConversionWarning[]>;
}

export function buildWorkspaceDocumentNodeIdSet(document: WorkspaceDocument | null): Set<string> {
  const nodeIds = new Set<string>();
  if (!document) {
    return nodeIds;
  }

  nodeIds.add('root');

  if (document.format === 'momentum') {
    document.map.levels.forEach((level, levelIndex) => {
      nodeIds.add(`level-${levelIndex}`);

      level.checkpoints.forEach((_, checkpointIndex) => {
        const checkpointId = getCheckpointNodeId(levelIndex, checkpointIndex);
        nodeIds.add(checkpointId);

        const config = level.checkpointConfigs[checkpointIndex];
        if (!config) {
          return;
        }

        nodeIds.add(getMomentumEntitiesNodeId(levelIndex, checkpointIndex));
        buildVisibleCheckpointChildren(levelIndex, checkpointIndex, config).forEach((child) => {
          nodeIds.add(child.id);
        });
      });
    });

    return nodeIds;
  }

  buildVisibleHaxSpawnChildren(document.spawn.effects).forEach((wrapper) => {
    nodeIds.add(wrapper.id);
    wrapper.children.forEach((child) => nodeIds.add(child.id));
  });

  const levelStarts = getHaxLevelStartIndexes(document);
  levelStarts.forEach((startIndex, levelIndex) => {
    nodeIds.add(`level-${levelIndex}`);
    const nextStart = levelStarts[levelIndex + 1] ?? document.checkpoints.length;

    for (let checkpointAbsoluteIndex = startIndex; checkpointAbsoluteIndex < nextStart; checkpointAbsoluteIndex += 1) {
      const checkpointIndex = checkpointAbsoluteIndex - startIndex;
      nodeIds.add(getCheckpointNodeId(levelIndex, checkpointIndex));

      buildVisibleHaxCheckpointChildren(
        levelIndex,
        checkpointIndex,
        document.checkpoints[checkpointAbsoluteIndex].effects,
        document.checkpoints[checkpointAbsoluteIndex].missions
      ).forEach((wrapper) => {
        nodeIds.add(wrapper.id);
        wrapper.children.forEach((child) => nodeIds.add(child.id));
      });
    }
  });

  return nodeIds;
}

function buildNodeSummary(
  input: WorkspaceNodeSummary
): WorkspaceNodeSummary {
  return input;
}

function buildMomentumChildNode(
  wrapperId: string,
  levelIndex: number,
  checkpointIndex: number,
  checkpointNumber: number,
  config: CheckpointConfig,
  warnings: ConversionWarning[],
  nodes: WorkspaceNodeSummary[],
  warningsById: Record<string, ConversionWarning[]>
): void {
  const visibleChildren = buildVisibleCheckpointChildren(levelIndex, checkpointIndex, config);

  visibleChildren.forEach((entry) => {
    if (entry.kind === 'touchOrb' || entry.kind === 'abilityOrb' || entry.kind === 'lavaOrb') {
      const orbConfig = ORB_ENTITY_CONFIG_BY_KIND[entry.kind];
      const accent = getEntityAccent(entry.kind);
      const label = `${orbConfig.label} ${entry.orbIndex + 1}`;
      const sublabel =
        entry.kind === 'abilityOrb'
          ? getAbilityNamesSummary(config.abilityOrbs?.[entry.orbIndex]?.abilities ?? {
              powerblock: false,
              rocketPunch: false,
              seismicSlam: false
            }, 'player')
          : '';
      const childWarnings = getWarningsForNode(warnings, entry.kind, levelIndex, checkpointNumber, entry.orbIndex);

      nodes.push(buildNodeSummary({
        id: entry.id,
        kind: entry.kind,
        label,
        sublabel,
        selection: { kind: entry.kind, levelIndex, checkpointIndex, orbIndex: entry.orbIndex },
        levelIndex,
        checkpointIndex,
        checkpointNumber,
        orbIndex: entry.orbIndex,
        parentId: wrapperId,
        accentColor: accent.color,
        accentSoftColor: accent.softColor,
        noteMarker: childWarnings.length > 0,
        hasSettings: false
      }));
      warningsById[entry.id] = childWarnings;
      return;
    }

    if (entry.kind === 'impulse') {
      const accent = getEntityAccent('impulse');
      const impulseWarnings = getWarningsForNode(warnings, 'impulse', levelIndex, checkpointNumber, entry.impulseIndex);
      nodes.push(buildNodeSummary({
        id: entry.id,
        kind: 'impulse',
        label: `Impulse ${entry.impulseIndex + 1}`,
        sublabel: `Speed ${config.impulses?.[entry.impulseIndex]?.speed ?? 0}`,
        selection: { kind: 'impulse', levelIndex, checkpointIndex, impulseIndex: entry.impulseIndex },
        levelIndex,
        checkpointIndex,
        checkpointNumber,
        parentId: wrapperId,
        accentColor: accent.color,
        accentSoftColor: accent.softColor,
        noteMarker: impulseWarnings.length > 0,
        hasSettings: false
      }));
      warningsById[entry.id] = impulseWarnings;
      return;
    }

    if (entry.kind === 'portal') {
      const accent = getEntityAccent('portal');
      const portalWarnings = getWarningsForNode(warnings, 'portal', levelIndex, checkpointNumber, entry.portalIndex);
      nodes.push(buildNodeSummary({
        id: entry.id,
        kind: 'portal',
        label: 'Portal',
        sublabel: 'Entry + Exit',
        selection: { kind: 'portal', levelIndex, checkpointIndex, portalIndex: entry.portalIndex },
        levelIndex,
        checkpointIndex,
        checkpointNumber,
        parentId: wrapperId,
        accentColor: accent.color,
        accentSoftColor: accent.softColor,
        noteMarker: portalWarnings.length > 0,
        hasSettings: false
      }));
      warningsById[entry.id] = portalWarnings;
      return;
    }

    const botWarnings = getWarningsForNode(warnings, 'bot', levelIndex, checkpointNumber);
    nodes.push(buildNodeSummary({
      id: entry.id,
      kind: 'bot',
      label: 'Bot',
      sublabel: getAbilityNamesSummary(config.bot!.validAbilities, 'bot'),
      selection: { kind: 'bot', levelIndex, checkpointIndex },
      levelIndex,
      checkpointIndex,
      checkpointNumber,
      parentId: wrapperId,
      accentColor: BOT_ENTITY_CONFIG.color,
      accentSoftColor: BOT_ENTITY_CONFIG.softColor,
      noteMarker: botWarnings.length > 0,
      hasSettings: false
    }));
    warningsById[entry.id] = botWarnings;
  });
}

function buildHaxWrapperChildren(
  wrapperId: string,
  levelIndex: number | null,
  checkpointIndex: number | null,
  checkpointNumber: number | null,
  children: ReturnType<typeof buildVisibleHaxCheckpointChildren>[number]['children'] | ReturnType<typeof buildVisibleHaxSpawnChildren>[number]['children'],
  nodes: WorkspaceNodeSummary[],
  warningsById: Record<string, ConversionWarning[]>
): void {
  children.forEach((child) => {
    const isPortalPair =
      child.kind === 'haxEffectPair' &&
      (child.selection.kind === 'haxSpawnPortalPair' || child.selection.kind === 'haxPortalPair');

    nodes.push(buildNodeSummary({
      id: child.id,
      kind: child.kind,
      label: child.label,
      sublabel: child.sublabel,
      selection: child.selection,
      levelIndex: levelIndex ?? undefined,
      checkpointIndex: checkpointIndex ?? undefined,
      checkpointNumber: checkpointNumber ?? undefined,
      parentId: wrapperId,
      accentColor: child.accentColor,
      accentSoftColor: child.accentSoftColor,
      panelAccentColor: isPortalPair ? '#ff9f43' : undefined,
      panelAccentSoftColor: isPortalPair ? 'rgba(255, 159, 67, 0.18)' : undefined,
      panelAccentAltColor: isPortalPair ? '#7ddcff' : undefined,
      panelAccentAltSoftColor: isPortalPair ? 'rgba(125, 220, 255, 0.18)' : undefined,
      iconKey: child.iconKey,
      noteMarker: false,
      hasSettings: true
    }));
    warningsById[child.id] = [];
  });
}

export function buildWorkspaceDocumentIndex(
  document: WorkspaceDocument | null,
  warnings: ConversionWarning[]
): WorkspaceDocumentIndex | null {
  return measureWithPerf('workspace-document-index', () => {
    if (!document) {
      return null;
    }

    const nodes: WorkspaceNodeSummary[] = [];
    const warningsById: Record<string, ConversionWarning[]> = {};

    if (document.format === 'momentum') {
    const rootWarnings = getWarningsForNode(warnings, 'start');
    nodes.push(buildNodeSummary({
      id: 'root',
      kind: 'start',
      label: 'Spawn',
      sublabel: 'Start position',
      selection: { kind: 'start' },
      noteMarker: rootWarnings.length > 0,
      hasSettings: false
    }));
    warningsById.root = rootWarnings;

    document.map.levels.forEach((level, levelIndex) => {
      const levelAccent = getWorkshopColorCss(level.color, 0.92);
      const levelAccentSoft = getWorkshopColorCss(level.color, 0.18);
      const levelWarnings = getWarningsForNode(warnings, 'level', levelIndex);
      const levelId = `level-${levelIndex}`;

      nodes.push(buildNodeSummary({
        id: levelId,
        kind: 'level',
        label: truncateLabel(level.name, 20),
        sublabel: `Level ${levelIndex + 1}`,
        selection: { kind: 'level', levelIndex },
        levelIndex,
        parentId: 'root',
        accentColor: levelAccent,
        accentSoftColor: levelAccentSoft,
        noteMarker: levelWarnings.length > 0,
        hasSettings: false
      }));
      warningsById[levelId] = levelWarnings;

      level.checkpoints.forEach((_, checkpointIndex) => {
        const checkpointNumber = checkpointIndex + 1;
        const checkpointId = getCheckpointNodeId(levelIndex, checkpointIndex);
        const checkpointWarnings = getWarningsForNode(warnings, 'checkpoint', levelIndex, checkpointNumber);
        const config = level.checkpointConfigs[checkpointIndex];

        nodes.push(buildNodeSummary({
          id: checkpointId,
          kind: 'checkpoint',
          label: `Checkpoint ${checkpointNumber}`,
          sublabel: getCheckpointRole(checkpointIndex, level.checkpoints.length),
          selection: { kind: 'checkpoint', levelIndex, checkpointIndex },
          levelIndex,
          checkpointIndex,
          checkpointNumber,
          parentId: levelId,
          accentColor: levelAccent,
          accentSoftColor: levelAccentSoft,
          noteMarker: checkpointWarnings.length > 0,
          hasSettings: hasDirectSettings(config)
        }));
        warningsById[checkpointId] = checkpointWarnings;

        if (config) {
          const wrapperId = getMomentumEntitiesNodeId(levelIndex, checkpointIndex);
          nodes.push(buildNodeSummary({
            id: wrapperId,
            kind: 'momentumEntities',
            label: 'Entities',
            sublabel: '',
            selection: { kind: 'momentumEntities', levelIndex, checkpointIndex },
            levelIndex,
            checkpointIndex,
            checkpointNumber,
            parentId: checkpointId,
            accentColor: levelAccent,
            accentSoftColor: levelAccentSoft,
            noteMarker: false,
            hasSettings: true
          }));
          warningsById[wrapperId] = [];
          buildMomentumChildNode(
            wrapperId,
            levelIndex,
            checkpointIndex,
            checkpointNumber,
            config,
            warnings,
            nodes,
            warningsById
          );
        }
      });
    });
    } else {
      nodes.push(buildNodeSummary({
        id: 'root',
        kind: 'start',
        label: 'Spawn',
        sublabel: 'Hax start',
        selection: { kind: 'start' },
        noteMarker: false,
        hasSettings: true
      }));
      warningsById.root = [];

      buildVisibleHaxSpawnChildren(document.spawn.effects).forEach((wrapper) => {
        nodes.push(buildNodeSummary({
          id: wrapper.id,
          kind: wrapper.kind,
          label: wrapper.label,
          sublabel: wrapper.sublabel,
          selection: wrapper.selection,
          parentId: 'root',
          accentColor: wrapper.accentColor,
          accentSoftColor: wrapper.accentSoftColor,
          iconKey: wrapper.iconKey,
          noteMarker: false,
          hasSettings: true
        }));
        warningsById[wrapper.id] = [];
        buildHaxWrapperChildren(wrapper.id, null, null, null, wrapper.children, nodes, warningsById);
      });

      const levelStarts = getHaxLevelStartIndexes(document);
      levelStarts.forEach((startIndex, levelIndex) => {
        const nextStart = levelStarts[levelIndex + 1] ?? document.checkpoints.length;
        const levelColor = getDefaultLevelColor(levelIndex);
        const accentColor = getWorkshopColorCss(levelColor, 0.95);
        const accentSoftColor = getWorkshopColorCss(levelColor, 0.18);
        const levelId = `level-${levelIndex}`;

        nodes.push(buildNodeSummary({
          id: levelId,
          kind: 'level',
          label: `Level ${levelIndex + 1}`,
          sublabel: '',
          selection: { kind: 'level', levelIndex },
          levelIndex,
          parentId: 'root',
          accentColor,
          accentSoftColor,
          noteMarker: false,
          hasSettings: true
        }));
        warningsById[levelId] = [];

        for (let checkpointAbsoluteIndex = startIndex; checkpointAbsoluteIndex < nextStart; checkpointAbsoluteIndex += 1) {
          const checkpointIndex = checkpointAbsoluteIndex - startIndex;
          const checkpointNumber = checkpointIndex + 1;
          const checkpointId = getCheckpointNodeId(levelIndex, checkpointIndex);
          nodes.push(buildNodeSummary({
            id: checkpointId,
            kind: 'checkpoint',
            label: `Checkpoint ${checkpointNumber}`,
            sublabel: 'Checkpoint',
            selection: { kind: 'checkpoint', levelIndex, checkpointIndex },
            levelIndex,
            checkpointIndex,
            checkpointNumber,
            parentId: levelId,
            accentColor,
            accentSoftColor,
            noteMarker: false,
            hasSettings: true
          }));
          warningsById[checkpointId] = [];

          buildVisibleHaxCheckpointChildren(
            levelIndex,
            checkpointIndex,
            document.checkpoints[checkpointAbsoluteIndex].effects,
            document.checkpoints[checkpointAbsoluteIndex].missions
          ).forEach((wrapper) => {
            nodes.push(buildNodeSummary({
              id: wrapper.id,
              kind: wrapper.kind,
              label: wrapper.label,
              sublabel: wrapper.sublabel,
              selection: wrapper.selection,
              levelIndex,
              checkpointIndex,
              checkpointNumber,
              parentId: checkpointId,
              accentColor: wrapper.accentColor,
              accentSoftColor: wrapper.accentSoftColor,
              iconKey: wrapper.iconKey,
              noteMarker: false,
              hasSettings: true
            }));
            warningsById[wrapper.id] = [];
            buildHaxWrapperChildren(
              wrapper.id,
              levelIndex,
              checkpointIndex,
              checkpointNumber,
              wrapper.children,
              nodes,
              warningsById
            );
          });
        }
      });
    }
    const orderedIds = nodes.map((node) => node.id);
    const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
    const childrenById: Record<string, string[]> = {};
    const ancestorIdsById: Record<string, string[]> = {};

    nodes.forEach((node) => {
      if (!node.parentId) {
        return;
      }

      const siblings = childrenById[node.parentId] ?? [];
      siblings.push(node.id);
      childrenById[node.parentId] = siblings;
    });

    orderedIds.forEach((nodeId) => {
      const ancestors: string[] = [];
      let currentParentId = nodeById[nodeId]?.parentId;
      while (currentParentId) {
        ancestors.unshift(currentParentId);
        currentParentId = nodeById[currentParentId]?.parentId;
      }
      ancestorIdsById[nodeId] = ancestors;
    });

    return {
      ancestorIdsById,
      childrenById,
      nodeById,
      nodes,
      orderedIds,
      warningsById
    };
  });
}
