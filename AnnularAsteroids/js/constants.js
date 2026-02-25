// Coordinate space
export const R_MIN = 1;
export const R_MAX = 4;
export const R_RANGE = R_MAX - R_MIN;

// Canvas
export const CANVAS_SIZE = 900;
export const DISPLAY_SCALE = 100; // pixels per unit radius

// Ship
export const SHIP_THRUST = 2.0;
export const SHIP_ROTATION_SPEED = 4.0;
export const SHIP_FRICTION = 0.98;
export const SHIP_MAX_SPEED = 4.5;
export const SHIP_SIZE = 0.12;
export const SHIP_FIRE_RATE = 0.25;
export const SHIP_INVULN_TIME = 3.0;
export const SHIP_START_R = 2.5;
export const SHIP_START_T = 0;

// Bullets
export const BULLET_SPEED = 6.0;
export const BULLET_LIFETIME = 1.5;
export const MAX_BULLETS = 8;

// Asteroids
export const ASTEROID_SIZES = { LARGE: 0.5, MEDIUM: 0.3, SMALL: 0.15 };
export const ASTEROID_SPEED_RANGE = [0.3, 1.2];
export const ASTEROID_POINTS = { LARGE: 20, MEDIUM: 50, SMALL: 100 };
export const INITIAL_ASTEROID_COUNT = 4;

// Physics
export const FIXED_TIMESTEP = 1 / 60;
