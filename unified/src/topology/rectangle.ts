import type { Vec2 } from '../core/types';
import type { Topology, WrapResult } from './topology';

export interface RectangleTopologyOptions {
  frameInset?: number;
  showIdentificationArrows?: boolean;
}

/**
 * Rectangle topology for standard torus (opposite edges identified).
 * Coordinates are centered: x in [-w/2, w/2], y in [-h/2, h/2].
 */
export function createRectangleTopology(
  worldWidth = 1024,
  worldHeight = 768,
  options: RectangleTopologyOptions = {},
): Topology {
  const inset = Math.max(0, Math.floor(options.frameInset ?? 0));
  const playWidth = Math.max(32, worldWidth - inset * 2);
  const playHeight = Math.max(32, worldHeight - inset * 2);
  const hw = playWidth / 2;
  const hh = playHeight / 2;
  const showBoundary = inset > 0 || Boolean(options.showIdentificationArrows);

  function drawChevron(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'right' | 'up', size = 12): void {
    const half = size * 0.52;
    ctx.beginPath();
    if (dir === 'right') {
      ctx.moveTo(x - size, y - half);
      ctx.lineTo(x, y);
      ctx.lineTo(x - size, y + half);
    } else {
      ctx.moveTo(x - half, y + size);
      ctx.lineTo(x, y);
      ctx.lineTo(x + half, y + size);
    }
    ctx.stroke();
  }

  function drawIdentificationArrows(ctx: CanvasRenderingContext2D): void {
    // Top and bottom: arrows point right
    const topY = -hh;
    const bottomY = hh;
    drawChevron(ctx, -6, topY, 'right', 12);
    drawChevron(ctx, 22, topY, 'right', 12);
    drawChevron(ctx, -6, bottomY, 'right', 12);
    drawChevron(ctx, 22, bottomY, 'right', 12);

    // Left and right: arrows point up
    drawChevron(ctx, -hw, 0, 'up', 12);
    drawChevron(ctx, hw, 0, 'up', 12);
  }

  function wrapAxis(val: number, extent: number): number {
    let v = val % extent;
    if (v < 0) v += extent;
    return v;
  }

  function wrapInPlace(point: Vec2): WrapResult {
    const ox = point.x;
    const oy = point.y;
    // Wrap centered coordinates
    point.x = wrapAxis(point.x + hw, playWidth) - hw;
    point.y = wrapAxis(point.y + hh, playHeight) - hh;
    return {
      offset: { x: point.x - ox, y: point.y - oy },
      passes: (ox !== point.x || oy !== point.y) ? 1 : 0,
    };
  }

  function containsPoint(_point: Vec2, _margin = 0): boolean {
    // Everything is always inside the torus
    return true;
  }

  function getGhostOffsets(point: Vec2, radius: number): Vec2[] {
    const offsets: Vec2[] = [{ x: 0, y: 0 }];

    const nearRight = hw - point.x <= radius;
    const nearLeft = point.x + hw <= radius;
    const nearBottom = hh - point.y <= radius;
    const nearTop = point.y + hh <= radius;

    if (nearRight) offsets.push({ x: -playWidth, y: 0 });
    if (nearLeft) offsets.push({ x: playWidth, y: 0 });
    if (nearBottom) offsets.push({ x: 0, y: -playHeight });
    if (nearTop) offsets.push({ x: 0, y: playHeight });

    // Corner ghosts
    if (nearRight && nearBottom) offsets.push({ x: -playWidth, y: -playHeight });
    if (nearRight && nearTop) offsets.push({ x: -playWidth, y: playHeight });
    if (nearLeft && nearBottom) offsets.push({ x: playWidth, y: -playHeight });
    if (nearLeft && nearTop) offsets.push({ x: playWidth, y: playHeight });

    return offsets;
  }

  function randomPointInBounds(margin = 0, rng = Math.random): Vec2 {
    return {
      x: (rng() * 2 - 1) * (hw - margin),
      y: (rng() * 2 - 1) * (hh - margin),
    };
  }

  function pointOnRandomEdge(rng = Math.random): { point: Vec2; inward: Vec2 } {
    const edge = Math.floor(rng() * 4);
    const t = rng() * 2 - 1;
    switch (edge) {
      case 0: // right
        return { point: { x: hw, y: t * hh }, inward: { x: -1, y: 0 } };
      case 1: // left
        return { point: { x: -hw, y: t * hh }, inward: { x: 1, y: 0 } };
      case 2: // bottom
        return { point: { x: t * hw, y: hh }, inward: { x: 0, y: -1 } };
      case 3: // top
      default:
        return { point: { x: t * hw, y: -hh }, inward: { x: 0, y: 1 } };
    }
  }

  function buildClipPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.rect(-hw, -hh, playWidth, playHeight);
  }

  function drawBoundary(ctx: CanvasRenderingContext2D): void {
    if (!showBoundary) return;
    ctx.save();
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.rect(-hw, -hh, playWidth, playHeight);
    ctx.stroke();

    if (options.showIdentificationArrows) {
      drawIdentificationArrows(ctx);
    }
    ctx.restore();
  }

  function drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    const count = 95;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < count; i += 1) {
      const t = i * 13.37;
      const sx = (Math.sin(t * 12.9898) * 43758.5453) % 1;
      const sy = (Math.sin(t * 78.233) * 19341.123) % 1;
      const px = ((sx < 0 ? sx + 1 : sx) * 2 - 1) * hw;
      const py = ((sy < 0 ? sy + 1 : sy) * 2 - 1) * hh;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.4 + (i % 7) * 0.08) + i));
      ctx.globalAlpha = twinkle * 0.3;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    ctx.restore();
  }

  return {
    name: 'rectangle',
    displayName: 'TORUS ASTEROIDS',
    wrapInPlace,
    containsPoint,
    getGhostOffsets,
    randomPointInBounds,
    pointOnRandomEdge,
    spawnCenter: () => ({ x: 0, y: 0 }),
    buildClipPath,
    drawBoundary,
    drawStars,
    logicalSize: Math.max(playWidth, playHeight),
    worldWidth,
    worldHeight,
    centered: true,
  };
}
