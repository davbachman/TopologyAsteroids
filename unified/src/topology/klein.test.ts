import { describe, expect, it } from 'vitest';
import { createKleinTopology } from './klein';

describe('klein topology', () => {
  const topo = createKleinTopology();

  it('wraps top and bottom edges like a cylinder', () => {
    const p = { x: 40, y: 390 };
    const result = topo.wrapInPlace(p);
    expect(result.passes).toBeGreaterThan(0);
    expect(p.x).toBeCloseTo(40, 6);
    expect(p.y).toBeCloseTo(-378, 6);
  });

  it('wraps left/right edges with a vertical coordinate flip', () => {
    const p = { x: 520, y: 100 };
    const result = topo.wrapInPlace(p);
    expect(result.passes).toBeGreaterThan(0);
    expect(p.x).toBeCloseTo(-504, 6);
    expect(p.y).toBeCloseTo(-100, 6);
  });

  it('flips vertical velocity on a twisted side wrap', () => {
    const v = { x: -3, y: 4 };
    topo.transformWrappedVelocityInPlace?.(v, { x: 520, y: 100 }, { x: -504, y: -100 });
    expect(v.x).toBeCloseTo(-3, 6);
    expect(v.y).toBeCloseTo(-4, 6);
  });

  it('reflects heading across the horizontal axis on a twisted side wrap', () => {
    const angle = topo.transformWrappedAngle?.(Math.PI / 3, { x: 520, y: 50 }, { x: -504, y: -50 });
    expect(angle).toBeCloseTo(-Math.PI / 3, 6);
  });

  it('emits a twisted ghost image across the side seam', () => {
    const p = { x: -500, y: 120 };
    const offsets = topo.getGhostOffsets(p, 12);
    const hasSideGhost = offsets.some((o) => Math.abs(o.x - 1024) < 1e-6 && Math.abs(o.y + 240) < 1e-6);
    expect(hasSideGhost).toBe(true);
  });
});

