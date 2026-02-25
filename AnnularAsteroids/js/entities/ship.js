import { Entity } from './entity.js';
import { SHIP_SIZE, SHIP_THRUST, SHIP_FRICTION, SHIP_MAX_SPEED, SHIP_FIRE_RATE, SHIP_INVULN_TIME, BULLET_SPEED, DISPLAY_SCALE } from '../constants.js';
import { Bullet } from './bullet.js';

export class Ship extends Entity {
  constructor(r, t) {
    super(r, t, 0, 0);
    this.heading = 0;
    this.thrusting = false;
    this.fireCooldown = 0;
    this.invulnTimer = SHIP_INVULN_TIME;
    this.lives = 3;
    this.collisionRadius = SHIP_SIZE * DISPLAY_SCALE;
  }

  update(dt) {
    if (this.thrusting) {
      this.vr += Math.cos(this.heading) * SHIP_THRUST * dt;
      this.vt += Math.sin(this.heading) * SHIP_THRUST * dt / this.r;
    }

    this.vr *= Math.pow(SHIP_FRICTION, dt * 60);
    this.vt *= Math.pow(SHIP_FRICTION, dt * 60);

    const speed = Math.sqrt(this.vr ** 2 + (this.r * this.vt) ** 2);
    if (speed > SHIP_MAX_SPEED) {
      const factor = SHIP_MAX_SPEED / speed;
      this.vr *= factor;
      this.vt *= factor;
    }

    super.update(dt);

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
  }

  getLocalVertices() {
    const s = SHIP_SIZE;
    const h = this.heading;
    return [
      { dr: s * Math.cos(h), dt: s * Math.sin(h) / this.r },
      { dr: s * Math.cos(h + 2.4), dt: s * Math.sin(h + 2.4) / this.r },
      { dr: s * Math.cos(h - 2.4), dt: s * Math.sin(h - 2.4) / this.r },
    ];
  }

  fire() {
    if (this.fireCooldown > 0) return null;
    this.fireCooldown = SHIP_FIRE_RATE;
    const bulletVr = this.vr + BULLET_SPEED * Math.cos(this.heading);
    const bulletVt = this.vt + BULLET_SPEED * Math.sin(this.heading) / this.r;
    return new Bullet(this.r, this.t, bulletVr, bulletVt);
  }
}
