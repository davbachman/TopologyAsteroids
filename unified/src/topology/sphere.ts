import type { Vec2 } from '../core/types';
import { randRange } from '../core/math/random';
import { drawChevron } from './boundaryMarks';
import type { Topology, WrapResult } from './topology';

interface Disk {
  center: Vec2;
  label: 'left' | 'right';
}

export interface SphereDiskLayout {
  worldWidth: number;
  worldHeight: number;
  diskRadius: number;
  leftCenter: Vec2;
  rightCenter: Vec2;
}

export const SPHERE_DISK_LAYOUT: SphereDiskLayout = {
  worldWidth: 1140,
  worldHeight: 640,
  diskRadius: 220,
  leftCenter: { x: 250, y: 320 },
  rightCenter: { x: 890, y: 320 },
};

const DISK_RADIUS = SPHERE_DISK_LAYOUT.diskRadius;
const WORLD_WIDTH = SPHERE_DISK_LAYOUT.worldWidth;
const WORLD_HEIGHT = SPHERE_DISK_LAYOUT.worldHeight;
const LEFT_CENTER: Vec2 = SPHERE_DISK_LAYOUT.leftCenter;
const RIGHT_CENTER: Vec2 = SPHERE_DISK_LAYOUT.rightCenter;
const DISKS: [Disk, Disk] = [
  { center: LEFT_CENTER, label: 'left' },
  { center: RIGHT_CENTER, label: 'right' },
];

function nearestDiskIndex(point: Vec2): 0 | 1 {
  const dl = (point.x - LEFT_CENTER.x) ** 2 + (point.y - LEFT_CENTER.y) ** 2;
  const dr = (point.x - RIGHT_CENTER.x) ** 2 + (point.y - RIGHT_CENTER.y) ** 2;
  return dl <= dr ? 0 : 1;
}

function localToDisk(point: Vec2, diskIndex: 0 | 1): { local: Vec2; r: number } {
  const c = DISKS[diskIndex].center;
  const local = { x: point.x - c.x, y: point.y - c.y };
  return { local, r: Math.hypot(local.x, local.y) };
}

function reflectAcrossTangentInPlace(v: Vec2, normal: Vec2): void {
  const dot = v.x * normal.x + v.y * normal.y;
  v.x -= 2 * dot * normal.x;
  v.y -= 2 * dot * normal.y;
}

function seamNormalFromBeforeWrap(beforeWrapPos: Vec2): Vec2 | null {
  const diskIndex = nearestDiskIndex(beforeWrapPos);
  const { local, r } = localToDisk(beforeWrapPos, diskIndex);
  if (r <= 1e-9) return null;
  return { x: local.x / r, y: local.y / r };
}

function mirrorAcrossDiskDivider(v: Vec2): Vec2 {
  return { x: -v.x, y: v.y };
}

function transformSeamVectorInPlace(v: Vec2, beforeWrapPos: Vec2): void {
  const sourceNormal = seamNormalFromBeforeWrap(beforeWrapPos);
  if (!sourceNormal) return;
  // Mirror seam identification across the vertical divider between disks.
  v.x = -v.x;
  // Crossing the boundary also flips radial overflow to the interior of the paired disk.
  const targetNormal = mirrorAcrossDiskDivider(sourceNormal);
  reflectAcrossTangentInPlace(v, targetNormal);
}

