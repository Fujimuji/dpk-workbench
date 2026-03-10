import {
  EDITOR_BAND_MIN_HEIGHT,
  EDITOR_BOTTOM_PADDING,
  EDITOR_CHECKPOINT_ROW_GAP,
  EDITOR_COL_0_X,
  EDITOR_COL_1_X,
  EDITOR_COL_2_X,
  EDITOR_COL_3_X,
  EDITOR_CHILD_INDENT,
  EDITOR_CHILD_NODE_HEIGHT,
  EDITOR_CHILD_ROW_GAP,
  EDITOR_LEFT_PADDING,
  EDITOR_LEVEL_NODE_HEIGHT,
  EDITOR_LEVEL_ROW_GAP,
  EDITOR_LEVEL_TO_CHECKPOINT_GAP,
  EDITOR_MAX_SCALE,
  EDITOR_MIN_SCALE,
  EDITOR_NODE_HEIGHT,
  EDITOR_RIGHT_PADDING,
  EDITOR_ROOT_TO_LEVEL_GAP,
  EDITOR_TOP_PADDING,
  EDITOR_ZOOM_STEP
} from '@/features/workspace/graph/layoutConstants';
import { buildLevelGraph } from '@/features/workspace/graph/buildLevelGraph';
import {
  finalizeEditorGraph
} from '@/features/workspace/graph/finalizeGraph';
import type { MomentumMapModel } from '@/domain/model/types';
import type { ConversionWarning } from '@/domain/warnings/types';
import type { EditorGraphModel } from '@/features/workspace/graph/types';
import type {
  ChildGroupState,
  EditorLayoutState,
  EditorSelection
} from '@/features/workspace/types';

export {
  EDITOR_BAND_MIN_HEIGHT,
  EDITOR_BOTTOM_PADDING,
  EDITOR_CHECKPOINT_ROW_GAP,
  EDITOR_COL_0_X,
  EDITOR_COL_1_X,
  EDITOR_COL_2_X,
  EDITOR_COL_3_X,
  EDITOR_CHILD_INDENT,
  EDITOR_CHILD_NODE_HEIGHT,
  EDITOR_CHILD_ROW_GAP,
  EDITOR_LEFT_PADDING,
  EDITOR_LEVEL_NODE_HEIGHT,
  EDITOR_LEVEL_ROW_GAP,
  EDITOR_LEVEL_TO_CHECKPOINT_GAP,
  EDITOR_MAX_SCALE,
  EDITOR_MIN_SCALE,
  EDITOR_NODE_HEIGHT,
  EDITOR_RIGHT_PADDING,
  EDITOR_ROOT_TO_LEVEL_GAP,
  EDITOR_TOP_PADDING,
  EDITOR_ZOOM_STEP
};

export function buildEditorGraph(
  model: MomentumMapModel,
  warnings: ConversionWarning[],
  selection: EditorSelection | null,
  layout: EditorLayoutState,
  childGroups: ChildGroupState,
  focusedCheckpointId: string | null,
  isFocusModeEnabled: boolean
): EditorGraphModel {
  const { edges, nodes, warningsById } = buildLevelGraph(model, warnings, selection, layout, childGroups);

  return {
    warningsById,
    ...finalizeEditorGraph(nodes, edges, focusedCheckpointId, isFocusModeEnabled)
  };
}
