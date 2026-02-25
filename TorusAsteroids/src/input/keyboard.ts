import type { InputState } from '../game/types';

const CONTROL_CODES = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Space',
  'KeyP',
  'KeyR',
  'KeyF'
]);

export class KeyboardInput {
  private readonly pressed = new Set<string>();
  private readonly edgePressed = new Set<string>();
  private anyKeyEdge = false;
  private readonly target: Window;

  constructor(target: Window) {
    this.target = target;
    this.target.addEventListener('keydown', this.onKeyDown, { passive: false });
    this.target.addEventListener('keyup', this.onKeyUp, { passive: false });
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) {
      this.anyKeyEdge = true;
    }

    if (!CONTROL_CODES.has(event.code)) {
      return;
    }

    if (!event.repeat) {
      this.edgePressed.add(event.code);
    }

    this.pressed.add(event.code);
    event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (!CONTROL_CODES.has(event.code)) {
      return;
    }

    this.pressed.delete(event.code);
    event.preventDefault();
  };

  consume(): InputState {
    const input: InputState = {
      rotateLeft: this.pressed.has('ArrowLeft'),
      rotateRight: this.pressed.has('ArrowRight'),
      thrust: this.pressed.has('ArrowUp'),
      fire: this.pressed.has('Space'),
      pausePressed: this.edgePressed.has('KeyP'),
      restartPressed: this.edgePressed.has('KeyR'),
      fullscreenPressed: this.edgePressed.has('KeyF'),
      anyKeyPressed: this.anyKeyEdge
    };

    this.edgePressed.clear();
    this.anyKeyEdge = false;
    return input;
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
  }
}
