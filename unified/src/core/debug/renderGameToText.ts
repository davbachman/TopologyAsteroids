import type { GameState } from '../types';

export function renderGameToText(state: GameState): string {
  return JSON.stringify({
    mode: state.mode,
    tick: state.tick,
    score: state.score,
    lives: state.lives,
    wave: state.wave,
    player: {
      x: Number(state.player.pos.x.toFixed(2)),
      y: Number(state.player.pos.y.toFixed(2)),
      vx: Number(state.player.vel.x.toFixed(2)),
      vy: Number(state.player.vel.y.toFixed(2)),
      angle: Number(state.player.angle.toFixed(3)),
      invulnerable: state.player.invulnerableTimer > 0,
      alive: state.player.alive,
    },
    asteroids: state.asteroids.map((a) => ({
      id: a.id,
      size: a.size,
      x: Number(a.pos.x.toFixed(2)),
      y: Number(a.pos.y.toFixed(2)),
      vx: Number(a.vel.x.toFixed(2)),
      vy: Number(a.vel.y.toFixed(2)),
    })),
    playerBullets: state.playerBullets.map((b) => ({
      id: b.id,
      x: Number(b.pos.x.toFixed(2)),
      y: Number(b.pos.y.toFixed(2)),
      vx: Number(b.vel.x.toFixed(2)),
      vy: Number(b.vel.y.toFixed(2)),
      ttl: Number(b.ttl.toFixed(2)),
    })),
    ufo: state.ufo
      ? {
          id: state.ufo.id,
          type: state.ufo.type,
          x: Number(state.ufo.pos.x.toFixed(2)),
          y: Number(state.ufo.pos.y.toFixed(2)),
          vx: Number(state.ufo.vel.x.toFixed(2)),
          vy: Number(state.ufo.vel.y.toFixed(2)),
        }
      : null,
    ufoBullets: state.ufoBullets.map((b) => ({
      id: b.id,
      x: Number(b.pos.x.toFixed(2)),
      y: Number(b.pos.y.toFixed(2)),
      vx: Number(b.vel.x.toFixed(2)),
      vy: Number(b.vel.y.toFixed(2)),
      ttl: Number(b.ttl.toFixed(2)),
    })),
    audio: {
      muted: state.audio.muted,
      unlocked: state.audio.unlocked,
    },
  });
}
