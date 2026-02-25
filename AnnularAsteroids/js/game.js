import { Renderer } from './renderer.js';
import { Ship } from './entities/ship.js';
import { Asteroid } from './entities/asteroid.js';
import { Particle } from './entities/particle.js';
import { processCollisions } from './collision.js';
import { distSqDisplay } from './coordinateTransform.js';
import {
  R_MIN, R_MAX, SHIP_START_R, SHIP_START_T, SHIP_ROTATION_SPEED,
  SHIP_INVULN_TIME, INITIAL_ASTEROID_COUNT, ASTEROID_SPEED_RANGE,
  MAX_BULLETS
} from './constants.js';
import { resumeAudio, playFire, playThrust, playExplosionSmall, playExplosionLarge, playShipDeath } from './audio.js';

const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  DYING: 'dying',
  GAME_OVER: 'game_over',
  LEVEL_CLEAR: 'level_clear'
};

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.input = input;
    this.renderer = new Renderer(canvas);
    this.state = STATES.TITLE;
    this.score = 0;
    this.level = 1;
    this.ship = null;
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.stateTimer = 0;
    this.pauseDebounce = false;
    this.thrustSoundTimer = 0;
  }

  startNewGame() {
    this.score = 0;
    this.level = 1;
    this.ship = new Ship(SHIP_START_R, SHIP_START_T);
    this.ship.fireCooldown = 0.5; // prevent firing on the same frame as start
    this.bullets = [];
    this.particles = [];
    this.spawnAsteroids();
    this.state = STATES.PLAYING;
  }

  spawnAsteroids() {
    this.asteroids = [];
    const count = INITIAL_ASTEROID_COUNT + (this.level - 1) * 2;
    for (let i = 0; i < count; i++) {
      let r, t;
      do {
        r = R_MIN + 0.5 + Math.random() * (R_MAX - R_MIN - 1);
        t = Math.random() * 2 * Math.PI;
      } while (this.ship && distSqDisplay(r, t, this.ship.r, this.ship.t) < 4);

      const angle = Math.random() * Math.PI * 2;
      const speed = ASTEROID_SPEED_RANGE[0] +
        Math.random() * (ASTEROID_SPEED_RANGE[1] - ASTEROID_SPEED_RANGE[0]);
      this.asteroids.push(new Asteroid(
        r, t,
        speed * Math.cos(angle),
        speed * Math.sin(angle) / r,
        'LARGE'
      ));
    }
  }

  update(dt) {
    switch (this.state) {
      case STATES.TITLE:
        if (this.input.fire) {
          resumeAudio();
          this.startNewGame();
        }
        break;

      case STATES.PLAYING:
        this.updatePlaying(dt);
        break;

      case STATES.DYING:
        this.stateTimer -= dt;
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.alive);
        this.asteroids.forEach(a => a.update(dt));
        if (this.stateTimer <= 0) {
          if (this.ship.lives > 0) {
            this.respawnShip();
            this.state = STATES.PLAYING;
          } else {
            this.state = STATES.GAME_OVER;
            this.stateTimer = 3;
          }
        }
        break;

      case STATES.GAME_OVER:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0 && this.input.fire) {
          this.state = STATES.TITLE;
        }
        break;

      case STATES.LEVEL_CLEAR:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.level++;
          this.spawnAsteroids();
          this.state = STATES.PLAYING;
        }
        break;

      case STATES.PAUSED:
        if (this.input.pause && !this.pauseDebounce) {
          this.state = STATES.PLAYING;
          this.pauseDebounce = true;
        }
        if (!this.input.pause) this.pauseDebounce = false;
        break;
    }
  }

  updatePlaying(dt) {
    if (this.input.pause && !this.pauseDebounce) {
      this.state = STATES.PAUSED;
      this.pauseDebounce = true;
      return;
    }
    if (!this.input.pause) this.pauseDebounce = false;

    if (this.input.left) this.ship.heading -= SHIP_ROTATION_SPEED * dt;
    if (this.input.right) this.ship.heading += SHIP_ROTATION_SPEED * dt;
    this.ship.thrusting = this.input.thrust;

    if (this.input.fire && this.bullets.length < MAX_BULLETS) {
      const bullet = this.ship.fire();
      if (bullet) {
        this.bullets.push(bullet);
        playFire();
      }
    }

    if (this.ship.thrusting) {
      this.thrustSoundTimer -= dt;
      if (this.thrustSoundTimer <= 0) {
        playThrust();
        this.thrustSoundTimer = 0.08;
      }
    }

    this.ship.update(dt);
    this.bullets.forEach(b => b.update(dt));
    this.asteroids.forEach(a => a.update(dt));
    this.particles.forEach(p => p.update(dt));

    this.bullets = this.bullets.filter(b => b.alive);
    this.particles = this.particles.filter(p => p.alive);

    const cx = this.renderer.cx;
    const cy = this.renderer.cy;
    const scale = this.renderer.scale;
    const collisionResult = processCollisions(this.ship, this.bullets, this.asteroids, cx, cy, scale);

    this.score += collisionResult.score;

    for (const bi of collisionResult.destroyedBulletIndices) {
      this.bullets[bi].alive = false;
    }

    for (const ai of collisionResult.destroyedAsteroidIndices) {
      this.spawnExplosion(this.asteroids[ai]);
      if (this.asteroids[ai].size === 'SMALL') {
        playExplosionSmall();
      } else {
        playExplosionLarge();
      }
      this.asteroids[ai].alive = false;
    }
    this.asteroids.push(...collisionResult.newAsteroids);
    this.asteroids = this.asteroids.filter(a => a.alive);
    this.bullets = this.bullets.filter(b => b.alive);

    if (collisionResult.shipHit) {
      this.ship.lives--;
      this.spawnExplosion(this.ship);
      playShipDeath();
      this.state = STATES.DYING;
      this.stateTimer = 2;
    }

    if (this.asteroids.length === 0) {
      this.state = STATES.LEVEL_CLEAR;
      this.stateTimer = 2;
    }
  }

  spawnExplosion(entity) {
    const numParticles = 15;
    for (let i = 0; i < numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push(new Particle(
        entity.r, entity.t,
        speed * Math.cos(angle),
        speed * Math.sin(angle) / entity.r,
        0.5 + Math.random() * 0.5,
        '#fff'
      ));
    }
  }

  respawnShip() {
    this.ship.r = SHIP_START_R;
    this.ship.t = SHIP_START_T;
    this.ship.vr = 0;
    this.ship.vt = 0;
    this.ship.heading = 0;
    this.ship.invulnTimer = SHIP_INVULN_TIME;
  }

  render() {
    this.renderer.clear();

    if (this.state === STATES.TITLE) {
      this.renderer.drawAnnulusBackground();
      this.renderer.drawTitleScreen();
      return;
    }

    this.renderer.drawAnnulusBackground();

    this.renderer.beginAnnulusClip();
    this.asteroids.forEach(a => this.renderer.drawEntityWrapped(a, '#fff', 1.5));
    this.bullets.forEach(b => this.renderer.drawBulletWrapped(b));
    this.particles.forEach(p => this.renderer.drawParticleWrapped(p));
    if (this.state === STATES.PLAYING || this.state === STATES.LEVEL_CLEAR || this.state === STATES.PAUSED) {
      this.renderer.drawShipWrapped(this.ship);
    }
    this.renderer.endAnnulusClip();

    this.renderer.drawHUD(this.score, this.ship ? this.ship.lives : 0, this.level);

    if (this.state === STATES.PAUSED) {
      this.renderer.drawPauseOverlay();
    }
    if (this.state === STATES.GAME_OVER) {
      this.renderer.drawGameOverOverlay(this.score);
    }
    if (this.state === STATES.LEVEL_CLEAR) {
      this.renderer.drawLevelClearOverlay(this.level);
    }
  }
}
