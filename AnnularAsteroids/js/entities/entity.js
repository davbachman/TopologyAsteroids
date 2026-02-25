import { rtToXY, wrapAngle, wrapRadius } from '../coordinateTransform.js';

export class Entity {
  constructor(r, t, vr, vt) {
    this.r = r;
    this.t = t;
    this.vr = vr || 0;
    this.vt = vt || 0;
    this.alive = true;
    this.collisionRadius = 0;
  }

  update(dt) {
    this.r += this.vr * dt;
    this.t += this.vt * dt;
    this.t = wrapAngle(this.t);
    this.r = wrapRadius(this.r);
  }

  getDisplayPosition(cx, cy, scale) {
    return rtToXY(this.r, this.t, cx, cy, scale);
  }

  getDisplayVertices(cx, cy, scale) {
    const verts = this.getLocalVertices();
    return verts.map(v => {
      const vr = this.r + v.dr;
      const vt = this.t + v.dt;
      return rtToXY(vr, vt, cx, cy, scale);
    });
  }

  getLocalVertices() {
    return [];
  }
}
