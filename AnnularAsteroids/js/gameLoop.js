import { FIXED_TIMESTEP } from './constants.js';

export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.timestep = FIXED_TIMESTEP;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this._frame = this._frame.bind(this);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now() / 1000;
    requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
  }

  _frame(timestamp) {
    if (!this.running) return;

    const now = timestamp / 1000;
    let frameTime = now - this.lastTime;
    this.lastTime = now;

    if (frameTime > 0.25) frameTime = 0.25;

    this.accumulator += frameTime;

    while (this.accumulator >= this.timestep) {
      this.updateFn(this.timestep);
      this.accumulator -= this.timestep;
    }

    this.renderFn();
    requestAnimationFrame(this._frame);
  }
}
