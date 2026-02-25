export const TAU = Math.PI * 2;

export const WORLD_WIDTH = 1024;
export const WORLD_HEIGHT = 768;
export const FIXED_STEP_MS = 1000 / 60;

export const STARTING_LIVES = 3;

export const SHIP_RADIUS = 14;
export const SHIP_TURN_SPEED = Math.PI * 1.85;
export const SHIP_THRUST = 330;
export const SHIP_MAX_SPEED = 430;
export const SHIP_RESPAWN_INVULNERABLE_MS = 1800;

export const BULLET_RADIUS = 2.5;
export const BULLET_SPEED = 590;
export const BULLET_TTL_MS = 1300;
export const FIRE_COOLDOWN_MS = 190;

export const ASTEROID_RADIUS = {
  large: 48,
  medium: 28,
  small: 16
} as const;

export const SCORE_FOR_SIZE = {
  large: 20,
  medium: 50,
  small: 100
} as const;

export const ASTEROID_SPEED_MIN = 28;
export const ASTEROID_SPEED_MAX = 82;

export const BEAT_INTERVAL_MAX_MS = 950;
export const BEAT_INTERVAL_MIN_MS = 290;

export const RESPAWN_SAFE_RADIUS = 190;
