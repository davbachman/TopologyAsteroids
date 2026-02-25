import type { Vec2 } from '../core/types';
import { normalize, scale } from '../core/math/vector';
import { randRange } from '../core/math/random';
import type { Topology, WrapResult } from './topology';

/**
 * Annulus topology: inner and outer circular boundaries identified.
 * Coordinates are Cartesian, centered at (0,0).
 * Wrapping converts to polar, wraps r, converts back.
 */
export function createAnnulusTopology(
  innerRadius = 110,
  outerRadius = 420,
): Topology {
  const rRange = outerRadius - innerRadius;
  const midRadius = (innerRadius + outerRadius) / 2;
  const canvasSize = 960;

  function wrapInPlace(point: Vec2): WrapResult {
    let r = Math.hypot(point.x, point.y);
    if (r < 1e-9) {
      // At exact center — push to inner radius
      point.x = innerRadius;
      point.y = 0;
      return { offset: { x: innerRadius, y: 0 }, passes: 1 };
    }

    if (r >= innerRadius && r <= outerRadius) {
      return { offset: { x: 0, y: 0 }, passes: 0 };
    }

    const theta = Math.atan2(point.y, point.x);
    const origX = point.x;
    const origY = point.y;

    while (r > outerRadius) r -= rRange;
    while (r < innerRadius) r += rRange;

    point.x = r * Math.cos(theta);
    point.y = r * Math.sin(theta);

    return {
      offset: { x: point.x - origX, y: point.y - origY },
      passes: 1,
    };
  }

  function containsPoint(point: Vec2, margin = 0): boolean {
    const r = Math.hypot(point.x, point.y);
    return r >= innerRadius + margin && r <= outerRadius - margin;
  }

  function getGhostOffsets(point: Vec2, radius: number): Vec2[] {
    const r = Math.hypot(point.x, point.y);
    if (r < 1e-9) return [{ x: 0, y: 0 }];

    const theta = Math.atan2(point.y, point.x);
    const offsets: Vec2[] = [{ x: 0, y: 0 }];

    // Near outer boundary
    if (outerRadius - r <= radius) {
      const ghostR = r - rRange;
      if (ghostR > 0) {
        offsets.push({
          x: ghostR * Math.cos(theta) - point.x,
          y: ghostR * Math.sin(theta) - point.y,
        });
      }
    }

    // Near inner boundary
    if (r - innerRadius <= radius) {
      const ghostR = r + rRange;
      offsets.push({
        x: ghostR * Math.cos(theta) - point.x,
        y: ghostR * Math.sin(theta) - point.y,
      });
    }

    return offsets;
  }

  function randomPointInBounds(margin = 0, rng = Math.random): Vec2 {
    const rMin = innerRadius + margin;
    const rMax = outerRadius - margin;
    if (rMin >= rMax) return { x: midRadius, y: 0 };

    const angle = rng() * Math.PI * 2;
    const r = randRange(rMin, rMax, rng);
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  }

  function pointOnRandomEdge(rng = Math.random): { point: Vec2; inward: Vec2 } {
    const angle = rng() * Math.PI * 2;
    // Spawn on outer edge, pointing inward
    const point = { x: outerRadius * Math.cos(angle), y: outerRadius * Math.sin(angle) };
    const inward = normalize(scale(point, -1));
    return { point, inward };
  }

  function buildClipPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    // Outer circle (clockwise)
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2, false);
    // Inner circle (counter-clockwise) — creates annular hole
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2, true);
    ctx.closePath();
  }

  function drawBoundary(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    const count = 48;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < count; i += 1) {
      const t = i * 11.31;
      const angle = ((Math.sin(t * 12.9898) * 43758.5453) % 1) * Math.PI * 2;
      const rFrac = ((Math.sin(t * 78.233) * 19341.123) % 1);
      const r = innerRadius + (rFrac < 0 ? rFrac + 1 : rFrac) * rRange;
      const px = r * Math.cos(angle);
      const py = r * Math.sin(angle);
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.5 + (i % 5) * 0.1) + i));
      ctx.globalAlpha = twinkle * 0.35;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    ctx.restore();
  }

  return {
    name: 'annulus',
    displayName: 'ANNULAR ASTEROIDS',
    wrapInPlace,
    containsPoint,
    getGhostOffsets,
    randomPointInBounds,
    pointOnRandomEdge,
    spawnCenter: () => ({ x: midRadius, y: 0 }),
    buildClipPath,
    drawBoundary,
    drawStars,
    logicalSize: canvasSize,
    worldWidth: canvasSize,
    worldHeight: canvasSize,
    centered: true,
  };
}
