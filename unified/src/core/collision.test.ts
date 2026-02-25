import { describe, expect, it } from 'vitest';
import { segmentIntersectsCircle } from './collision';

describe('segmentIntersectsCircle', () => {
  it('detects a crossing segment', () => {
    expect(
      segmentIntersectsCircle({ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }, 3),
    ).toBe(true);
  });

  it('returns false when the segment misses', () => {
    expect(
      segmentIntersectsCircle({ x: -10, y: 6 }, { x: 10, y: 6 }, { x: 0, y: 0 }, 3),
    ).toBe(false);
  });

  it('handles zero-length segments', () => {
    expect(segmentIntersectsCircle({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 0 }, 2)).toBe(true);
    expect(segmentIntersectsCircle({ x: 4, y: 4 }, { x: 4, y: 4 }, { x: 0, y: 0 }, 2)).toBe(false);
  });
});
