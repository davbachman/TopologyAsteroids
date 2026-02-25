import './style.css';
import { RetroSynth } from './audio/synth';
import { FIXED_STEP_MS, WORLD_HEIGHT, WORLD_WIDTH } from './game/constants';
import {
  createInitialState,
  stepSimulation,
  stripEdgeInputs
} from './game/sim';
import type { InputState } from './game/types';
import { KeyboardInput } from './input/keyboard';
import { createCanvasRenderer } from './render/canvas2d';
import { createTorusRenderer } from './render/torus3d';
import { installTestingHooks } from './testing/hooks';

const HIGH_SCORE_KEY = 'torus_asteroids_high_score';

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (raw === null) {
      return 0;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      localStorage.removeItem(HIGH_SCORE_KEY);
      return 0;
    }

    return parsed;
  } catch {
    return 0;
  }
}

function saveHighScore(value: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // Ignore storage errors in constrained browsing contexts.
  }
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('App root element not found.');
}

app.innerHTML = `
  <main class="shell" id="shell">
    <section class="unsupported-banner" id="unsupported-banner">
      <h1>Desktop Keyboard Required</h1>
      <p>Torus Asteroids v1 requires a desktop viewport and hardware keyboard.</p>
      <p>Use a larger screen, then reload to continue.</p>
    </section>

    <section class="split-layout" id="split-layout">
      <article class="pane" id="torus-pane">
        <header class="pane-header">Torus Mapping View</header>
        <div class="pane-body">
          <div class="torus-host" id="torus-host"></div>
        </div>
      </article>

      <article class="pane" id="game-pane">
        <header class="pane-header">Asteroids Field</header>
        <div class="pane-body">
          <canvas id="game-canvas" aria-label="Asteroids gameplay canvas"></canvas>
        </div>
      </article>
    </section>
  </main>
`;

const shell = document.querySelector<HTMLElement>('#shell')!;
const splitLayout = document.querySelector<HTMLElement>('#split-layout')!;
const torusPane = document.querySelector<HTMLElement>('#torus-pane')!;
const gamePane = document.querySelector<HTMLElement>('#game-pane')!;
const torusHost = document.querySelector<HTMLDivElement>('#torus-host')!;
const gameCanvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;

const keyboard = new KeyboardInput(window);
const synth = new RetroSynth();
const canvasRenderer = createCanvasRenderer(gameCanvas);
const torusRenderer = (() => {
  try {
    return createTorusRenderer(
      torusHost,
      canvasRenderer.getSourceCanvas(),
      WORLD_WIDTH,
      WORLD_HEIGHT
    );
  } catch (error) {
    console.warn('WebGL unavailable. Torus 3D renderer disabled.', error);
    torusHost.innerHTML =
      '<div class=\"torus-fallback\">WebGL unavailable in this environment.</div>';

    return {
      resize: () => {},
      render: () => {},
      dispose: () => {}
    };
  }
})();

let state = createInitialState(loadHighScore());
let accumulatorMs = 0;
let lastFrameMs = performance.now();
let rafId = 0;
let unsupportedScreen = false;

const narrowQuery = window.matchMedia('(max-width: 980px)');
const touchQuery = window.matchMedia('(pointer: coarse)');

function computeUnsupportedScreen(): boolean {
  return narrowQuery.matches || touchQuery.matches;
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen().catch(() => {});
    return;
  }

  void document.exitFullscreen().catch(() => {});
}

function handleEvents(events: ReturnType<typeof stepSimulation>, input: InputState): void {
  synth.setThrust(state.mode === 'playing' && input.thrust);

  if (events.fired) {
    synth.fire();
  }

  for (let i = 0; i < events.explosions; i += 1) {
    synth.explosion();
  }

  if (events.beat) {
    synth.beat();
  }

  if (events.highScoreUpdated) {
    saveHighScore(state.highScore);
  }
}

function stepFixed(input: InputState): void {
  const events = stepSimulation(state, input, FIXED_STEP_MS);
  handleEvents(events, input);
}

function runSimulationForMs(ms: number, firstInput: InputState): void {
  const heldInput = stripEdgeInputs(firstInput);
  const steps = Math.max(1, Math.round(ms / FIXED_STEP_MS));

  for (let i = 0; i < steps; i += 1) {
    stepFixed(i === 0 ? firstInput : heldInput);
  }
}

function consumeInput(): InputState {
  const input = keyboard.consume();

  if (input.fullscreenPressed) {
    toggleFullscreen();
  }

  if (input.anyKeyPressed) {
    synth.unlock();
  }

  return input;
}

function resizeViews(): void {
  if (unsupportedScreen) {
    return;
  }

  const gameBody = gamePane.querySelector<HTMLElement>('.pane-body');
  const torusBody = torusPane.querySelector<HTMLElement>('.pane-body');
  if (!gameBody || !torusBody) {
    return;
  }

  canvasRenderer.resizeDisplay(gameBody.clientWidth, gameBody.clientHeight);
  torusRenderer.resize(torusBody.clientWidth, torusBody.clientHeight);
}

function renderFrame(): void {
  if (unsupportedScreen) {
    return;
  }

  canvasRenderer.render(state);
  torusRenderer.render(state.ship.x, state.ship.y);
}

function applySupportMode(): void {
  unsupportedScreen = computeUnsupportedScreen();
  shell.classList.toggle('is-unsupported', unsupportedScreen);

  if (unsupportedScreen) {
    synth.setThrust(false);
    return;
  }

  resizeViews();
  renderFrame();
}

function frame(now: number): void {
  const delta = Math.min(120, now - lastFrameMs);
  lastFrameMs = now;

  const input = consumeInput();
  if (!unsupportedScreen) {
    accumulatorMs += delta;
    let usedInput = false;

    while (accumulatorMs >= FIXED_STEP_MS) {
      stepFixed(usedInput ? stripEdgeInputs(input) : input);
      usedInput = true;
      accumulatorMs -= FIXED_STEP_MS;
    }

    if (!usedInput) {
      synth.setThrust(state.mode === 'playing' && input.thrust);
    }

    renderFrame();
  }

  rafId = requestAnimationFrame(frame);
}

function advanceTime(ms: number): void {
  if (unsupportedScreen) {
    return;
  }

  const input = consumeInput();
  runSimulationForMs(ms, input);
  renderFrame();
}

installTestingHooks({
  getState: () => state,
  advanceTime
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing') {
    state.mode = 'paused';
  }

  synth.onVisibilityChange(document.hidden);
});

const onMediaChange = () => applySupportMode();
narrowQuery.addEventListener('change', onMediaChange);
touchQuery.addEventListener('change', onMediaChange);

window.addEventListener('resize', resizeViews);

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(rafId);
  keyboard.destroy();
  torusRenderer.dispose();
});

applySupportMode();
if (!unsupportedScreen) {
  canvasRenderer.render(state);
  torusRenderer.render(state.ship.x, state.ship.y);
}

lastFrameMs = performance.now();
rafId = requestAnimationFrame(frame);
