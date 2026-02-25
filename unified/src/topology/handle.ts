import type { Vec2 } from '../core/types';
import type { Topology, WrapResult } from './topology';

const WORLD_WIDTH = 1024;
const WORLD_HEIGHT = 768;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

const HOLE_RADIUS = 88;
const LEFT_HOLE_CENTER: Vec2 = { x: -220, y: 0 };
const RIGHT_HOLE_CENTER: Vec2 = { x: 220, y: 0 };
const HOLES = [LEFT_HOLE_CENTER, RIGHT_HOLE_CENTER] as const;

function wrapAxis(val: number, extent: number): number {
  let v = val % extent;
  if (v < 0) v += extent;
  return v;
}

function reflectAcrossTangentInPlace(v: Vec2, normal: Vec2): void {
  const d = v.x * normal.x + v.y * normal.y;
  v.x -= 2 * d * normal.x;
  v.y -= 2 * d * normal.y;
}

function wrapEdgesCentered(point: Vec2): WrapResult {
  const ox = point.x;
  const oy = point.y;
  point.x = wrapAxis(point.x + HALF_W, WORLD_WIDTH) - HALF_W;
  point.y = wrapAxis(point.y + HALF_H, WORLD_HEIGHT) - HALF_H;
  return {
    offset: { x: point.x - ox, y: point.y - oy },
    passes: (ox !== point.x || oy !== point.y) ? 1 : 0,
  };
}

function holeIndexContainingPoint(point: Vec2, margin = 0): 0 | 1 | null {
  const limit = Math.max(0, HOLE_RADIUS - margin);
  for (let i = 0; i < HOLES.length; i += 1) {
    const c = HOLES[i];
    const dx = point.x - c.x;
    const dy = point.y - c.y;
    if (dx * dx + dy * dy < limit * limit) return i as 0 | 1;
  }
  return null;
}

function mirrorAcrossCenterline(p: Vec2): Vec2 {
  return { x: -p.x, y: p.y };
}

function wrapThroughHoleInPlace(point: Vec2): boolean {
  const holeIndex = holeIndexContainingPoint(point);
  if (holeIndex === null) return false;
  const source = HOLES[holeIndex];
  const target = HOLES[(1 - holeIndex) as 0 | 1];
  const lx = point.x - source.x;
  const ly = point.y - source.y;
  const r = Math.hypot(lx, ly);
  if (r <= 1e-9) {
    // Rare exact-center hit: eject to mirrored point on the other boundary.
    point.x = target.x + HOLE_RADIUS;
    point.y = target.y;
    return true;
  }

  const dir = { x: lx / r, y: ly / r };
  const outsideR = 2 * HOLE_RADIUS - r;
  // Vertical reflection in local coords around the paired circles.
  point.x = target.x + (-dir.x) * outsideR;
  point.y = target.y + dir.y * outsideR;
  return true;
}

function seamNormalFromBeforeWrap(beforeWrapPos: Vec2): Vec2 | null {
  const p = { x: beforeWrapPos.x, y: beforeWrapPos.y };
  wrapEdgesCentered(p);
  const holeIndex = holeIndexContainingPoint(p);
  if (holeIndex === null) return null;
  const c = HOLES[holeIndex];
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const r = Math.hypot(dx, dy);
  if (r <= 1e-9) return null;
  return { x: dx / r, y: dy / r };
}

function transformHoleWrapVectorInPlace(v: Vec2, sourceNormal: Vec2): void {
  // First apply the specified global reflection across the center vertical line.
  v.x = -v.x;
  // Then flip the radial component to emerge outside the paired hole.
  const targetNormal = { x: -sourceNormal.x, y: sourceNormal.y };
  reflectAcrossTangentInPlace(v, targetNormal);
}

