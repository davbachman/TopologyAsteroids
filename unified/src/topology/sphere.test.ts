import { describe, expect, it } from 'vitest';
import { createSphereTopology } from './sphere';

describe('sphere topology', () => {
  const topo = createSphereTopology();

  it('contains points inside either disk and rejects the gap', () => {
    expect(topo.containsPoint({ x: 300, y: 320 })).toBe(true);
    expect(topo.containsPoint({ x: 840, y: 320 })).toBe(true);
    expect(topo.containsPoint({ x: 570, y: 320 })).toBe(false);
  });

  it('wraps across disks by mirroring radial overflow at the seam', () => {
    const p = { x: 300 + 250, y: 320 };
    const wrap = topo.wrapInPlace(p);
    expect(wrap.passes).toBeGreaterThan(0);
    expect(p.x).toBeCloseTo(840 + 230, 6);
    expect(p.y).toBeCloseTo(320, 6);
  });

  it('reflects wrapped radial velocity while preserving tangential velocity', () => {
    const radialVel = { x: 10, y: 0 };
    topo.transformWrappedVelocityInPlace?.(radialVel, { x: 300 + 250, y: 320 }, { x: 0, y: 0 });
    expect(radialVel.x).toBeCloseTo(-10, 6);
    expect(radialVel.y).toBeCloseTo(0, 6);

    const tangentialVel = { x: 0, y: 7 };
    topo.transformWrappedVelocityInPlace?.(tangentialVel, { x: 300 + 250, y: 320 }, { x: 0, y: 0 });
    expect(tangentialVel.x).toBeCloseTo(0, 6);
    expect(tangentialVel.y).toBeCloseTo(7, 6);
  });

  it('reflects wrapped heading angle with the same seam rule', () => {
    const east = topo.transformWrappedAngle?.(0, { x: 300 + 250, y: 320 }, { x: 0, y: 0 }) ?? 0;
    expect(Math.cos(east)).toBeCloseTo(-1, 6);
    expect(Math.sin(east)).toBeCloseTo(0, 6);

    const north = topo.transformWrappedAngle?.(Math.PI / 2, { x: 300 + 250, y: 320 }, { x: 0, y: 0 }) ?? 0;
    expect(Math.cos(north)).toBeCloseTo(0, 6);
    expect(Math.sin(north)).toBeCloseTo(1, 6);
  });

  it('emits a ghost copy offset near a seam', () => {
    const offsets = topo.getGhostOffsets({ x: 300 + 236, y: 320 }, 8);
    expect(offsets.length).toBeGreaterThan(1);
  });
});
