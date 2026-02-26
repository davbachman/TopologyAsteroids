import type { Vec2 } from '../core/types';
import { drawChevron } from './boundaryMarks';
import type { Topology, WrapResult } from './topology';

const RADIUS = 420;
const CANVAS_SIZE = 960;

interface ProjectiveWrapMeta extends WrapResult {
  twistParity: 0 | 1;
}

function reflectAcrossRadialInPlace(v: Vec2, radialUnit: Vec2): void {
  const d = v.x * radialUnit.x + v.y * radialUnit.y;
  v.x = 2 * d * radialUnit.x - v.x;
  v.y = 2 * d * radialUnit.y - v.y;
}

/**
 * Real projective plane modeled as a disk with antipodal boundary points identified.
 * Crossing the boundary re-enters near the diametrically opposite boundary point.
 */
export function createProjectiveTopology(): Topology {
  function wrapPointInPlace(point: Vec2): ProjectiveWrapMeta {
    const ox = point.x;
    const oy = point.y;
    let r = Math.hypot(point.x, point.y);
    if (r <= RADIUS) {
      return { offset: { x: 0, y: 0 }, passes: 0, twistParity: 0 };
    }

    let dir = r > 1e-9 ? { x: point.x / r, y: point.y / r } : { x: 1, y: 0 };
    let passes = 0;
    let twistParity: 0 | 1 = 0;

    for (let i = 0; i < 8 && r > RADIUS; i += 1) {
      const overflow = r - RADIUS;
      r = RADIUS - overflow;
      dir = { x: -dir.x, y: -dir.y };
      twistParity = twistParity ? 0 : 1;
      if (r < 0) {
        r = -r;
        dir = { x: -dir.x, y: -dir.y };
      }
      passes += 1;
    }

    point.x = dir.x * r;
    point.y = dir.y * r;

    return {
      offset: { x: point.x - ox, y: point.y - oy },
      passes,
      twistParity,
    };
  }

  function wrapInPlace(point: Vec2): WrapResult {
    const { offset, passes } = wrapPointInPlace(point);
    return { offset, passes };
  }

  function twistParityFromBeforeWrap(beforeWrapPos: Vec2): 0 | 1 {
    const p = { x: beforeWrapPos.x, y: beforeWrapPos.y };
    return wrapPointInPlace(p).twistParity;
  }

  function transformWrappedVelocityInPlace(vel: Vec2, beforeWrapPos: Vec2): void {
    if (!twistParityFromBeforeWrap(beforeWrapPos)) return;
    const r = Math.hypot(beforeWrapPos.x, beforeWrapPos.y);
    if (r <= 1e-9) return;
    reflectAcrossRadialInPlace(vel, { x: beforeWrapPos.x / r, y: beforeWrapPos.y / r });
  }

  function transformWrappedAngle(angle: number, beforeWrapPos: Vec2): number {
    if (!twistParityFromBeforeWrap(beforeWrapPos)) return angle;
    const r = Math.hypot(beforeWrapPos.x, beforeWrapPos.y);
    if (r <= 1e-9) return angle;
    const heading = { x: Math.cos(angle), y: Math.sin(angle) };
    reflectAcrossRadialInPlace(heading, { x: beforeWrapPos.x / r, y: beforeWrapPos.y / r });
    return Math.atan2(heading.y, heading.x);
  }

  function containsPoint(point: Vec2, margin = 0): boolean {
    const limit = RADIUS - margin;
    if (limit < 0) return false;
    return point.x * point.x + point.y * point.y <= limit * limit;
  }

  function getGhostOffsets(point: Vec2, radius: number): Vec2[] {
    const r = Math.hypot(point.x, point.y);
    if (r <= 1e-9) return [{ x: 0, y: 0 }];
    if (RADIUS - r > radius) return [{ x: 0, y: 0 }];

    const dir = { x: point.x / r, y: point.y / r };
    const ghostR = 2 * RADIUS - r;
    const ghost = {
      x: -dir.x * ghostR,
      y: -dir.y * ghostR,
    };
    return [
      { x: 0, y: 0 },
      { x: ghost.x - point.x, y: ghost.y - point.y },
    ];
  }

  function randomPointInBounds(margin = 0, rng = Math.random): Vec2 {
    const radius = RADIUS - margin;
    if (radius <= 1) return { x: 0, y: 0 };
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  }

  function pointOnRandomEdge(rng = Math.random): { point: Vec2; inward: Vec2 } {
    const angle = rng() * Math.PI * 2;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    return {
      point: { x: dir.x * RADIUS, y: dir.y * RADIUS },
      inward: { x: -dir.x, y: -dir.y },
    };
  }

  function buildClipPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
  }

  function drawBoundary(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    // Dot markers (left/right)
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.arc(-RADIUS, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(RADIUS, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Arrow markers (top right-pointing, bottom left-pointing)
    drawChevron(ctx, 0, -RADIUS, 0, 11);
    drawChevron(ctx, 0, RADIUS, Math.PI, 11);
    ctx.restore();
  }

  function drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    const count = 64;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < count; i += 1) {
      const t = i * 13.07;
      const a = ((Math.sin(t * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const b = ((Math.sin(t * 78.233) * 19341.123) % 1 + 1) % 1;
      const angle = a * Math.PI * 2;
      const r = Math.sqrt(b) * (RADIUS - 4);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.45 + (i % 6) * 0.08) + i));
      ctx.globalAlpha = twinkle * 0.32;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    ctx.restore();
  }

  return {
    name: 'projective',
    displayName: 'PROJECTIVE PLANE UNIVERSE',
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
    logicalSize: CANVAS_SIZE,
    worldWidth: CANVAS_SIZE,
    worldHeight: CANVAS_SIZE,
    centered: true,
  };
}
