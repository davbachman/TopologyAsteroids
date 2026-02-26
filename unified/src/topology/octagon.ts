import type { Vec2 } from '../core/types';
import { dot, length, normalize, perp, scale } from '../core/math/vector';
import { drawChevron } from './boundaryMarks';
import type { Topology, WrapResult } from './topology';

const SQRT1_2 = Math.SQRT1_2;

interface OctagonGeometry {
  apothem: number;
  circumradius: number;
  normals: Vec2[];
  portalVectors: Vec2[];
  vertices: Vec2[];
}

function createGeometry(apothem: number): OctagonGeometry {
  const normals: Vec2[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: SQRT1_2, y: SQRT1_2 },
    { x: SQRT1_2, y: -SQRT1_2 },
  ];
  const portalVectors = normals.map((n) => ({ x: n.x * apothem * 2, y: n.y * apothem * 2 }));
  const circumradius = apothem / Math.cos(Math.PI / 8);
  const vertices: Vec2[] = [];
  for (let i = 0; i < 8; i += 1) {
    const angle = Math.PI / 8 + (i * Math.PI) / 4;
    vertices.push({ x: Math.cos(angle) * circumradius, y: Math.sin(angle) * circumradius });
  }
  return { apothem, circumradius, normals, portalVectors, vertices };
}

export function createOctagonTopology(apothem = 360): Topology {
  const geo = createGeometry(apothem);
  const edgeMarkers = geo.vertices.map((a, i) => {
    const b = geo.vertices[(i + 1) % geo.vertices.length];
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    let normalIndex = 0;
    let bestAbs = -Infinity;
    for (let j = 0; j < geo.normals.length; j += 1) {
      const d = dot(geo.normals[j], midpoint);
      const abs = Math.abs(d);
      if (abs > bestAbs) {
        bestAbs = abs;
        normalIndex = j;
      }
    }

    const normal = geo.normals[normalIndex];
    // Pick a consistent tangent orientation so opposite identified edges show matching arrow direction.
    const tangent = { x: normal.y, y: -normal.x };

    return { midpoint, tangent, normalIndex };
  });

  function wrapInPlace(point: Vec2): WrapResult {
    const offset = { x: 0, y: 0 };
    let passes = 0;
    for (let pass = 0; pass < 4; pass += 1) {
      let changed = false;
      for (const n of geo.normals) {
        const d = dot(n, point);
        if (d > geo.apothem) {
          const dx = 2 * geo.apothem * n.x;
          const dy = 2 * geo.apothem * n.y;
          point.x -= dx;
          point.y -= dy;
          offset.x -= dx;
          offset.y -= dy;
          changed = true;
        } else if (d < -geo.apothem) {
          const dx = 2 * geo.apothem * n.x;
          const dy = 2 * geo.apothem * n.y;
          point.x += dx;
          point.y += dy;
          offset.x += dx;
          offset.y += dy;
          changed = true;
        }
      }
      if (!changed) break;
      passes += 1;
    }
    return { offset, passes };
  }

  function containsPoint(point: Vec2, margin = 0): boolean {
    const limit = geo.apothem - margin;
    if (limit < 0) return false;
    for (const n of geo.normals) {
      if (Math.abs(dot(n, point)) > limit) return false;
    }
    return true;
  }

  function getGhostOffsets(point: Vec2, radius: number): Vec2[] {
    const triggers: Vec2[] = [];
    geo.normals.forEach((n) => {
      const d = dot(n, point);
      const distToPlus = geo.apothem - d;
      const distToMinus = geo.apothem + d;
      if (distToPlus <= radius) {
        triggers.push({ x: -2 * geo.apothem * n.x, y: -2 * geo.apothem * n.y });
      }
      if (distToMinus <= radius) {
        triggers.push({ x: 2 * geo.apothem * n.x, y: 2 * geo.apothem * n.y });
      }
    });

    if (triggers.length === 0) return [{ x: 0, y: 0 }];

    const offsets: Vec2[] = [{ x: 0, y: 0 }];
    for (const t of triggers) {
      const snapshot = [...offsets];
      for (const o of snapshot) {
        offsets.push({ x: o.x + t.x, y: o.y + t.y });
      }
    }

    const dedup = new Map<string, Vec2>();
    for (const o of offsets) {
      const key = `${o.x.toFixed(4)},${o.y.toFixed(4)}`;
      if (!dedup.has(key)) dedup.set(key, o);
    }
    return [...dedup.values()];
  }

  function randomPointInBounds(margin = 0, rng = Math.random): Vec2 {
    const bound = geo.apothem - margin;
    for (let i = 0; i < 400; i += 1) {
      const p = {
        x: (rng() * 2 - 1) * bound,
        y: (rng() * 2 - 1) * bound,
      };
      if (containsPoint(p, margin)) return p;
    }
    return { x: 0, y: 0 };
  }

  function pointOnRandomEdge(rng = Math.random): { point: Vec2; inward: Vec2 } {
    const idx = Math.floor(rng() * geo.vertices.length);
    const a = geo.vertices[idx];
    const b = geo.vertices[(idx + 1) % geo.vertices.length];
    const t = rng();
    const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const inward = normalize(scale(point, -1));
    return { point, inward: length(inward) > 0 ? inward : perp(normalize({ x: b.x - a.x, y: b.y - a.y })) };
  }

  function buildClipPath(ctx: CanvasRenderingContext2D): void {
    const [first, ...rest] = geo.vertices;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const v of rest) ctx.lineTo(v.x, v.y);
    ctx.closePath();
  }

  function drawBoundary(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    buildClipPath(ctx);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    const chevronCountsByPair = [1, 2, 3, 4] as const; // left/right, top/bottom, diag+, diag-
    for (const marker of edgeMarkers) {
      const count = chevronCountsByPair[marker.normalIndex];
      const spacing = 16;
      const angle = Math.atan2(marker.tangent.y, marker.tangent.x);
      const start = -((count - 1) * spacing) / 2;

      for (let i = 0; i < count; i += 1) {
        const offset = start + i * spacing;
        drawChevron(
          ctx,
          marker.midpoint.x + marker.tangent.x * offset,
          marker.midpoint.y + marker.tangent.y * offset,
          angle,
          8.5,
        );
      }
    }
    ctx.restore();
  }

  function drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    const count = 36;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < count; i += 1) {
      const t = i * 17.17;
      const sx = (Math.sin(t * 12.9898) * 43758.5453) % 1;
      const sy = (Math.sin(t * 78.233) * 19341.123) % 1;
      const px = ((sx < 0 ? sx + 1 : sx) * 2 - 1) * geo.apothem;
      const py = ((sy < 0 ? sy + 1 : sy) * 2 - 1) * geo.apothem;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.5 + (i % 5) * 0.1) + i));
      ctx.globalAlpha = twinkle * 0.35;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    ctx.restore();
  }

  return {
    name: 'octagon',
    displayName: 'OCTAGON ASTEROIDS',
    wrapInPlace,
    containsPoint,
    getGhostOffsets,
    randomPointInBounds,
    pointOnRandomEdge,
    spawnCenter: () => ({ x: 0, y: 0 }),
    buildClipPath,
    drawBoundary,
    drawStars,
    logicalSize: 960,
    worldWidth: 960,
    worldHeight: 960,
    centered: true,
  };
}
