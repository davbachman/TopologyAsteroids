import type { Vec2 } from '../types';

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });

export const cloneVec = (v: Vec2): Vec2 => ({ x: v.x, y: v.y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const lengthSq = (v: Vec2): number => dot(v, v);
export const length = (v: Vec2): number => Math.hypot(v.x, v.y);
export const distanceSq = (a: Vec2, b: Vec2): number => lengthSq(sub(a, b));
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  if (len <= 1e-9) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
};

export const rotate = (v: Vec2, angle: number): Vec2 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
};

export const fromAngle = (angle: number): Vec2 => ({ x: Math.cos(angle), y: Math.sin(angle) });

export const limitMagnitude = (v: Vec2, max: number): Vec2 => {
  const lenSqVal = lengthSq(v);
  if (lenSqVal <= max * max) return { x: v.x, y: v.y };
  const len = Math.sqrt(lenSqVal);
  const s = max / (len || 1);
  return { x: v.x * s, y: v.y * s };
};

export const perp = (v: Vec2): Vec2 => ({ x: -v.y, y: v.x });
