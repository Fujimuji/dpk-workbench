export type TextStyle = 'chip' | 'subtitle' | 'title';

let measurementContext: CanvasRenderingContext2D | null | undefined;
const TEXT_WIDTH_CACHE = new Map<string, number>();

export function getCanvasFont(style: TextStyle): string {
  switch (style) {
    case 'title':
      return "700 12.8px Rajdhani, 'Segoe UI', sans-serif";
    case 'subtitle':
      return "600 9.92px Rajdhani, 'Segoe UI', sans-serif";
    case 'chip':
      return "800 9.28px Rajdhani, 'Segoe UI', sans-serif";
  }
}

function estimateTextWidth(text: string, characterWidth: number): number {
  return text.length * characterWidth;
}

function getMeasurementContext(): CanvasRenderingContext2D | null {
  if (measurementContext !== undefined) {
    return measurementContext;
  }

  if (
    typeof document === 'undefined' ||
    (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))
  ) {
    measurementContext = null;
    return measurementContext;
  }

  try {
    const canvas = document.createElement('canvas');
    measurementContext = canvas.getContext('2d');
  } catch {
    measurementContext = null;
  }

  return measurementContext;
}

export function measureTextWidth(text: string, style: TextStyle, fallbackCharacterWidth: number): number {
  if (!text) {
    return 0;
  }

  const cacheKey = `${style}:${text}`;
  const cached = TEXT_WIDTH_CACHE.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const context = getMeasurementContext();
  if (!context) {
    const estimated = estimateTextWidth(text, fallbackCharacterWidth);
    TEXT_WIDTH_CACHE.set(cacheKey, estimated);
    return estimated;
  }

  context.font = getCanvasFont(style);

  const measured = context.measureText(text).width;
  const resolved = Number.isFinite(measured) && measured > 0 ? measured : estimateTextWidth(text, fallbackCharacterWidth);
  TEXT_WIDTH_CACHE.set(cacheKey, resolved);
  return resolved;
}
