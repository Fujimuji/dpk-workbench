import { describe, expect, it } from 'vitest';
import {
  clampScale,
  DEFAULT_VIEW_STATE,
  getAdaptiveZoomDelta,
  getCenteredViewStateForWorldPoint,
  getCenteredScaledViewState,
  getFitViewState,
  getPointerZoomViewState,
  normalizeSelectionBox,
  type ViewportMetrics
} from '../features/workspace/canvas/useCanvasViewport';

describe('canvas viewport helpers', () => {
  it('clamps scale to the supported editor range', () => {
    expect(clampScale(0.1)).toBe(0.55);
    expect(clampScale(1)).toBe(1);
    expect(clampScale(3)).toBe(3);
    expect(clampScale(5)).toBe(4);
  });

  it('reduces zoom step size at higher zoom levels', () => {
    expect(getAdaptiveZoomDelta(1.2, 0.15)).toBe(0.15);
    expect(getAdaptiveZoomDelta(2, 0.15)).toBe(0.12);
    expect(getAdaptiveZoomDelta(2.8, 0.15)).toBe(0.09);
    expect(getAdaptiveZoomDelta(3.6, 0.15)).toBe(0.06);
    expect(getAdaptiveZoomDelta(3.6, -0.15)).toBe(-0.06);
  });

  it('normalizes selection boxes regardless of drag direction', () => {
    expect(
      normalizeSelectionBox({
        startX: 40,
        startY: 20,
        currentX: 10,
        currentY: 50
      })
    ).toEqual({
      left: 10,
      top: 20,
      width: 30,
      height: 30
    });
  });

  it('zooms around the viewport center for button-based scaling', () => {
    const metrics: ViewportMetrics = {
      rect: new DOMRect(0, 0, 200, 100),
      renderScale: 1,
      offsetLeft: 0,
      offsetTop: 0
    };

    const next = getCenteredScaledViewState(DEFAULT_VIEW_STATE, metrics, 0.15);

    expect(next.scale).toBe(1.15);
    expect(next.offsetX).toBeCloseTo(-15);
    expect(next.offsetY).toBeCloseTo(-7.5);
  });

  it('zooms around the current pointer for wheel scaling', () => {
    const metrics: ViewportMetrics = {
      rect: new DOMRect(0, 0, 200, 100),
      renderScale: 1,
      offsetLeft: 0,
      offsetTop: 0
    };

    const next = getPointerZoomViewState(DEFAULT_VIEW_STATE, metrics, 50, 25, 0.15);

    expect(next.scale).toBe(1.15);
    expect(next.offsetX).toBeCloseTo(-7.5);
    expect(next.offsetY).toBeCloseTo(-3.75);
  });

  it('fits visible node bounds into the viewport with padding', () => {
    const metrics: ViewportMetrics = {
      rect: new DOMRect(0, 0, 300, 180),
      renderScale: 1,
      offsetLeft: 0,
      offsetTop: 0
    };

    const next = getFitViewState(
      {
        width: 320,
        height: 220,
        nodes: [
          { x: 40, y: 70, width: 80, height: 40 },
          { x: 180, y: 110, width: 70, height: 30 }
        ]
      },
      metrics,
      20
    );

    expect(next.scale).toBeCloseTo(1.2380952381);
    expect(next.offsetX).toBeCloseTo(-29.5238095238);
    expect(next.offsetY).toBeCloseTo(-18.3333333333);
  });

  it('centers an arbitrary world point on the visible viewport center', () => {
    const metrics: ViewportMetrics = {
      rect: new DOMRect(0, 0, 240, 120),
      renderScale: 1,
      offsetLeft: 0,
      offsetTop: 0
    };

    const next = getCenteredViewStateForWorldPoint(
      {
        scale: 1.5,
        offsetX: 10,
        offsetY: -4
      },
      metrics,
      { x: 50, y: 30 }
    );

    expect(next).toEqual({
      scale: 1.5,
      offsetX: 45,
      offsetY: 15
    });
  });
});
