import type { Vec2 } from './types';
import { dot, sub } from './math/vector';

export function circlesOverlap(a: Vec2, ar: number, b: Vec2, br: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

export function segmentIntersectsCircle(p0: Vec2, p1: Vec2, center: Vec2, radius: number): boolean {
  const d = sub(p1, p0);
  const f = sub(p0, center);
  const a = dot(d, d);
  if (a <= 1e-9) {
    const dx = p0.x - center.x;
    const dy = p0.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
  }
  let t = -dot(f, d) / a;
  t = Math.max(0, Math.min(1, t));
  const closest = { x: p0.x + d.x * t, y: p0.y + d.y * t };
  const dx = closest.x - center.x;
  const dy = closest.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
}