export function createSphereTopology(): Topology {
  function wrapInPlace(point: Vec2): WrapResult {
    const origX = point.x;
    const origY = point.y;

    let diskIndex = nearestDiskIndex(point);
    let { local, r } = localToDisk(point, diskIndex);
    if (r <= DISK_RADIUS) {
      return { offset: { x: 0, y: 0 }, passes: 0 };
    }

    let dir = r > 1e-9 ? { x: local.x / r, y: local.y / r } : { x: 1, y: 0 };
    let passes = 0;

    // Crossing the glued disk boundary flips disks, mirrors left/right, and mirrors radial overflow.
    for (let i = 0; i < 4 && r > DISK_RADIUS; i += 1) {
      const overflow = r - DISK_RADIUS;
      diskIndex = (1 - diskIndex) as 0 | 1;
      r = DISK_RADIUS - overflow;
      dir = mirrorAcrossDiskDivider(dir);
      if (r < 0) {
        r = -r;
        dir = { x: -dir.x, y: -dir.y };
      }
      passes += 1;
    }

    const c = DISKS[diskIndex].center;
    point.x = c.x + dir.x * r;
    point.y = c.y + dir.y * r;

    return {
      offset: { x: point.x - origX, y: point.y - origY },
      passes,
    };
  }

  function transformWrappedVelocityInPlace(vel: Vec2, beforeWrapPos: Vec2): void {
    transformSeamVectorInPlace(vel, beforeWrapPos);
  }

  function transformWrappedAngle(angle: number, beforeWrapPos: Vec2): number {
    const heading = { x: Math.cos(angle), y: Math.sin(angle) };
    transformSeamVectorInPlace(heading, beforeWrapPos);
    return Math.atan2(heading.y, heading.x);
  }

  function containsPoint(point: Vec2, margin = 0): boolean {
    const limit = DISK_RADIUS - margin;
    if (limit < 0) return false;
    for (const disk of DISKS) {
      const dx = point.x - disk.center.x;
      const dy = point.y - disk.center.y;
      if (dx * dx + dy * dy <= limit * limit) return true;
    }
    return false;
  }

  function getGhostOffsets(point: Vec2, radius: number): Vec2[] {
    const diskIndex = nearestDiskIndex(point);
    const otherIndex = (1 - diskIndex) as 0 | 1;
    const { local, r } = localToDisk(point, diskIndex);
    if (r <= 1e-9) return [{ x: 0, y: 0 }];
    if (DISK_RADIUS - r > radius) return [{ x: 0, y: 0 }];

    const dir = { x: local.x / r, y: local.y / r };
    const mirrored = mirrorAcrossDiskDivider(dir);
    const ghostR = 2 * DISK_RADIUS - r;
    const other = DISKS[otherIndex].center;
    const ghostPoint = {
      x: other.x + mirrored.x * ghostR,
      y: other.y + mirrored.y * ghostR,
    };
    return [
      { x: 0, y: 0 },
      { x: ghostPoint.x - point.x, y: ghostPoint.y - point.y },
    ];
  }

  function randomPointInBounds(margin = 0, rng = Math.random): Vec2 {
    const radius = DISK_RADIUS - margin;
    const disk = DISKS[rng() < 0.5 ? 0 : 1];
    if (radius <= 1) return { x: disk.center.x, y: disk.center.y };
    const angle = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius;
    return {
      x: disk.center.x + Math.cos(angle) * r,
      y: disk.center.y + Math.sin(angle) * r,
    };
  }

  function pointOnRandomEdge(rng = Math.random): { point: Vec2; inward: Vec2 } {
    const disk = DISKS[rng() < 0.5 ? 0 : 1];
    const angle = rng() * Math.PI * 2;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    return {
      point: {
        x: disk.center.x + dir.x * DISK_RADIUS,
        y: disk.center.y + dir.y * DISK_RADIUS,
      },
      inward: { x: -dir.x, y: -dir.y },
    };
  }

  function spawnCenter(): Vec2 {
    return { x: LEFT_CENTER.x, y: LEFT_CENTER.y };
  }

  function buildClipPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    for (const disk of DISKS) {
      ctx.moveTo(disk.center.x + DISK_RADIUS, disk.center.y);
      ctx.arc(disk.center.x, disk.center.y, DISK_RADIUS, 0, Math.PI * 2);
    }
  }

  function drawBoundary(ctx: CanvasRenderingContext2D): void {
    function drawSingleCircleTangentArrow(center: Vec2, radius: number, theta: number, tangentDirection: 1 | -1): void {
      const x = center.x + Math.cos(theta) * radius;
      const y = center.y + Math.sin(theta) * radius;
      const angle = theta + (tangentDirection > 0 ? Math.PI / 2 : -Math.PI / 2);
      drawChevron(ctx, x, y, angle, 10);
    }

    ctx.save();
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    for (const disk of DISKS) {
      ctx.beginPath();
      ctx.arc(disk.center.x, disk.center.y, DISK_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mark the paired disk boundaries (same boundary point on the other disk).
    ctx.lineWidth = 1.5;
    for (const disk of DISKS) {
      const tangentDirection: 1 | -1 = disk.label === 'left' ? 1 : -1;
      drawSingleCircleTangentArrow(disk.center, DISK_RADIUS, -Math.PI / 2, tangentDirection);
      drawSingleCircleTangentArrow(disk.center, DISK_RADIUS, Math.PI / 2, tangentDirection);
      drawSingleCircleTangentArrow(disk.center, DISK_RADIUS, 0, tangentDirection);
    }

    ctx.fillStyle = 'rgba(245,245,245,0.5)';
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HEMISPHERE A', LEFT_CENTER.x, LEFT_CENTER.y + DISK_RADIUS + 18);
    ctx.fillText('HEMISPHERE B', RIGHT_CENTER.x, RIGHT_CENTER.y + DISK_RADIUS + 18);
    ctx.restore();
  }

  function drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let diskIndex = 0; diskIndex < DISKS.length; diskIndex += 1) {
      const disk = DISKS[diskIndex];
      const count = 42;
      for (let i = 0; i < count; i += 1) {
        const seed = i + diskIndex * 97;
        const a = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
        const b = ((Math.sin(seed * 78.233) * 19341.123) % 1 + 1) % 1;
        const angle = a * Math.PI * 2;
        const r = Math.sqrt(b) * (DISK_RADIUS - 4);
        const px = disk.center.x + Math.cos(angle) * r;
        const py = disk.center.y + Math.sin(angle) * r;
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.45 + (i % 6) * 0.07) + seed));
        ctx.globalAlpha = twinkle * 0.3;
        ctx.fillRect(px, py, 1.5, 1.5);
      }
    }
    ctx.restore();
  }

  return {
    name: 'sphere',
    displayName: 'SPHERICAL ASTEROIDS',
    wrapInPlace,
    transformWrappedVelocityInPlace,
    transformWrappedAngle,
    containsPoint,
    getGhostOffsets,
    randomPointInBounds,
    pointOnRandomEdge,
    spawnCenter,
    buildClipPath,
    drawBoundary,
    drawStars,
    logicalSize: Math.max(WORLD_WIDTH, WORLD_HEIGHT),
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    centered: false,
  };
}
