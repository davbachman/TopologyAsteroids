import type { Topology } from '../topology/topology';
import { GAME_CONFIG } from './config';
import { randChoice, randRange, randUnitVec } from './math/random';
import { add, fromAngle, normalize, scale } from './math/vector';
import type { AsteroidSize, AsteroidState, BulletState, PlayerState, UfoState, UfoType, Vec2 } from './types';

function asteroidShape(rng = Math.random): number[] {
  const points = 10;
  return Array.from({ length: points }, () => randRange(0.72, 1.18, rng));
}

export function createPlayer(id: number): PlayerState {
  return {
    id,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    angle: -Math.PI / 2,
    radius: GAME_CONFIG.player.radius,
    collisionRadius: GAME_CONFIG.player.collisionRadius,
    alive: true,
    fireCooldown: 0,
    invulnerableTimer: GAME_CONFIG.player.invulnerabilityTime,
    blinkPhase: 0,
    thrusting: false,
  };
}

export function createBullet(
  id: number,
  owner: 'player' | 'ufo',
  pos: Vec2,
  vel: Vec2,
): BulletState {
  return {
    id,
    owner,
    pos: { x: pos.x, y: pos.y },
    prevPos: { x: pos.x, y: pos.y },
    vel: { x: vel.x, y: vel.y },
    radius: owner === 'player' ? GAME_CONFIG.bullets.radius : GAME_CONFIG.bullets.ufoRadius,
    ttl: owner === 'player' ? GAME_CONFIG.player.bulletTtl : GAME_CONFIG.bullets.ufoTtl,
  };
}

export function createAsteroid(
  id: number,
  size: AsteroidSize,
  pos: Vec2,
  vel: Vec2,
  rng = Math.random,
): AsteroidState {
  return {
    id,
    size,
    pos: { x: pos.x, y: pos.y },
    vel: { x: vel.x, y: vel.y },
    angle: randRange(0, Math.PI * 2, rng),
    spin: randRange(GAME_CONFIG.asteroids.spinRange[0], GAME_CONFIG.asteroids.spinRange[1], rng),
    radius: GAME_CONFIG.asteroids.sizeRadii[size],
    shape: asteroidShape(rng),
  };
}

function randomAsteroidVelocity(size: AsteroidSize, rng = Math.random): Vec2 {
  const [minSpeed, maxSpeed] = GAME_CONFIG.asteroids.baseSpeedBySize[size];
  const dir = randUnitVec(rng);
  const speed = randRange(minSpeed, maxSpeed, rng);
  return scale(dir, speed);
}

export function spawnAsteroidWave(
  startId: number,
  wave: number,
  topology: Topology,
  rng = Math.random,
): { asteroids: AsteroidState[]; nextId: number } {
  const count = Math.min(
    GAME_CONFIG.asteroids.maxWaveLargeCount,
    GAME_CONFIG.asteroids.initialWaveLargeCount + Math.max(0, wave - 1),
  );
  const center = topology.spawnCenter();
  const asteroids: AsteroidState[] = [];
  let nextId = startId;
  let attempts = 0;
  while (asteroids.length < count && attempts < 500) {
    attempts += 1;
    const pos = topology.randomPointInBounds(60, rng);
    if (Math.hypot(pos.x - center.x, pos.y - center.y) < 110) continue;
    const asteroid = createAsteroid(nextId++, 'large', pos, randomAsteroidVelocity('large', rng), rng);
    asteroids.push(asteroid);
  }
  return { asteroids, nextId };
}

export function splitAsteroid(
  asteroid: AsteroidState,
  startId: number,
  rng = Math.random,
): { fragments: AsteroidState[]; nextId: number } {
  const nextSize: Record<AsteroidSize, AsteroidSize | null> = {
    large: 'medium',
    medium: 'small',
    small: null,
  };
  const size = nextSize[asteroid.size];
  if (!size) return { fragments: [], nextId: startId };

  const baseDir = normalize(asteroid.vel.x === 0 && asteroid.vel.y === 0 ? randUnitVec(rng) : asteroid.vel);
  const perpendicular = { x: -baseDir.y, y: baseDir.x };
  const fragments: AsteroidState[] = [];
  let nextId = startId;

  for (const sign of [-1, 1] as const) {
    const jitter = randRange(-0.4, 0.4, rng);
    const dir = normalize({
      x: baseDir.x + perpendicular.x * (sign * 0.9 + jitter),
      y: baseDir.y + perpendicular.y * (sign * 0.9 + jitter),
    });
    const vel = add(
      scale(baseDir, Math.hypot(asteroid.vel.x, asteroid.vel.y) * 0.65),
      scale(dir, GAME_CONFIG.asteroids.splitImpulse),
    );
    const spawnPos = add(asteroid.pos, scale(dir, 8));
    fragments.push(createAsteroid(nextId++, size, spawnPos, vel, rng));
  }

  return { fragments, nextId };
}

export function createUfo(
  id: number,
  type: UfoType,
  topology: Topology,
  rng = Math.random,
): UfoState {
  const { point, inward } = topology.pointOnRandomEdge(rng);
  const jitter = randRange(-0.9, 0.9, rng);
  const dir = normalize({
    x: inward.x * Math.cos(jitter) - inward.y * Math.sin(jitter),
    y: inward.x * Math.sin(jitter) + inward.y * Math.cos(jitter),
  });
  const speed = randRange(GAME_CONFIG.ufo.speedRange[0], GAME_CONFIG.ufo.speedRange[1], rng);
  return {
    id,
    type,
    pos: add(point, scale(inward, 8)),
    vel: scale(dir, speed),
    radius: type === 'large' ? GAME_CONFIG.ufo.largeRadius : GAME_CONFIG.ufo.smallRadius,
    courseTimer: randRange(GAME_CONFIG.ufo.courseChangeInterval[0], GAME_CONFIG.ufo.courseChangeInterval[1], rng),
    fireCooldown:
      type === 'large'
        ? randRange(GAME_CONFIG.ufo.fireCooldownLarge[0], GAME_CONFIG.ufo.fireCooldownLarge[1], rng)
        : randRange(GAME_CONFIG.ufo.fireCooldownSmall[0], GAME_CONFIG.ufo.fireCooldownSmall[1], rng),
    alive: true,
  };
}

export function randomSafeHyperspacePoint(
  topology: Topology,
  rng = Math.random,
  radius = GAME_CONFIG.player.collisionRadius,
): Vec2 {
  for (let i = 0; i < 100; i += 1) {
    const p = topology.randomPointInBounds(radius + 4, rng);
    if (topology.containsPoint(p, radius + 1)) return p;
  }
  return topology.spawnCenter();
}

export function bulletSpawnFromShip(player: PlayerState): { pos: Vec2; dir: Vec2 } {
  const dir = fromAngle(player.angle);
  return {
    dir,
    pos: add(player.pos, scale(dir, player.radius + 4)),
  };
}

export const ASTEROID_SIZES: AsteroidSize[] = ['large', 'medium', 'small'];
export const UFO_TYPES: UfoType[] = ['large', 'small'];
export const randomAsteroidSize = (rng = Math.random): AsteroidSize => randChoice(ASTEROID_SIZES, rng);
export const randomUfoType = (rng = Math.random): UfoType => randChoice(UFO_TYPES, rng);
