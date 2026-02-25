import { describe, expect, it } from 'vitest';
import { createRectangleTopology } from './rectangle';

describe('rectangle topology', () => {
  const topo = createRectangleTopology(100, 60);

  it('wraps centered coordinates across both axes', () => {
    const p = { x: 55, y: -40 };
    const result = topo.wrapInPlace(p);
    expect(p).toEqual({ x: -45, y: 20 });
    expect(result.offset).toEqual({ x: -100, y: 60 });
    expect(result.passes).toBe(1);
  });

  it('always contains points on the torus', () => {
    expect(topo.containsPoint({ x: 9999, y: -9999 })).toBe(true);
    expect(topo.containsPoint({ x: 0, y: 0 }, 1000)).toBe(true);
  });

  it('emits corner ghost offsets when close to two boundaries', () => {
    const offsets = topo.getGhostOffsets({ x: 49, y: 29 }, 2);
    expect(offsets).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: -100, y: 0 },
        { x: 0, y: -60 },
        { x: -100, y: -60 },
      ]),
    );
  });
});
