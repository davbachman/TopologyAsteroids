export class InputHandler {
  constructor() {
    this.keys = {};
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  get left() { return this.keys['ArrowLeft'] || this.keys['KeyA']; }
  get right() { return this.keys['ArrowRight'] || this.keys['KeyD']; }
  get thrust() { return this.keys['ArrowUp'] || this.keys['KeyW']; }
  get fire() { return this.keys['Space']; }
  get pause() { return this.keys['KeyP'] || this.keys['Escape']; }
}
