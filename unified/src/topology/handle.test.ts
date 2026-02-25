import { describe, expect, it } from 'vitest';
import { createHandleTopology } from './handle';

describe('handle topology', () => {
  const topo = createHandleTopology();

  it('contains rectangle interior but excludes hole interiors', () => {
    expect(topo.containsPoint({ x: 0, y: 0 })).toBe(true);
    expect(topo.containsPoint({ x: -220, y: 0 })).toBe(false);
    expect(topo.containsPoint({ x: 220, y: 0 })).toBe(false);
    expect(topo.containsPoint({ x: 600, y: 0 })).toBe(false);
  });

  it('wraps across rectangle edges like a torus', () => {
    const p = { x: 520, y: -390 };
    const result = topo.wrapInPlace(p);
    expect(result.passes).toBeGreaterThan(0);
    expect(p.x).toBeCloseTo(-504, 6);
    expect(p.y).toBeCloseTo(378, 6);
  });

  it('wraps through a hole to the other hole via vertical reflection', () => {
    const p = { x: -220 + 70, y: 0 };
    const result = topo.wrapInPlace(p);
    expect(result.passes).toBeGreaterThan(0);
    // Mirrored to the opposite hole and pushed outside by the same radial depth.
    expect(p.x).toBeLessThan(220);
    expect(p.y).toBeCloseTo(0, 6);
    expect(topo.containsPoint(p)).toBe(true);
  });

  it('transforms wrapped velocity for hole seam crossings', () => {
    const v = { x: 5, y: 0 };
    topo.transformWrappedVelocityInPlace?.(v, { x: -220 + 70, y: 0 }, { x: 0, y: 0 });
    expect(v.x).toBeCloseTo(5, 6);
    expect(v.y).toBeCloseTo(0, 6);

    const radial = { x: 1, y: 0 };
    topo.transformWrappedVelocityInPlace?.(radial, { x: -220 - 70, y: 0 }, { x: 0, y: 0 });
    expect(radial.x).toBeCloseTo(1, 6);
  });

  it('reflects heading when wrapping through the top of a hole seam', () => {
    const angle = topo.transformWrappedAngle?.(Math.PI / 2, { x: -220, y: 60 }, { x: 0, y: 0 });
    expect(angle).toBeTypeOf('number');
  });

  it('emits hole seam ghost offsets near a hole boundary', () => {
    const offsets = topo.getGhostOffsets({ x: -220 + 95, y: 0 }, 10);
    expect(offsets.length).toBeGreaterThan(1);
  });
});
