import { describe, expect, it } from 'vitest';
import { createSphereTopology, SPHERE_DISK_LAYOUT } from './sphere';

describe('sphere topology', () => {
  const topo = createSphereTopology();
  const L = SPHERE_DISK_LAYOUT.leftCenter;
  const R = SPHERE_DISK_LAYOUT.rightCenter;
  const radius = SPHERE_DISK_LAYOUT.diskRadius;

  it('contains points inside either disk and rejects the gap', () => {
    expect(topo.containsPoint({ x: L.x, y: L.y })).toBe(true);
    expect(topo.containsPoint({ x: R.x, y: R.y })).toBe(true);
    expect(topo.containsPoint({ x: (L.x + R.x) * 0.5, y: L.y })).toBe(false);
  });

  it('wraps across disks by mirroring radial overflow at the seam', () => {
    const p = { x: L.x + radius + 10, y: L.y };
    const wrap = topo.wrapInPlace(p);
    expect(wrap.passes).toBeGreaterThan(0);
    expect(p.x).toBeCloseTo(R.x - (radius - 10), 6);
    expect(p.y).toBeCloseTo(L.y, 6);
  });

  it('reflects wrapped radial velocity while preserving tangential velocity', () => {
    const seam = { x: L.x + (radius + 10) / Math.SQRT2, y: L.y + (radius + 10) / Math.SQRT2 };

    const radialVel = { x: 10 / Math.SQRT2, y: 10 / Math.SQRT2 };
    topo.transformWrappedVelocityInPlace?.(radialVel, seam, { x: 0, y: 0 });
    expect(radialVel.x).toBeCloseTo(10 / Math.SQRT2, 6);
    expect(radialVel.y).toBeCloseTo(-10 / Math.SQRT2, 6);

    const tangentialVel = { x: -7 / Math.SQRT2, y: 7 / Math.SQRT2 };
    topo.transformWrappedVelocityInPlace?.(tangentialVel, seam, { x: 0, y: 0 });
    expect(tangentialVel.x).toBeCloseTo(7 / Math.SQRT2, 6);
    expect(tangentialVel.y).toBeCloseTo(7 / Math.SQRT2, 6);
  });

  it('reflects wrapped heading angle with the same seam rule', () => {
    const seam = { x: L.x + (radius + 10) / Math.SQRT2, y: L.y + (radius + 10) / Math.SQRT2 };

    const radial = topo.transformWrappedAngle?.(Math.PI / 4, seam, { x: 0, y: 0 }) ?? 0;
    expect(Math.cos(radial)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(Math.sin(radial)).toBeCloseTo(-Math.SQRT1_2, 6);

    const tangent = topo.transformWrappedAngle?.((3 * Math.PI) / 4, seam, { x: 0, y: 0 }) ?? 0;
    expect(Math.cos(tangent)).toBeCloseTo(Math.SQRT1_2, 6);
    expect(Math.sin(tangent)).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('emits a ghost copy offset near a seam', () => {
    const offsets = topo.getGhostOffsets({ x: L.x + radius - 4, y: L.y }, 8);
    expect(offsets.length).toBeGreaterThan(1);
  });
});
