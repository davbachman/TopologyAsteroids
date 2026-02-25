import { describe, expect, it } from 'vitest';
import {
  BULLET_RADIUS,
  SHIP_MAX_SPEED,
  SHIP_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../src/game/constants';
import { createInitialState, EMPTY_INPUT, stepSimulation } from '../src/game/sim';
import type { InputState } from '../src/game/types';

function startGame(inputOverrides: Partial<InputState> = {}) {
  const state = createInitialState(0);
  stepSimulation(state, { ...EMPTY_INPUT, anyKeyPressed: true, ...inputOverrides });
  return state;
}

describe('simulation basics', () => {
  it('applies ship thrust and caps velocity', () => {
    const state = startGame();

    for (let i = 0; i < 120; i += 1) {
      stepSimulation(state, { ...EMPTY_INPUT, thrust: true });
    }

    const speed = Math.hypot(state.ship.vx, state.ship.vy);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThanOrEqual(SHIP_MAX_SPEED + 0.001);
  });

  it('wraps ship coordinates on world edges', () => {
    const state = startGame();
    state.ship.x = WORLD_WIDTH - SHIP_RADIUS * 0.2;
    state.ship.y = WORLD_HEIGHT * 0.5;
    state.ship.vx = 380;
    state.ship.vy = 0;

    stepSimulation(state, EMPTY_INPUT);

    expect(state.ship.x).toBeLessThan(20);
    expect(state.ship.x).toBeGreaterThanOrEqual(0);
  });

  it('expires bullets after ttl', () => {
    const state = startGame();

    stepSimulation(state, { ...EMPTY_INPUT, fire: true });
    expect(state.bullets.length).toBe(1);

    for (let i = 0; i < 90; i += 1) {
      stepSimulation(state, EMPTY_INPUT);
    }

    expect(state.bullets.length).toBe(0);
  });

  it('splits large asteroid and updates score on hit', () => {
    const state = startGame();

    state.asteroids = [
      {
        id: 41,
        size: 'large',
        x: 140,
        y: 140,
        vx: 0,
        vy: 0,
        radius: 48,
        rotation: 0,
        spin: 0,
        shapeSeed: 7
      }
    ];
    state.bullets = [
      {
        id: 99,
        x: 140,
        y: 140,
        vx: 0,
        vy: 0,
        radius: BULLET_RADIUS,
        ttlMs: 300
      }
    ];
    state.score = 0;

    stepSimulation(state, EMPTY_INPUT);

    expect(state.score).toBe(20);
    expect(state.asteroids.length).toBe(2);
    expect(state.asteroids.every((asteroid) => asteroid.size === 'medium')).toBe(true);
  });

  it('transitions to game over when lives run out', () => {
    const state = startGame();

    state.lives = 1;
    state.ship.invulnerableMs = 0;
    state.ship.x = 320;
    state.ship.y = 260;
    state.asteroids = [
      {
        id: 900,
        size: 'small',
        x: 320,
        y: 260,
        vx: 0,
        vy: 0,
        radius: 16,
        rotation: 0,
        spin: 0,
        shapeSeed: 11
      }
    ];

    stepSimulation(state, EMPTY_INPUT);

    expect(state.mode).toBe('game_over');
    expect(state.lives).toBe(0);
  });

  it('advances to next level when all asteroids are gone', () => {
    const state = startGame();

    state.asteroids = [];
    const levelBefore = state.level;
    stepSimulation(state, EMPTY_INPUT);

    expect(state.level).toBe(levelBefore + 1);
    expect(state.asteroids.length).toBeGreaterThan(0);
  });
});
