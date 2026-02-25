import {
  BEAT_INTERVAL_MAX_MS,
  BEAT_INTERVAL_MIN_MS,
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_TTL_MS,
  FIRE_COOLDOWN_MS,
  FIXED_STEP_MS,
  SCORE_FOR_SIZE,
  SHIP_MAX_SPEED,
  SHIP_RADIUS,
  SHIP_RESPAWN_INVULNERABLE_MS,
  SHIP_THRUST,
  SHIP_TURN_SPEED,
  STARTING_LIVES,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './constants';
import { circlesOverlapTorus } from './collision';
import { findSafeShipSpawn, spawnLevelAsteroids, splitAsteroid } from './spawn';
import type { GameMode, GameState, InputState, StepEvents } from './types';

export const EMPTY_INPUT: InputState = {
  rotateLeft: false,
  rotateRight: false,
  thrust: false,
  fire: false,
  pausePressed: false,
  restartPressed: false,
  fullscreenPressed: false,
  anyKeyPressed: false
};

function makeShip(x: number, y: number) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle: -Math.PI * 0.5,
    radius: SHIP_RADIUS,
    invulnerableMs: SHIP_RESPAWN_INVULNERABLE_MS,
    alive: true
  };
}

function createLevelAsteroids(state: GameState, safeX: number, safeY: number): void {
  const spawned = spawnLevelAsteroids(
    state.level,
    state.nextId,
    state.worldWidth,
    state.worldHeight,
    safeX,
    safeY
  );
  state.asteroids = spawned.asteroids;
  state.nextId = spawned.nextId;
  state.totalAsteroidsAtLevelStart = spawned.asteroids.length;
}

export function wrapValue(value: number, extent: number): number {
  let wrapped = value % extent;
  if (wrapped < 0) {
    wrapped += extent;
  }
  return wrapped;
}

export function stripEdgeInputs(input: InputState): InputState {
  return {
    ...input,
    pausePressed: false,
    restartPressed: false,
    fullscreenPressed: false,
    anyKeyPressed: false
  };
}

export function createInitialState(highScore = 0): GameState {
  const ship = makeShip(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5);
  const state: GameState = {
    mode: 'attract',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    ship,
    bullets: [],
    asteroids: [],
    score: 0,
    highScore,
    lives: STARTING_LIVES,
    level: 1,
    fireCooldownMs: 0,
    beatTimerMs: BEAT_INTERVAL_MAX_MS,
    totalAsteroidsAtLevelStart: 0,
    nextId: 1
  };

  createLevelAsteroids(state, ship.x, ship.y);
  return state;
}

function beginRun(state: GameState): void {
  state.mode = 'playing';
  state.score = 0;
  state.lives = STARTING_LIVES;
  state.level = 1;
  state.bullets = [];
  state.fireCooldownMs = 0;
  state.beatTimerMs = BEAT_INTERVAL_MAX_MS;

  const ship = makeShip(state.worldWidth * 0.5, state.worldHeight * 0.5);
  state.ship = ship;
  createLevelAsteroids(state, ship.x, ship.y);
}

function maybeUpdateHighScore(state: GameState, events: StepEvents): void {
  if (state.score > state.highScore) {
    state.highScore = state.score;
    events.highScoreUpdated = true;
  }
}

function createEvents(): StepEvents {
  return {
    fired: false,
    explosions: 0,
    beat: false,
    thrusting: false,
    started: false,
    gameOver: false,
    highScoreUpdated: false,
    modeChanged: null,
    levelUp: false
  };
}

function applyShipControl(state: GameState, input: InputState, dtSeconds: number, events: StepEvents): void {
  const { ship } = state;

  if (input.rotateLeft) {
    ship.angle -= SHIP_TURN_SPEED * dtSeconds;
  }
  if (input.rotateRight) {
    ship.angle += SHIP_TURN_SPEED * dtSeconds;
  }

  if (input.thrust) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dtSeconds;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dtSeconds;
    events.thrusting = true;
  }

  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP_MAX_SPEED) {
    const ratio = SHIP_MAX_SPEED / speed;
    ship.vx *= ratio;
    ship.vy *= ratio;
  }

  ship.x = wrapValue(ship.x + ship.vx * dtSeconds, state.worldWidth);
  ship.y = wrapValue(ship.y + ship.vy * dtSeconds, state.worldHeight);

  ship.invulnerableMs = Math.max(0, ship.invulnerableMs - dtSeconds * 1000);
}

function maybeFireBullet(state: GameState, input: InputState, events: StepEvents): void {
  state.fireCooldownMs = Math.max(0, state.fireCooldownMs - FIXED_STEP_MS);

  if (!(input.fire && state.fireCooldownMs <= 0 && state.ship.alive)) {
    return;
  }

  const spawnDistance = state.ship.radius + 8;
  const bulletX = wrapValue(state.ship.x + Math.cos(state.ship.angle) * spawnDistance, state.worldWidth);
  const bulletY = wrapValue(state.ship.y + Math.sin(state.ship.angle) * spawnDistance, state.worldHeight);
  const inherit = 0.2;

  state.bullets.push({
    id: state.nextId,
    x: bulletX,
    y: bulletY,
    vx: Math.cos(state.ship.angle) * BULLET_SPEED + state.ship.vx * inherit,
    vy: Math.sin(state.ship.angle) * BULLET_SPEED + state.ship.vy * inherit,
    radius: BULLET_RADIUS,
    ttlMs: BULLET_TTL_MS
  });

  state.nextId += 1;
  state.fireCooldownMs = FIRE_COOLDOWN_MS;
  events.fired = true;
}

