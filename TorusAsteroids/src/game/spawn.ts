import {
  ASTEROID_RADIUS,
  ASTEROID_SPEED_MAX,
  ASTEROID_SPEED_MIN,
  RESPAWN_SAFE_RADIUS,
  SHIP_RADIUS
} from './constants';
import { torusDistanceSquared } from './collision';
import type { Asteroid, AsteroidSize } from './types';

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomAngle(): number {
  return Math.random() * Math.PI * 2;
}

function speedBandForLevel(level: number): { min: number; max: number } {
  const min = ASTEROID_SPEED_MIN + level * 5;
  const max = ASTEROID_SPEED_MAX + level * 8;
  return { min, max };
}

export function asteroidCountForLevel(level: number): number {
  return Math.min(14, 3 + level);
}

export function createAsteroid(
  id: number,
  size: AsteroidSize,
  x: number,
  y: number,
  speedMin: number,
  speedMax: number,
  angle = randomAngle()
): Asteroid {
  const speed = randomBetween(speedMin, speedMax);
  return {
    id,
    size,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: ASTEROID_RADIUS[size],
    rotation: randomAngle(),
    spin: randomBetween(-1.2, 1.2),
    shapeSeed: Math.floor(Math.random() * 100_000)
  };
}

function randomPoint(width: number, height: number): { x: number; y: number } {
  return {
    x: randomBetween(0, width),
    y: randomBetween(0, height)
  };
}

export function spawnLevelAsteroids(
  level: number,
  nextId: number,
  width: number,
  height: number,
  safeX: number,
  safeY: number
): { asteroids: Asteroid[]; nextId: number } {
  const asteroids: Asteroid[] = [];
  const count = asteroidCountForLevel(level);
  const speedBand = speedBandForLevel(level);

  while (asteroids.length < count) {
    let candidate = randomPoint(width, height);
    let attempts = 0;

    while (
      torusDistanceSquared(candidate.x, candidate.y, safeX, safeY, width, height) <
        RESPAWN_SAFE_RADIUS * RESPAWN_SAFE_RADIUS &&
      attempts < 40
    ) {
      candidate = randomPoint(width, height);
      attempts += 1;
    }

    asteroids.push(
      createAsteroid(
        nextId,
        'large',
        candidate.x,
        candidate.y,
        speedBand.min,
        speedBand.max
      )
    );
    nextId += 1;
  }

  return { asteroids, nextId };
}

export function splitAsteroid(
  asteroid: Asteroid,
  nextId: number
): { asteroids: Asteroid[]; nextId: number } {
  let nextSize: AsteroidSize | null = null;
  if (asteroid.size === 'large') {
    nextSize = 'medium';
  } else if (asteroid.size === 'medium') {
    nextSize = 'small';
  }

  if (!nextSize) {
    return { asteroids: [], nextId };
  }

  const currentSpeed = Math.hypot(asteroid.vx, asteroid.vy);
  const baseSpeed = Math.max(currentSpeed * 1.18, ASTEROID_SPEED_MIN * 1.4);
  const asteroids: Asteroid[] = [];

  for (const sign of [-1, 1]) {
    const angle = Math.atan2(asteroid.vy, asteroid.vx) + sign * 0.65;
    asteroids.push(
      createAsteroid(
        nextId,
        nextSize,
        asteroid.x,
        asteroid.y,
        baseSpeed,
        baseSpeed + 26,
        angle
      )
    );
    nextId += 1;
  }

  return { asteroids, nextId };
}

function isSafeFromAsteroids(
  x: number,
  y: number,
  asteroids: Asteroid[],
  width: number,
  height: number
): boolean {
  return asteroids.every((asteroid) => {
    const clearance = asteroid.radius + SHIP_RADIUS + 34;
    return (
      torusDistanceSquared(x, y, asteroid.x, asteroid.y, width, height) >
      clearance * clearance
    );
  });
}

export function findSafeShipSpawn(
  asteroids: Asteroid[],
  width: number,
  height: number
): { x: number; y: number } {
  const center = { x: width * 0.5, y: height * 0.5 };
  if (isSafeFromAsteroids(center.x, center.y, asteroids, width, height)) {
    return center;
  }

  for (let i = 0; i < 120; i += 1) {
    const candidate = randomPoint(width, height);
    if (isSafeFromAsteroids(candidate.x, candidate.y, asteroids, width, height)) {
      return candidate;
    }
  }

  return center;
}
