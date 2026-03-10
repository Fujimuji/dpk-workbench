interface RgbaColor {
  alpha: number;
  blue: number;
  green: number;
  red: number;
}

export interface CanvasThemeColors {
  canvasBg: string;
  canvasGridLine: string;
  countChipBase: string;
  countChipStroke: string;
  countChipText: string;
  edge: string;
  edgeSelected: string;
  nodeBaseFill: string;
  nodeBaseFillStrong: string;
  nodeBaseStroke: string;
  nodeHoverFill: string;
  noteMarker: string;
  noteMarkerBorder: string;
  noteMarkerHover: string;
  selectionBg: string;
  selectionBorder: string;
  selectionShadow: string;
  surfacePanelActive: string;
  textSubtitle: string;
  textTitle: string;
}

const DEFAULT_THEME: CanvasThemeColors = {
  canvasBg: '#15191f',
  canvasGridLine: 'rgba(88, 101, 119, 0.04)',
  countChipBase: 'rgba(235, 244, 255, 0.14)',
  countChipStroke: 'rgba(235, 244, 255, 0.2)',
  countChipText: '#f2f8ff',
  edge: 'rgba(120, 136, 160, 0.64)',
  edgeSelected: 'rgba(149, 217, 255, 0.88)',
  nodeBaseFill: '#232a35',
  nodeBaseFillStrong: '#1e2631',
  nodeBaseStroke: '#465263',
  nodeHoverFill: '#2c3542',
  noteMarker: '#d39b32',
  noteMarkerBorder: 'rgba(24, 29, 37, 0.92)',
  noteMarkerHover: '#f0bb4a',
  selectionBg: 'rgba(158, 229, 255, 0.12)',
  selectionBorder: 'rgba(158, 229, 255, 0.55)',
  selectionShadow: 'rgba(158, 229, 255, 0.12)',
  surfacePanelActive: 'rgba(149, 217, 255, 0.18)',
  textSubtitle: '#8e9dad',
  textTitle: '#f2f6fb'
};

function normalizeColorValue(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function parseHexColor(value: string): RgbaColor | null {
  const hex = value.replace('#', '').trim();
  if (![3, 4, 6, 8].includes(hex.length)) {
    return null;
  }

  const expanded = hex.length <= 4
    ? hex.split('').map((character) => `${character}${character}`).join('')
    : hex;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;

  if ([red, green, blue].some((channel) => Number.isNaN(channel)) || Number.isNaN(alpha)) {
    return null;
  }

  return { red, green, blue, alpha };
}

function parseRgbColor(value: string): RgbaColor | null {
  const match = value
    .trim()
    .match(/^rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)(?:[/,\s]+([0-9.]+))?\s*\)$/i);

  if (!match) {
    return null;
  }

  const red = Number.parseFloat(match[1]);
  const green = Number.parseFloat(match[2]);
  const blue = Number.parseFloat(match[3]);
  const alpha = match[4] === undefined ? 1 : Number.parseFloat(match[4]);

  if ([red, green, blue, alpha].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { red, green, blue, alpha };
}

export function parseCanvasColor(value: string): RgbaColor | null {
  if (value.startsWith('#')) {
    return parseHexColor(value);
  }

  if (value.startsWith('rgb')) {
    return parseRgbColor(value);
  }

  return null;
}

export function formatCanvasColor(color: RgbaColor): string {
  return `rgba(${Math.round(color.red)}, ${Math.round(color.green)}, ${Math.round(color.blue)}, ${Math.max(0, Math.min(1, color.alpha))})`;
}

export function mixCanvasColors(primary: string, secondary: string, primaryWeight: number): string {
  const left = parseCanvasColor(primary);
  const right = parseCanvasColor(secondary);
  if (!left || !right) {
    return primary;
  }

  const weight = Math.max(0, Math.min(1, primaryWeight));
  const inverse = 1 - weight;
  return formatCanvasColor({
    red: left.red * weight + right.red * inverse,
    green: left.green * weight + right.green * inverse,
    blue: left.blue * weight + right.blue * inverse,
    alpha: left.alpha * weight + right.alpha * inverse
  });
}

export function withCanvasAlpha(color: string, alpha: number): string {
  const parsed = parseCanvasColor(color);
  if (!parsed) {
    return color;
  }

  return formatCanvasColor({
    ...parsed,
    alpha: Math.max(0, Math.min(1, alpha))
  });
}

export function resolveCanvasThemeColors(element: Element | null): CanvasThemeColors {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  const styles = window.getComputedStyle(element ?? document.documentElement);
  return {
    canvasBg: normalizeColorValue(styles.getPropertyValue('--canvas-bg'), DEFAULT_THEME.canvasBg),
    canvasGridLine: normalizeColorValue(styles.getPropertyValue('--canvas-grid-line'), DEFAULT_THEME.canvasGridLine),
    countChipBase: normalizeColorValue(styles.getPropertyValue('--graph-count-chip-base'), DEFAULT_THEME.countChipBase),
    countChipStroke: normalizeColorValue(styles.getPropertyValue('--graph-count-chip-stroke'), DEFAULT_THEME.countChipStroke),
    countChipText: normalizeColorValue(styles.getPropertyValue('--graph-count-chip-text'), DEFAULT_THEME.countChipText),
    edge: normalizeColorValue(styles.getPropertyValue('--graph-edge'), DEFAULT_THEME.edge),
    edgeSelected: normalizeColorValue(styles.getPropertyValue('--canvas-focus-ring'), DEFAULT_THEME.edgeSelected),
    nodeBaseFill: normalizeColorValue(styles.getPropertyValue('--graph-node-base-fill'), DEFAULT_THEME.nodeBaseFill),
    nodeBaseFillStrong: normalizeColorValue(styles.getPropertyValue('--graph-node-base-fill-strong'), DEFAULT_THEME.nodeBaseFillStrong),
    nodeBaseStroke: normalizeColorValue(styles.getPropertyValue('--graph-node-base-stroke'), DEFAULT_THEME.nodeBaseStroke),
    nodeHoverFill: normalizeColorValue(styles.getPropertyValue('--graph-node-hover-fill'), DEFAULT_THEME.nodeHoverFill),
    noteMarker: normalizeColorValue(styles.getPropertyValue('--graph-note-marker'), DEFAULT_THEME.noteMarker),
    noteMarkerBorder: normalizeColorValue(styles.getPropertyValue('--graph-note-marker-border'), DEFAULT_THEME.noteMarkerBorder),
    noteMarkerHover: normalizeColorValue(styles.getPropertyValue('--graph-note-marker-hover'), DEFAULT_THEME.noteMarkerHover),
    selectionBg: normalizeColorValue(styles.getPropertyValue('--canvas-selection-bg'), DEFAULT_THEME.selectionBg),
    selectionBorder: normalizeColorValue(styles.getPropertyValue('--canvas-selection-border'), DEFAULT_THEME.selectionBorder),
    selectionShadow: normalizeColorValue(styles.getPropertyValue('--canvas-selection-shadow'), DEFAULT_THEME.selectionShadow),
    surfacePanelActive: normalizeColorValue(styles.getPropertyValue('--surface-panel-active'), DEFAULT_THEME.surfacePanelActive),
    textSubtitle: normalizeColorValue(styles.getPropertyValue('--graph-node-subtitle'), DEFAULT_THEME.textSubtitle),
    textTitle: normalizeColorValue(styles.getPropertyValue('--graph-node-title'), DEFAULT_THEME.textTitle)
  };
}
