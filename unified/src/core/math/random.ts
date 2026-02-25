import type { Vec2 } from '../types';

export const randRange = (min: number, max: number, rng = Math.random): number =>
  min + (max - min) * rng();

export const randInt = (minInclusive: number, maxInclusive: number, rng = Math.random): number =>
  Math.floor(randRange(minInclusive, maxInclusive + 1, rng));

export const randSign = (rng = Math.random): number => (rng() < 0.5 ? -1 : 1);

export const randChoice = <T>(items: readonly T[], rng = Math.random): T =>
  items[Math.floor(rng() * items.length)];

export const randUnitVec = (rng = Math.random): Vec2 => {
  const a = randRange(0, Math.PI * 2, rng);
  return { x: Math.cos(a), y: Math.sin(a) };
};
