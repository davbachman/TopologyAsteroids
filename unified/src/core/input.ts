import type { InputState } from './types';

const PREVENT_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Space',
  'KeyA',
  'KeyD',
  'KeyW',
  'ShiftLeft',
  'ShiftRight',
]);

function createInputState(): InputState {
  return {
    left: false,
    right: false,
    thrust: false,
    fire: false,
    firePressed: false,
    hyperspacePressed: false,
    startPressed: false,
    pausePressed: false,
    fullscreenPressed: false,
    mutePressed: false,
    anyPressed: false,
    escapePressed: false,
  };
}

export class InputManager {
  private readonly state: InputState = createInputState();
  private attached = false;
  private readonly onInteraction?: () => void;

  constructor(onInteraction?: () => void) {
    this.onInteraction = onInteraction;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (PREVENT_KEYS.has(event.code)) event.preventDefault();
    const firstPress = !event.repeat;
    if (firstPress) {
      this.state.anyPressed = true;
      this.onInteraction?.();
    }
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.state.thrust = true;
        break;
      case 'Space':
        this.state.fire = true;
        if (firstPress) this.state.firePressed = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        if (firstPress) this.state.hyperspacePressed = true;
        break;
      case 'Enter':
        if (firstPress) this.state.startPressed = true;
        break;
      case 'KeyP':
        if (firstPress) this.state.pausePressed = true;
        break;
      case 'KeyF':
        if (firstPress) this.state.fullscreenPressed = true;
        break;
      case 'KeyM':
        if (firstPress) this.state.mutePressed = true;
        break;
      case 'Escape':
        if (firstPress) this.state.escapePressed = true;
        break;
      default:
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (PREVENT_KEYS.has(event.code)) event.preventDefault();
    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.state.thrust = false;
        break;
      case 'Space':
        this.state.fire = false;
        break;
      default:
        break;
    }
  };

  private onPointerInteraction = (): void => {
    this.onInteraction?.();
  };

  attach(target: Window): void {
    if (this.attached) return;
    target.addEventListener('keydown', this.onKeyDown, { passive: false });
    target.addEventListener('keyup', this.onKeyUp, { passive: false });
    target.addEventListener('pointerdown', this.onPointerInteraction, { passive: true });
    target.addEventListener('mousedown', this.onPointerInteraction, { passive: true });
    target.addEventListener('touchstart', this.onPointerInteraction, { passive: true });
    this.attached = true;
  }

  detach(target: Window): void {
    if (!this.attached) return;
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    target.removeEventListener('pointerdown', this.onPointerInteraction);
    target.removeEventListener('mousedown', this.onPointerInteraction);
    target.removeEventListener('touchstart', this.onPointerInteraction);
    this.attached = false;
  }

  getState(): InputState {
    return this.state;
  }

  endFrame(): void {
    this.state.firePressed = false;
    this.state.hyperspacePressed = false;
    this.state.startPressed = false;
    this.state.pausePressed = false;
    this.state.fullscreenPressed = false;
    this.state.mutePressed = false;
    this.state.anyPressed = false;
    this.state.escapePressed = false;
  }
}
