import { GAME_CONFIG } from './config';
import type { GameState, PlayerState } from './types';

function makeInitialPlayer(id: number): PlayerState {
  return {
    id,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    angle: -Math.PI / 2,
    radius: GAME_CONFIG.player.radius,
    collisionRadius: GAME_CONFIG.player.collisionRadius,
    alive: false,
    fireCooldown: 0,
    invulnerableTimer: 0,
    blinkPhase: 0,
    thrusting: false,
  };
}

export function createBaseGameState(): GameState {
  return {
    mode: 'boot',
    tick: 0,
    time: 0,
    score: 0,
    lives: GAME_CONFIG.scoring.startingLives,
    wave: 0,
    nextExtraLifeScore: GAME_CONFIG.scoring.extraLifeEvery,
    player: makeInitialPlayer(1),
    asteroids: [],
    playerBullets: [],
    ufoBullets: [],
    ufo: null,
    ufoSpawnTimer: 10,
    waveClearTimer: 0,
    respawnTimer: 0,
    startCountdown: 0,
    audio: {
      unlocked: false,
      muted: false,
    },
    nextEntityId: 2,
    debugLastEvents: [],
  };
}
