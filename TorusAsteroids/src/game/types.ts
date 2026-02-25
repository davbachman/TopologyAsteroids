export type GameMode = 'attract' | 'playing' | 'paused' | 'game_over';

export type AsteroidSize = 'large' | 'medium' | 'small';

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  invulnerableMs: number;
  alive: boolean;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ttlMs: number;
}

export interface Asteroid {
  id: number;
  size: AsteroidSize;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  spin: number;
  shapeSeed: number;
}

export interface GameState {
  mode: GameMode;
  worldWidth: number;
  worldHeight: number;
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  fireCooldownMs: number;
  beatTimerMs: number;
  totalAsteroidsAtLevelStart: number;
  nextId: number;
}

export interface InputState {
  rotateLeft: boolean;
  rotateRight: boolean;
  thrust: boolean;
  fire: boolean;
  pausePressed: boolean;
  restartPressed: boolean;
  fullscreenPressed: boolean;
  anyKeyPressed: boolean;
}

export interface StepEvents {
  fired: boolean;
  explosions: number;
  beat: boolean;
  thrusting: boolean;
  started: boolean;
  gameOver: boolean;
  highScoreUpdated: boolean;
  modeChanged: GameMode | null;
  levelUp: boolean;
}
