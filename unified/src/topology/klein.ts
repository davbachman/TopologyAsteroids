import type { Vec2 } from '../core/types';
import { drawChevron, drawDoubleChevron } from './boundaryMarks';
import type { Topology, WrapResult } from './topology';

export interface KleinTopologyOptions {
  frameInset?: number;
  showIdentificationArrows?: boolean;
}

interface KleinWrapMeta extends WrapResult {
  horizontalTwistParity: 0 | 1;
}

/**
 * Klein bottle topology on a rectangle.
 * Top/bottom edges wrap like a cylinder. Left/right edges wrap with a twist:
 * (x = -w/2, y) ~ (x = +w/2, -y), matching the reversed vertical arrows.
 */
export function createKleinTopology(
  worldWidth = 1024,
  worldHeight = 768,
  options: KleinTopologyOptions = {},
): Topology {
  const inset = Math.max(0, Math.floor(options.frameInset ?? 0));
  const playWidth = Math.max(32, worldWidth - inset * 2);
  const playHeight = Math.max(32, worldHeight - inset * 2);
  const hw = playWidth / 2;
  const hh = playHeight / 2;
  const showBoundary = inset > 0 || Boolean(options.showIdentificationArrows);

  function wrapPointInPlace(point: Vec2): KleinWrapMeta {
    const ox = point.x;
    const oy = point.y;
    let passes = 0;
    let horizontalTwistParity: 0 | 1 = 0;

    for (let i = 0; i < 16; i += 1) {
      let changed = false;

      if (point.x > hw) {
        point.x -= playWidth;
        point.y = -point.y;
        passes += 1;
        horizontalTwistParity = horizontalTwistParity ? 0 : 1;
        changed = true;
      } else if (point.x < -hw) {
        point.x += playWidth;
        point.y = -point.y;
        passes += 1;
        horizontalTwistParity = horizontalTwistParity ? 0 : 1;
        changed = true;
      }

      if (point.y > hh) {
        point.y -= playHeight;
        passes += 1;
        changed = true;
      } else if (point.y < -hh) {
        point.y += playHeight;
        passes += 1;
        changed = true;
      }

      if (!changed) break;
    }

    return {
      offset: { x: point.x - ox, y: point.y - oy },
      passes,
      horizontalTwistParity,
    };
  }

  function wrapInPlace(point: Vec2): WrapResult {
    const { offset, passes } = wrapPointInPlace(point);
    return { offset, passes };
  }

  function twistParityFromBeforeWrap(beforeWrapPos: Vec2): 0 | 1 {
    const probe = { x: beforeWrapPos.x, y: beforeWrapPos.y };
    return wrapPointInPlace(probe).horizontalTwistParity;
  }

  function transformWrappedVelocityInPlace(vel: Vec2, beforeWrapPos: Vec2): void {
    if (!twistParityFromBeforeWrap(beforeWrapPos)) return;
    // Local seam continuation for the twisted side identification flips the edge parameter.
    vel.y = -vel.y;
  }

  function transformWrappedAngle(angle: number, beforeWrapPos: Vec2): number {
    if (!twistParityFromBeforeWrap(beforeWrapPos)) return angle;
    // Reflection across the horizontal axis: (vx, vy) -> (vx, -vy)
    return -angle;
  }

  function containsPoint(_point: Vec2, _margin = 0): boolean {
    return true;
  }

  function getGhostOffsets(point: Vec2, radius: number): Vec2[] {
    const offsets: Vec2[] = [{ x: 0, y: 0 }];

    // Generate neighboring images under the Klein-bottle tiling action:
    // (x, y) -> (x + mW, (-1)^m y + nH)
    for (let m = -1; m <= 1; m += 1) {
      for (let n = -1; n <= 1; n += 1) {
        if (m === 0 && n === 0) continue;
        const flipped = Math.abs(m) % 2 === 1;
        const image = {
          x: point.x + m * playWidth,
          y: (flipped ? -point.y : point.y) + n * playHeight,
        };

        if (image.x < -hw - radius || image.x > hw + radius) continue;
        if (image.y < -hh - radius || image.y > hh + radius) continue;

        offsets.push({ x: image.x - point.x, y: image.y - point.y });
      }
    }

    const unique = new Map<string, Vec2>();
    for (const o of offsets) {
      const key = `${o.x.toFixed(4)},${o.y.toFixed(4)}`;
      if (!unique.has(key)) unique.set(key, o);
    }
    return [...unique.values()];
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

  function drawIdentificationArrows(ctx: CanvasRenderingContext2D): void {
    // Top and bottom identified with matching orientation (double arrows pointing right).
    drawDoubleChevron(ctx, 0, -hh, 0, 12, 18);
    drawDoubleChevron(ctx, 0, hh, 0, 12, 18);

    // Left/right identified with reversed vertical orientation.
    drawChevron(ctx, -hw, 0, Math.PI / 2, 12); // down
    drawChevron(ctx, hw, 0, -Math.PI / 2, 12); // up
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
      ctx.lineWidth = 1.5;
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
    name: 'klein',
    displayName: 'KLEIN BOTTLE UNIVERSE',
    wrapInPlace,
    transformWrappedVelocityInPlace,
    transformWrappedAngle,
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

