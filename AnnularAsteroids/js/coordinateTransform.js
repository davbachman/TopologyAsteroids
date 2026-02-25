import { R_MIN, R_MAX, R_RANGE } from './constants.js';

export function rtToXY(r, t, cx, cy, scale) {
  return {
    x: cx + r * scale * Math.cos(t),
    y: cy + r * scale * Math.sin(t)
  };
}

export function headingToDisplayAngle(h, t) {
  return h + t;
}

export function wrapAngle(t) {
  t = t % (2 * Math.PI);
  if (t < 0) t += 2 * Math.PI;
  return t;
}

export function wrapRadius(r) {
  while (r > R_MAX) r -= R_RANGE;
  while (r < R_MIN) r += R_RANGE;
  return r;
}

export function distSqDisplay(r1, t1, r2, t2) {
  const x1 = r1 * Math.cos(t1), y1 = r1 * Math.sin(t1);
  const x2 = r2 * Math.cos(t2), y2 = r2 * Math.sin(t2);
  return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}
