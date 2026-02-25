import { Entity } from './entity.js';
import { BULLET_LIFETIME } from '../constants.js';

export class Bullet extends Entity {
  constructor(r, t, vr, vt) {
    super(r, t, vr, vt);
    this.lifetime = BULLET_LIFETIME;
    this.collisionRadius = 2;
  }

  update(dt) {
    super.update(dt);
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.alive = false;
  }
}