export function createHandleTopology(): Topology {
  function wrapInPlace(point: Vec2): WrapResult {
    const ox = point.x;
    const oy = point.y;
    let passes = 0;

    const edgeWrap = wrapEdgesCentered(point);
    passes += edgeWrap.passes;

    for (let i = 0; i < 4; i += 1) {
      if (!wrapThroughHoleInPlace(point)) break;
      passes += 1;
      // Keep rectangle wrapping canonical in case an extreme overshoot exits bounds.
      const postEdge = wrapEdgesCentered(point);
      passes += postEdge.passes;
    }

    return {
      offset: { x: point.x - ox, y: point.y - oy },
      passes,
    };
  }

  function transformWrappedVelocityInPlace(vel: Vec2, beforeWrapPos: Vec2): void {
    const n = seamNormalFromBeforeWrap(beforeWrapPos);
    if (!n) return;
    transformHoleWrapVectorInPlace(vel, n);
  }

  function transformWrappedAngle(angle: number, beforeWrapPos: Vec2): number {
    const n = seamNormalFromBeforeWrap(beforeWrapPos);
    if (!n) return angle;
    const heading = { x: Math.cos(angle), y: Math.sin(angle) };
    transformHoleWrapVectorInPlace(heading, n);
    return Math.atan2(heading.y, heading.x);
  }

  function containsPoint(point: Vec2, margin = 0): boolean {
    if (Math.abs(point.x) > HALF_W - margin || Math.abs(point.y) > HALF_H - margin) return false;
    for (const c of HOLES) {
      const dx = point.x - c.x;
      const dy = point.y - c.y;
      const limit = HOLE_RADIUS + margin;
      if (dx * dx + dy * dy < limit * limit) return false;
    }
    return true;
  }

  function getGhostOffsets(point: Vec2, radius: number): Vec2[] {
    const offsets: Vec2[] = [{ x: 0, y: 0 }];

    // Rectangle-torus edge ghosts.
    const nearRight = HALF_W - point.x <= radius;
    const nearLeft = point.x + HALF_W <= radius;
    const nearBottom = HALF_H - point.y <= radius;
    const nearTop = point.y + HALF_H <= radius;

    if (nearRight) offsets.push({ x: -WORLD_WIDTH, y: 0 });
    if (nearLeft) offsets.push({ x: WORLD_WIDTH, y: 0 });
    if (nearBottom) offsets.push({ x: 0, y: -WORLD_HEIGHT });
    if (nearTop) offsets.push({ x: 0, y: WORLD_HEIGHT });
    if (nearRight && nearBottom) offsets.push({ x: -WORLD_WIDTH, y: -WORLD_HEIGHT });
    if (nearRight && nearTop) offsets.push({ x: -WORLD_WIDTH, y: WORLD_HEIGHT });
    if (nearLeft && nearBottom) offsets.push({ x: WORLD_WIDTH, y: -WORLD_HEIGHT });
    if (nearLeft && nearTop) offsets.push({ x: WORLD_WIDTH, y: WORLD_HEIGHT });

    // Hole seam ghosts: map the center through the paired-hole seam if close enough.
    for (let i = 0; i < HOLES.length; i += 1) {
      const source = HOLES[i];
      const target = HOLES[(1 - i) as 0 | 1];
      const lx = point.x - source.x;
      const ly = point.y - source.y;
      const r = Math.hypot(lx, ly);
      if (r <= 1e-9) continue;
      const distToHole = Math.abs(r - HOLE_RADIUS);
      if (distToHole > radius) continue;

      const dir = { x: lx / r, y: ly / r };
      const mappedR = 2 * HOLE_RADIUS - r;
      const mapped = {
        x: target.x + (-dir.x) * mappedR,
        y: target.y + dir.y * mappedR,
      };
      offsets.push({ x: mapped.x - point.x, y: mapped.y - point.y });
    }

    // Deduplicate overlapping edge/hole ghost offsets.
    const unique = new Map<string, Vec2>();
    for (const o of offsets) {
      const key = `${o.x.toFixed(3)},${o.y.toFixed(3)}`;
      if (!unique.has(key)) unique.set(key, o);
    }
    return [...unique.values()];
  }

  function randomPointInBounds(margin = 0, rng = Math.random): Vec2 {
    for (let i = 0; i < 500; i += 1) {
      const p = {
        x: (rng() * 2 - 1) * (HALF_W - margin),
        y: (rng() * 2 - 1) * (HALF_H - margin),
      };
      if (containsPoint(p, margin)) return p;
    }
    return { x: 0, y: HALF_H * 0.6 };
  }

  function pointOnRandomEdge(rng = Math.random): { point: Vec2; inward: Vec2 } {
    const edge = Math.floor(rng() * 4);
    const t = rng() * 2 - 1;
    switch (edge) {
      case 0:
        return { point: { x: HALF_W, y: t * HALF_H }, inward: { x: -1, y: 0 } };
      case 1:
        return { point: { x: -HALF_W, y: t * HALF_H }, inward: { x: 1, y: 0 } };
      case 2:
        return { point: { x: t * HALF_W, y: HALF_H }, inward: { x: 0, y: -1 } };
      default:
        return { point: { x: t * HALF_W, y: -HALF_H }, inward: { x: 0, y: 1 } };
    }
  }

  function buildClipPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.rect(-HALF_W, -HALF_H, WORLD_WIDTH, WORLD_HEIGHT);
    for (const c of HOLES) {
      ctx.moveTo(c.x + HOLE_RADIUS, c.y);
      ctx.arc(c.x, c.y, HOLE_RADIUS, 0, Math.PI * 2, true);
    }
  }

  function drawBoundary(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    for (const c of HOLES) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, HOLE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    const count = 110;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < count; i += 1) {
      const t = i * 13.37;
      const sx = (Math.sin(t * 12.9898) * 43758.5453) % 1;
      const sy = (Math.sin(t * 78.233) * 19341.123) % 1;
      const px = ((sx < 0 ? sx + 1 : sx) * 2 - 1) * HALF_W;
      const py = ((sy < 0 ? sy + 1 : sy) * 2 - 1) * HALF_H;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.42 + (i % 7) * 0.08) + i));
      ctx.globalAlpha = twinkle * 0.28;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    ctx.restore();
  }

  return {
    name: 'handle',
    displayName: 'GENUS TWO (RECTANGLE HANDLE)',
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
    logicalSize: Math.max(WORLD_WIDTH, WORLD_HEIGHT),
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    centered: true,
  };
}
