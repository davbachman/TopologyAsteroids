import type { GameState } from '../game/types';
import { computeTorusTextureLock } from '../render/torus3d';

interface HookController {
  getState: () => GameState;
  advanceTime: (ms: number) => void;
}

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

export function installTestingHooks(controller: HookController): void {
  window.render_game_to_text = () => {
    const state = controller.getState();
    const torus = computeTorusTextureLock(
      state.ship.x,
      state.ship.y,
      state.worldWidth,
      state.worldHeight
    );

    const payload = {
      mode: state.mode,
      coordinate_system: {
        origin: 'top-left',
        x_axis: 'positive-right',
        y_axis: 'positive-down'
      },
      world: {
        width: state.worldWidth,
        height: state.worldHeight
      },
      player: {
        x: state.ship.x,
        y: state.ship.y,
        vx: state.ship.vx,
        vy: state.ship.vy,
        angle: state.ship.angle,
        invulnerable_ms: state.ship.invulnerableMs,
        alive: state.ship.alive
      },
      asteroids: state.asteroids.map((asteroid) => ({
        id: asteroid.id,
        size: asteroid.size,
        x: asteroid.x,
        y: asteroid.y,
        vx: asteroid.vx,
        vy: asteroid.vy,
        radius: asteroid.radius
      })),
      bullets: state.bullets.map((bullet) => ({
        id: bullet.id,
        x: bullet.x,
        y: bullet.y,
        vx: bullet.vx,
        vy: bullet.vy,
        ttl_ms: bullet.ttlMs
      })),
      score: state.score,
      high_score: state.highScore,
      lives: state.lives,
      level: state.level,
      torus
    };

    return JSON.stringify(payload);
  };

  window.advanceTime = (ms: number) => {
    if (!Number.isFinite(ms)) {
      return;
    }
    controller.advanceTime(Math.max(0, ms));
  };
}