function updateBullets(state: GameState, dtSeconds: number): void {
  for (const bullet of state.bullets) {
    bullet.x = wrapValue(bullet.x + bullet.vx * dtSeconds, state.worldWidth);
    bullet.y = wrapValue(bullet.y + bullet.vy * dtSeconds, state.worldHeight);
    bullet.ttlMs -= dtSeconds * 1000;
  }

  state.bullets = state.bullets.filter((bullet) => bullet.ttlMs > 0);
}

function updateAsteroids(state: GameState, dtSeconds: number): void {
  for (const asteroid of state.asteroids) {
    asteroid.x = wrapValue(asteroid.x + asteroid.vx * dtSeconds, state.worldWidth);
    asteroid.y = wrapValue(asteroid.y + asteroid.vy * dtSeconds, state.worldHeight);
    asteroid.rotation += asteroid.spin * dtSeconds;
  }
}

function resolveBulletAsteroidCollisions(state: GameState, events: StepEvents): void {
  for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = state.bullets[bulletIndex];
    let hit = false;

    for (
      let asteroidIndex = state.asteroids.length - 1;
      asteroidIndex >= 0;
      asteroidIndex -= 1
    ) {
      const asteroid = state.asteroids[asteroidIndex];
      if (
        !circlesOverlapTorus(
          bullet,
          asteroid,
          state.worldWidth,
          state.worldHeight
        )
      ) {
        continue;
      }

      hit = true;
      state.asteroids.splice(asteroidIndex, 1);
      state.score += SCORE_FOR_SIZE[asteroid.size];
      events.explosions += 1;

      const fragments = splitAsteroid(asteroid, state.nextId);
      state.nextId = fragments.nextId;
      state.asteroids.push(...fragments.asteroids);
      maybeUpdateHighScore(state, events);
      break;
    }

    if (hit) {
      state.bullets.splice(bulletIndex, 1);
    }
  }
}

function handleShipCollision(state: GameState, events: StepEvents): void {
  if (state.ship.invulnerableMs > 0 || !state.ship.alive) {
    return;
  }

  const collided = state.asteroids.some((asteroid) =>
    circlesOverlapTorus(state.ship, asteroid, state.worldWidth, state.worldHeight)
  );

  if (!collided) {
    return;
  }

  events.explosions += 1;
  state.lives -= 1;

  if (state.lives <= 0) {
    state.mode = 'game_over';
    state.ship.alive = false;
    events.gameOver = true;
    events.modeChanged = 'game_over';
    maybeUpdateHighScore(state, events);
    return;
  }

  const spawn = findSafeShipSpawn(state.asteroids, state.worldWidth, state.worldHeight);
  state.ship.x = spawn.x;
  state.ship.y = spawn.y;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.ship.angle = -Math.PI * 0.5;
  state.ship.invulnerableMs = SHIP_RESPAWN_INVULNERABLE_MS;
}

function maybeAdvanceLevel(state: GameState, events: StepEvents): void {
  if (state.asteroids.length > 0) {
    return;
  }

  state.level += 1;
  events.levelUp = true;
  createLevelAsteroids(state, state.ship.x, state.ship.y);
  state.beatTimerMs = BEAT_INTERVAL_MAX_MS;
}

function updateBeat(state: GameState, events: StepEvents): void {
  const divisor = Math.max(1, state.totalAsteroidsAtLevelStart);
  const normalizedRemaining = Math.min(1, state.asteroids.length / divisor);
  const interval =
    BEAT_INTERVAL_MIN_MS +
    (BEAT_INTERVAL_MAX_MS - BEAT_INTERVAL_MIN_MS) * normalizedRemaining;

  state.beatTimerMs -= FIXED_STEP_MS;
  if (state.beatTimerMs <= 0) {
    state.beatTimerMs += interval;
    events.beat = true;
  }
}

export function stepSimulation(
  state: GameState,
  input: InputState,
  dtMs = FIXED_STEP_MS
): StepEvents {
  const events = createEvents();

  if (state.mode === 'attract') {
    if (input.anyKeyPressed) {
      beginRun(state);
      events.started = true;
      events.modeChanged = 'playing';
    }
    return events;
  }

  if (state.mode === 'game_over') {
    if (input.restartPressed || input.anyKeyPressed) {
      beginRun(state);
      events.started = true;
      events.modeChanged = 'playing';
    }
    return events;
  }

  if (input.pausePressed) {
    state.mode = state.mode === 'paused' ? 'playing' : 'paused';
    events.modeChanged = state.mode;
    if (state.mode === 'paused') {
      return events;
    }
  }

  if (state.mode !== 'playing') {
    return events;
  }

  const dtSeconds = dtMs / 1000;
  applyShipControl(state, input, dtSeconds, events);
  maybeFireBullet(state, input, events);
  updateBullets(state, dtSeconds);
  updateAsteroids(state, dtSeconds);
  resolveBulletAsteroidCollisions(state, events);
  handleShipCollision(state, events);

  if (state.mode !== 'playing') {
    return events;
  }

  maybeAdvanceLevel(state, events);
  updateBeat(state, events);
  return events;
}
