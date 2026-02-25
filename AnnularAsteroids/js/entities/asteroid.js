import { Entity } from './entity.js';
import { ASTEROID_SIZES, ASTEROID_SPEED_RANGE, DISPLAY_SCALE } from '../constants.js';

export class Asteroid extends Entity {
  constructor(r, t, vr, vt, size) {
    super(r, t, vr, vt);
    this.size = size;
    this.radius = ASTEROID_SIZES[size];
    this.collisionRadius = this.radius * DISPLAY_SCALE;
    this.rotationOffset = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.vertices = this._generateVertices();
  }

  _generateVertices() {
    const numVerts = 8 + Math.floor(Math.random() * 5);
    const verts = [];
    for (let i = 0; i < numVerts; i++) {
      const angle = (i / numVerts) * Math.PI * 2;
      const jitter = 0.7 + Math.random() * 0.3;
      verts.push({ localAngle: angle, localRadius: this.radius * jitter });
    }
    return verts;
  }

  update(dt) {
    super.update(dt);
    this.rotationOffset += this.rotationSpeed * dt;
  }

  getLocalVertices() {
    return this.vertices.map(v => {
      const a = v.localAngle + this.rotationOffset;
      return {
        dr: v.localRadius * Math.cos(a),
        dt: v.localRadius * Math.sin(a) / this.r
      };
    });
  }

  split() {
    if (this.size === 'SMALL') return [];
    const newSize = this.size === 'LARGE' ? 'MEDIUM' : 'SMALL';
    const children = [];
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = ASTEROID_SPEED_RANGE[0] +
        Math.random() * (ASTEROID_SPEED_RANGE[1] - ASTEROID_SPEED_RANGE[0]);
      children.push(new Asteroid(
        this.r, this.t,
        this.vr + speed * Math.cos(angle),
        this.vt + speed * Math.sin(angle) / this.r,
        newSize
      ));
    }
    return children;
  }
}
