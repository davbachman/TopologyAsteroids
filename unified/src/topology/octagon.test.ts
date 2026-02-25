import { describe, expect, it } from 'vitest';
import { createOctagonTopology } from './octagon';

const topo = createOctagonTopology(100);

describe('octagon topology', () => {
  it('contains inside points and rejects outside points', () => {
    expect(topo.containsPoint({ x: 0, y: 0 })).toBe(true);
    expect(topo.containsPoint({ x: 99, y: 0 })).toBe(true);
    expect(topo.containsPoint({ x: 101, y: 0 })).toBe(false);
    expect(topo.containsPoint({ x: 90, y: 90 })).toBe(false);
  });

  it('wraps points across axis-aligned edges', () => {
    const p = { x: 105, y: 12 };
    const result = topo.wrapInPlace(p);
    expect(result.offset.x).toBeCloseTo(-200, 6);
    expect(result.offset.y).toBeCloseTo(0, 6);
    expect(p.x).toBeCloseTo(-95, 6);
    expect(p.y).toBeCloseTo(12, 6);
    expect(topo.containsPoint(p)).toBe(true);
  });

  it('wraps points across diagonal edges', () => {
    const n = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    const p = { x: n.x * 105, y: n.y * 105 };
    topo.wrapInPlace(p);
    expect(Math.abs(p.x * n.x + p.y * n.y + 95)).toBeLessThan(1e-6);
    expect(topo.containsPoint(p)).toBe(true);
  });

  it('resolves corner-crossing points with multiple wrap passes', () => {
    const p = { x: 140, y: 140 };
    const result = topo.wrapInPlace(p);
    expect(result.passes).toBeGreaterThan(0);
    expect(topo.containsPoint(p)).toBe(true);
  });

  it('produces ghost offsets near seams including corner combinations', () => {
    const nearRight = { x: 96, y: 0 };
    const offsets = topo.getGhostOffsets(nearRight, 10);
    expect(offsets).toEqual(expect.arrayContaining([{ x: 0, y: 0 }, { x: -200, y: 0 }]));

    const cornerPoint = { x: 100, y: 41.4213562373 };
    const cornerOffsets = topo.getGhostOffsets(cornerPoint, 2);
    expect(cornerOffsets.length).toBeGreaterThan(2);
    const hasCombo = cornerOffsets.some((o) => Math.abs(o.x) > 150 && Math.abs(o.y) > 50);
    expect(hasCombo).toBe(true);
  });
});
