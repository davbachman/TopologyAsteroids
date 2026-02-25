import { describe, expect, it } from 'vitest';
import { createAnnulusTopology } from './annulus';

describe('annulus topology', () => {
  const inner = 10;
  const outer = 30;
  const topo = createAnnulusTopology(inner, outer);

  it('contains only points within the annular band', () => {
    expect(topo.containsPoint({ x: 20, y: 0 })).toBe(true);
    expect(topo.containsPoint({ x: 5, y: 0 })).toBe(false);
    expect(topo.containsPoint({ x: 35, y: 0 })).toBe(false);
  });

  it('wraps radial overflow by subtracting the radial range', () => {
    const p = { x: 35, y: 0 };
    const result = topo.wrapInPlace(p);
    expect(p.x).toBeCloseTo(15, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(result.offset.x).toBeCloseTo(-20, 6);
    expect(result.passes).toBe(1);
  });

  it('pushes exact center to the inner radius', () => {
    const p = { x: 0, y: 0 };
    topo.wrapInPlace(p);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(inner, 6);
  });

  it('emits ghost offsets near inner and outer seams', () => {
    const nearOuter = topo.getGhostOffsets({ x: 29, y: 0 }, 2);
    expect(nearOuter.length).toBeGreaterThan(1);
    const nearInner = topo.getGhostOffsets({ x: 11, y: 0 }, 2);
    expect(nearInner.length).toBeGreaterThan(1);
  });
});
