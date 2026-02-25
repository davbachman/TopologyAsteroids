import type { GameConfig } from './types';

export const GAME_CONFIG: GameConfig = {
  fixedDt: 1 / 60,
  player: {
    radius: 12,
    rotateSpeed: 4.4,
    thrustAccel: 240,
    maxSpeed: 290,
    damping: 0.995,
    fireCooldown: 0.18,
    bulletSpeed: 430,
    bulletTtl: 1.2,
    invulnerabilityTime: 2.2,
    respawnDelay: 1.3,
    hyperspaceInvulnerability: 0.8,
    hyperspaceSafeAttempts: 18,
    collisionRadius: 11,
  },
  bullets: {
    maxPlayerBullets: 4,
    radius: 2,
    ufoRadius: 2,
    ufoTtl: 1.6,
  },
  asteroids: {
    sizeRadii: {
      large: 40,
      medium: 24,
      small: 14,
    },
    baseSpeedBySize: {
      large: [28, 62],
      medium: [45, 95],
      small: [70, 130],
    },
    spinRange: [-1.2, 1.2],
    splitImpulse: 35,
    scoreBySize: {
      large: 20,
      medium: 50,
      small: 100,
    },
    initialWaveLargeCount: 4,
    maxWaveLargeCount: 10,
  },
  ufo: {
    spawnIntervalRange: [12, 24],
    largeRadius: 16,
    smallRadius: 12,
    speedRange: [70, 120],
    courseChangeInterval: [0.6, 1.6],
    fireCooldownLarge: [1.1, 1.8],
    fireCooldownSmall: [0.6, 1.1],
    bulletSpeed: 190,
    scoreLarge: 200,
    scoreSmall: 1000,
    smallWaveThreshold: 4,
  },
  scoring: {
    extraLifeEvery: 10_000,
    startingLives: 3,
  },
  wave: {
    clearDelay: 1.4,
  },
};
