import { describe, expect, it } from 'vitest';
import { computeTorusTextureLock } from '../src/render/torus3d';

describe('torus texture lock mapping', () => {
  it('maps origin to wrapped texture offsets and lock coordinates', () => {
    const lock = computeTorusTextureLock(0, 0, 1024, 768);

    expect(lock.shipU).toBe(0);
    expect(lock.shipV).toBe(1);
    expect(lock.offsetX).toBeCloseTo(0.75, 8);
    expect(lock.offsetY).toBeCloseTo(0, 8);
    expect(lock.lockedU).toBeCloseTo(0.25, 8);
    expect(lock.lockedV).toBeCloseTo(0, 8);
  });

  it('wraps coordinates before computing ship UV', () => {
    const lock = computeTorusTextureLock(1034, -10, 1024, 768);

    expect(lock.shipU).toBeCloseTo(10 / 1024, 8);
    expect(lock.shipV).toBeCloseTo(1 - 758 / 768, 8);
  });

  it('computes offset from ship UV and locked UV', () => {
    const lock = computeTorusTextureLock(512, 384, 1024, 768);

    expect(lock.shipU).toBeCloseTo(0.5, 8);
    expect(lock.shipV).toBeCloseTo(0.5, 8);
    expect(lock.offsetX).toBeCloseTo(0.25, 8);
    expect(lock.offsetY).toBeCloseTo(0.5, 8);
  });
});
