import {
  EDITOR_CHILD_INDENT,
  EDITOR_CHILD_ROW_GAP
} from '@/features/workspace/graph/layoutConstants';
import { getDefaultNodeDimensions } from '@/features/workspace/graph/buildLevelGraph.shared';
import type { EditorGraphModel, EditorNodeSummary } from '@/features/workspace/graph/types';

export interface SpawnPosition {
  x: number;
  y: number;
}

const SEARCH_RADIUS = 12;
const HORIZONTAL_PADDING = 12;
const VERTICAL_PADDING = 10;

function buildCandidateOffsets(): number[] {
  const offsets = [0];
  for (let step = 1; step <= SEARCH_RADIUS; step += 1) {
    offsets.push(step, -step);
  }
  return offsets;
}

function getSpawnPresentation(
  nextKind: 'touchOrb' | 'abilityOrb' | 'lavaOrb' | 'bot' | 'impulse' | 'portal'
): { width: number; height: number } {
  switch (nextKind) {
    case 'touchOrb':
      return getDefaultNodeDimensions('touchOrb', 'Touch Orb 1', '');
    case 'abilityOrb':
      return getDefaultNodeDimensions('abilityOrb', 'Ability Orb 1', 'All abilities');
    case 'lavaOrb':
      return getDefaultNodeDimensions('lavaOrb', 'Lava Orb 1', '');
    case 'bot':
      return getDefaultNodeDimensions('bot', 'Bot', 'All abilities');
    case 'impulse':
      return getDefaultNodeDimensions('impulse', 'Impulse 1', 'Speed 10');
    case 'portal':
      return getDefaultNodeDimensions('portal', 'Portal 1', 'Entry + Exit');
  }
}

function intersects(
  left: number,
  top: number,
  width: number,
  height: number,
  node: EditorNodeSummary
): boolean {
  const candidateLeft = left - HORIZONTAL_PADDING;
  const candidateRight = left + width + HORIZONTAL_PADDING;
  const candidateTop = top - VERTICAL_PADDING;
  const candidateBottom = top + height + VERTICAL_PADDING;
  const nodeLeft = node.x - HORIZONTAL_PADDING;
  const nodeRight = node.x + node.width + HORIZONTAL_PADDING;
  const nodeTop = node.y - node.height / 2 - VERTICAL_PADDING;
  const nodeBottom = node.y + node.height / 2 + VERTICAL_PADDING;

  return !(
    candidateRight <= nodeLeft ||
    candidateLeft >= nodeRight ||
    candidateBottom <= nodeTop ||
    candidateTop >= nodeBottom
  );
}

export function resolveEntitySpawnPosition(
  graph: EditorGraphModel | null,
  parentNode: EditorNodeSummary,
  nextKind: 'touchOrb' | 'abilityOrb' | 'lavaOrb' | 'bot' | 'impulse' | 'portal'
): SpawnPosition {
  const siblingCount = graph?.nodes.filter((graphNode) => graphNode.parentId === parentNode.id).length ?? 0;
  const { width, height } = getSpawnPresentation(nextKind);
  const x = parentNode.x + EDITOR_CHILD_INDENT;
  const preferredY = parentNode.y + (siblingCount === 0 ? 0 : (siblingCount - 0.5) * EDITOR_CHILD_ROW_GAP);
  const nodes = graph?.nodes ?? [];

  for (const offset of buildCandidateOffsets()) {
    const candidateY = preferredY + offset * EDITOR_CHILD_ROW_GAP;
    const candidateTop = candidateY - height / 2;
    const hasCollision = nodes.some((node) => intersects(x, candidateTop, width, height, node));

    if (!hasCollision) {
      return { x, y: candidateY };
    }
  }

  const overlappingNodes = nodes.filter((node) => {
    const nodeLeft = node.x - HORIZONTAL_PADDING;
    const nodeRight = node.x + node.width + HORIZONTAL_PADDING;
    return !(x + width + HORIZONTAL_PADDING <= nodeLeft || x - HORIZONTAL_PADDING >= nodeRight);
  });
  const lowestBottom = overlappingNodes.reduce(
    (maxBottom, node) => Math.max(maxBottom, node.y + node.height / 2),
    preferredY
  );

  return {
    x,
    y: Math.max(preferredY, lowestBottom + height / 2 + EDITOR_CHILD_ROW_GAP)
  };
}
