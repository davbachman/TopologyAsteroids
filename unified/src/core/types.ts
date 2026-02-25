export interface Vec2 {
  x: number;
  y: number;
}

export type GameMode = 'boot' | 'start' | 'playing' | 'paused' | 'respawning' | 'gameOver';
export type AsteroidSize = 'large' | 'medium' | 'small';
export type UfoType = 'large' | 'small';
export type ProjectileOwner = 'player' | 'ufo';

export interface PlayerConfig {
  radius: number;
  rotateSpeed: number;
  thrustAccel: number;
  maxSpeed: number;
  damping: number;
  fireCooldown: number;
  bulletSpeed: number;
  bulletTtl: number;
  invulnerabilityTime: number;
  respawnDelay: number;
  hyperspaceInvulnerability: number;
  hyperspaceSafeAttempts: number;
  collisionRadius: number;
}

export interface BulletConfig {
  maxPlayerBullets: number;
  radius: number;
  ufoRadius: number;
  ufoTtl: number;
}

export interface AsteroidConfig {
  sizeRadii: Record<AsteroidSize, number>;
  baseSpeedBySize: Record<AsteroidSize, [number, number]>;
  spinRange: [number, number];
  splitImpulse: number;
  scoreBySize: Record<AsteroidSize, number>;
  initialWaveLargeCount: number;
  maxWaveLargeCount: number;
}

export interface UfoConfig {
  spawnIntervalRange: [number, number];
  largeRadius: number;
  smallRadius: number;
  speedRange: [number, number];
  courseChangeInterval: [number, number];
  fireCooldownLarge: [number, number];
  fireCooldownSmall: [number, number];
  bulletSpeed: number;
  scoreLarge: number;
  scoreSmall: number;
  smallWaveThreshold: number;
}

export interface ScoringConfig {
  extraLifeEvery: number;
  startingLives: number;
}

export interface WaveConfig {
  clearDelay: number;
}

export interface GameConfig {
  fixedDt: number;
  player: PlayerConfig;
  bullets: BulletConfig;
  asteroids: AsteroidConfig;
  ufo: UfoConfig;
  scoring: ScoringConfig;
  wave: WaveConfig;
}

export interface PlayerState {
  id: number;
  pos: Vec2;
  vel: Vec2;
  angle: number;
  radius: number;
  collisionRadius: number;
  alive: boolean;
  fireCooldown: number;
  invulnerableTimer: number;
  blinkPhase: number;
  thrusting: boolean;
}

export interface AsteroidState {
  id: number;
  pos: Vec2;
  vel: Vec2;
  angle: number;
  spin: number;
  radius: number;
  size: AsteroidSize;
  shape: number[];
}

export interface BulletState {
  id: number;
  pos: Vec2;
  prevPos: Vec2;
  vel: Vec2;
  radius: number;
  ttl: number;
  owner: ProjectileOwner;
}

export interface UfoState {
  id: number;
  type: UfoType;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  courseTimer: number;
  fireCooldown: number;
  alive: boolean;
}

export interface AudioState {
  unlocked: boolean;
  muted: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
  firePressed: boolean;
  hyperspacePressed: boolean;
  startPressed: boolean;
  pausePressed: boolean;
  fullscreenPressed: boolean;
  mutePressed: boolean;
  anyPressed: boolean;
  escapePressed: boolean;
}

export interface GameState {
  mode: GameMode;
  tick: number;
  time: number;
  score: number;
  lives: number;
  wave: number;
  nextExtraLifeScore: number;
  player: PlayerState;
  asteroids: AsteroidState[];
  playerBullets: BulletState[];
  ufoBullets: BulletState[];
  ufo: UfoState | null;
  ufoSpawnTimer: number;
  waveClearTimer: number;
  respawnTimer: number;
  startCountdown: number;
  audio: AudioState;
  nextEntityId: number;
  debugLastEvents: string[];
}

export type AudioEventName =
  | 'playerFire'
  | 'asteroidExplosionLarge'
  | 'asteroidExplosionMedium'
  | 'asteroidExplosionSmall'
  | 'shipDeath'
  | 'ufoFire'
  | 'hyperspace'
  | 'extraLife'
  | 'gameOver';

export interface AudioEvent {
  name: AudioEventName;
}
