import { describe, expect, it } from 'vitest';
import { createProjectiveTopology } from './projective';

describe('projective topology', () => {
  const topo = createProjectiveTopology();

  it('contains points inside the disk and excludes points outside', () => {
    expect(topo.containsPoint({ x: 0, y: 0 })).toBe(true);
    expect(topo.containsPoint({ x: 419, y: 0 })).toBe(true);
    expect(topo.containsPoint({ x: 421, y: 0 })).toBe(false);
  });

  it('wraps boundary crossings to the diametrically opposite side', () => {
    const p = { x: 430, y: 0 };
    const result = topo.wrapInPlace(p);
    expect(result.passes).toBeGreaterThan(0);
    expect(p.x).toBeCloseTo(-410, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });

  it('reflects velocity across the boundary radius so motion re-enters', () => {
    const v = { x: 2, y: -5 };
    topo.transformWrappedVelocityInPlace?.(v, { x: 430, y: 0 }, { x: -410, y: 0 });
    // Right-edge crossing maps to left-edge re-entry: radial component preserved, tangential flipped.
    expect(v.x).toBeCloseTo(2, 6);
    expect(v.y).toBeCloseTo(5, 6);
  });

  it('reflects heading across the boundary radius on an antipodal seam wrap', () => {
    const angle = Math.PI / 4;
    const wrapped = topo.transformWrappedAngle?.(angle, { x: 430, y: 0 }, { x: -410, y: 0 });
    expect(wrapped).toBeCloseTo(-Math.PI / 4, 6);
  });

  it('produces an antipodal ghost offset near the boundary', () => {
    const p = { x: 410, y: 0 };
    const offsets = topo.getGhostOffsets(p, 12);
    const hasGhost = offsets.some((o) => Math.abs(o.x + 840) < 1e-6 && Math.abs(o.y) < 1e-6);
    expect(hasGhost).toBe(true);
  });
});
