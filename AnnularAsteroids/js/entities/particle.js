import { Entity } from './entity.js';

export class Particle extends Entity {
  constructor(r, t, vr, vt, lifetime, color) {
    super(r, t, vr, vt);
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.color = color || '#fff';
  }

  update(dt) {
    super.update(dt);
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.alive = false;
  }

  get alpha() {
    return Math.max(0, this.lifetime / this.maxLifetime);
  }
}
