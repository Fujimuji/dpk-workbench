import type { EditorNodeSummary } from '@/features/workspace/graph/types';
import type {
  ChildEntityCategory,
  ChildGroupRecord,
  ChildGroupState,
  HaxEffectGroupRecord,
  MomentumChildGroupRecord
} from '@/features/workspace/types';

export function getNodeChildCategory(node: Pick<EditorNodeSummary, 'kind'>): ChildEntityCategory | null {
  switch (node.kind) {
    case 'touchOrb':
    case 'touchStack':
      return 'touch';
    case 'abilityOrb':
    case 'abilityStack':
      return 'ability';
    case 'lavaOrb':
    case 'lavaStack':
      return 'lava';
    default:
      return null;
  }
}

export function getChildGroupStackNodeId(
  levelIndex: number,
  checkpointIndex: number,
  category: ChildEntityCategory,
  orbIndexes: number[]
): string {
  const kind =
    category === 'touch'
      ? 'touchStack'
      : category === 'ability'
        ? 'abilityStack'
        : 'lavaStack';
  const checkpointId = `level-${levelIndex}-cp-${checkpointIndex + 1}`;
  return `${checkpointId}-${kind}-${orbIndexes.join('-')}`;
}

export function getHaxEffectStackNodeId(
  levelIndex: number,
  checkpointIndex: number,
  nodeIds: string[]
): string {
  const checkpointId = `level-${levelIndex}-cp-${checkpointIndex + 1}`;
  const memberSuffixes = [...nodeIds]
    .sort()
    .map((nodeId) => nodeId.startsWith(`${checkpointId}-`) ? nodeId.slice(checkpointId.length + 1) : nodeId);
  return `${checkpointId}-haxEffectStack-${memberSuffixes.join('__')}`;
}

export function getCompatibleChildGroupsFromNodes(nodes: EditorNodeSummary[]): ChildGroupRecord[] {
  const groupedPmByKey = new Map<
    string,
    {
      levelIndex: number;
      checkpointIndex: number;
      category: ChildEntityCategory;
      orbIndexes: Set<number>;
    }
  >();
  const groupedHaxByKey = new Map<
    string,
    {
      format: 'hax';
      levelIndex: number;
      checkpointIndex: number;
      nodeIds: Set<string>;
    }
  >();

  nodes.forEach((node) => {
    const category = getNodeChildCategory(node);
    if (
      !category ||
      node.kind === 'touchStack' ||
      node.kind === 'abilityStack' ||
      node.kind === 'lavaStack' ||
      node.levelIndex === undefined ||
      node.checkpointIndex === undefined ||
      node.orbIndex === undefined
    ) {
      if (
        (node.kind === 'haxEffect' || node.kind === 'haxEffectPair') &&
        node.levelIndex !== undefined &&
        node.checkpointIndex !== undefined
      ) {
        const key = `${node.levelIndex}:${node.checkpointIndex}:hax`;
        const existing = groupedHaxByKey.get(key);
        if (existing) {
          existing.nodeIds.add(node.id);
          return;
        }

        groupedHaxByKey.set(key, {
          format: 'hax',
          levelIndex: node.levelIndex,
          checkpointIndex: node.checkpointIndex,
          nodeIds: new Set([node.id])
        });
      }

      return;
    }

    const key = `${node.levelIndex}:${node.checkpointIndex}:${category}`;
    const existing = groupedPmByKey.get(key);
    if (existing) {
      existing.orbIndexes.add(node.orbIndex);
      return;
    }

    groupedPmByKey.set(key, {
      levelIndex: node.levelIndex,
      checkpointIndex: node.checkpointIndex,
      category,
      orbIndexes: new Set([node.orbIndex])
    });
  });

  const momentumGroups: MomentumChildGroupRecord[] = Array.from(groupedPmByKey.values())
    .map((group): MomentumChildGroupRecord => ({
      levelIndex: group.levelIndex,
      checkpointIndex: group.checkpointIndex,
      category: group.category,
      orbIndexes: Array.from(group.orbIndexes).sort((left, right) => left - right)
    }))
    .filter((group) => group.orbIndexes.length >= 2);

  const haxGroups: HaxEffectGroupRecord[] = Array.from(groupedHaxByKey.values())
    .map((group): HaxEffectGroupRecord => ({
      format: 'hax',
      levelIndex: group.levelIndex,
      checkpointIndex: group.checkpointIndex,
      nodeIds: Array.from(group.nodeIds).sort()
    }))
    .filter((group) => group.nodeIds.length >= 2);

  return [...momentumGroups, ...haxGroups];
}

export function findChildGroupIndex(
  groups: ChildGroupState,
  levelIndex: number,
  checkpointIndex: number,
  category: ChildEntityCategory | 'hax',
  memberId: number | string
): number {
  return groups.findIndex(
    (group) => {
      if (group.levelIndex !== levelIndex || group.checkpointIndex !== checkpointIndex) {
        return false;
      }

      if (category === 'hax') {
        return 'format' in group && group.format === 'hax' && typeof memberId === 'string' && group.nodeIds.includes(memberId);
      }

      return !('format' in group) && group.category === category && typeof memberId === 'number' && group.orbIndexes.includes(memberId);
    }
  );
}

export function findChildGroup(
  groups: ChildGroupState,
  levelIndex: number,
  checkpointIndex: number,
  category: ChildEntityCategory | 'hax',
  memberId: number | string
): ChildGroupRecord | null {
  const index = findChildGroupIndex(groups, levelIndex, checkpointIndex, category, memberId);
  return index >= 0 ? groups[index] : null;
}

export function getCheckpointCategoryGroups(
  groups: ChildGroupState,
  levelIndex: number,
  checkpointIndex: number,
  category: ChildEntityCategory
): MomentumChildGroupRecord[] {
  return groups
    .filter(
      (group): group is MomentumChildGroupRecord =>
        !('format' in group) &&
        group.levelIndex === levelIndex &&
        group.checkpointIndex === checkpointIndex &&
        group.category === category
    )
    .map((group) => ({ ...group, orbIndexes: [...group.orbIndexes] }))
    .sort((left, right) => (left.orbIndexes[0] ?? 0) - (right.orbIndexes[0] ?? 0));
}

export function getCheckpointHaxEffectGroups(
  groups: ChildGroupState,
  levelIndex: number,
  checkpointIndex: number
): HaxEffectGroupRecord[] {
  return groups
    .filter(
      (group): group is HaxEffectGroupRecord =>
        'format' in group &&
        group.format === 'hax' &&
        group.levelIndex === levelIndex &&
        group.checkpointIndex === checkpointIndex
    )
    .map((group) => ({ ...group, nodeIds: [...group.nodeIds] }))
    .sort((left, right) => (left.nodeIds[0] ?? '').localeCompare(right.nodeIds[0] ?? ''));
}

export function removeChildGroupAtIndex(groups: ChildGroupState, groupIndex: number): ChildGroupState {
  return groups.filter((_, index) => index !== groupIndex);
}

export function removeChildGroupForMember(
  groups: ChildGroupState,
  levelIndex: number,
  checkpointIndex: number,
  category: ChildEntityCategory,
  orbIndex: number
): ChildGroupState {
  const groupIndex = findChildGroupIndex(groups, levelIndex, checkpointIndex, category, orbIndex);
  return groupIndex >= 0 ? removeChildGroupAtIndex(groups, groupIndex) : groups;
}

export function removeChildGroupRecord(
  groups: ChildGroupState,
  target: ChildGroupRecord
): ChildGroupState {
  return groups.filter(
    (group) => {
      if (group.levelIndex !== target.levelIndex || group.checkpointIndex !== target.checkpointIndex) {
        return true;
      }

      if (('format' in group && group.format === 'hax') || ('format' in target && target.format === 'hax')) {
        return !(
          'format' in group &&
          group.format === 'hax' &&
          'format' in target &&
          target.format === 'hax' &&
          group.nodeIds.length === target.nodeIds.length &&
          group.nodeIds.every((nodeId, index) => nodeId === target.nodeIds[index])
        );
      }

      return !(
        !('format' in group) &&
        !('format' in target) &&
        group.category === target.category &&
        group.orbIndexes.length === target.orbIndexes.length &&
        group.orbIndexes.every((orbIndex, index) => orbIndex === target.orbIndexes[index])
      );
    }
  );
}
