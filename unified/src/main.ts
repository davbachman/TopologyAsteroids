import './styles.css';
import { attachAdvanceTime } from './core/debug/advanceTime';
import { renderGameToText } from './core/debug/renderGameToText';
import { Game } from './core/game';
import { CanvasRenderer } from './core/render/canvasRenderer';
import { createLandingPage } from './landing';
import { createAnnulusTopology } from './topology/annulus';
import { createKleinTopology } from './topology/klein';
import { createOctagonTopology } from './topology/octagon';
import { createProjectiveTopology } from './topology/projective';
import { createRectangleTopology } from './topology/rectangle';
import { createHandleTopology } from './topology/handle';
import { createSphereTopology, SPHERE_DISK_LAYOUT } from './topology/sphere';
import type { TopologyType } from './topology/topology';
import { createTorusRenderer, type TorusRenderer } from './topology/torus3d';
import { createSphereRenderer, type SphereRenderer } from './topology/sphere3d';

declare global {
  interface Window {
    advanceTime: (ms: number) => void;
    render_game_to_text: () => string;
    gameDebug?: {
      getState: () => unknown;
      getGame: () => Game | null;
    };
  }
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app container');

let currentGame: Game | null = null;
let currentTorusRenderer: TorusRenderer | null = null;
let currentSphereRenderer: SphereRenderer | null = null;
let currentLanding: { destroy: () => void } | null = null;
let resizeHandler: (() => void) | null = null;
let rafId = 0;

attachAdvanceTime((ms) => {
  currentGame?.advanceTime(ms);
});

window.render_game_to_text = () => {
  if (!currentGame) {
    return JSON.stringify({ mode: 'landing' });
  }
  return renderGameToText(currentGame.getState());
};

window.gameDebug = {
  getState: () => (currentGame ? structuredClone(currentGame.getState()) : null),
  getGame: () => currentGame,
};

function cleanupGame(): void {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  currentGame?.destroy();
  currentGame = null;
  currentTorusRenderer?.dispose();
  currentTorusRenderer = null;
  currentSphereRenderer?.dispose();
  currentSphereRenderer = null;
  // Clear game DOM
  app!.innerHTML = '';
}

function showLanding(): void {
  cleanupGame();
  currentLanding = createLandingPage(app!, {
    onSelect: startGame,
  });
}

function startGame(topologyType: TopologyType): void {
  currentLanding?.destroy();
  currentLanding = null;

  if (topologyType === 'rectangle') {
    startRectangleGame();
  } else if (topologyType === 'sphere') {
    startSphereGame();
  } else {
    startSingleCanvasGame(topologyType);
  }
}

function createMenuButton(onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.textContent = '← MENU';
  btn.addEventListener('click', onClick);
  return btn;
}

function startSingleCanvasGame(topologyType: Exclude<TopologyType, 'rectangle' | 'sphere'>): void {
  const topology = (() => {
    switch (topologyType) {
      case 'octagon':
        return createOctagonTopology(360);
      case 'annulus':
        return createAnnulusTopology(110, 420);
      case 'handle':
        return createHandleTopology({ frameInset: 40 });
      case 'klein':
        return createKleinTopology(1024, 768, {
          frameInset: 40,
          showIdentificationArrows: true,
        });
      case 'projective':
        return createProjectiveTopology();
    }
  })();

  const shell = document.createElement('div');
  shell.className = 'game-shell';
  const canvas = document.createElement('canvas');
  canvas.width = topology.worldWidth;
  canvas.height = topology.worldHeight;
  canvas.style.maxWidth = '94vw';
  canvas.style.maxHeight = 'calc(100vh - 48px)';
  canvas.style.width = 'auto';
  canvas.style.height = 'auto';
  const stage = document.createElement('div');
  stage.className = 'game-stage';
  stage.appendChild(canvas);
  shell.appendChild(createMenuButton(showLanding));
  shell.appendChild(stage);
  app!.appendChild(shell);

  const game = new Game(canvas, topology, {
    toggleFullscreen: () => toggleFullscreen(shell),
    onEscape: showLanding,
  });

  currentGame = game;
  game.start();
}

function startSphereGame(): void {
  const topology = createSphereTopology();
  const sphereTextureTopology = {
    ...topology,
    drawBoundary: () => {},
  };

  const shell = document.createElement('main');
  shell.className = 'split-shell sphere-shell';
  shell.id = 'shell';
  shell.innerHTML = `
    <section class="split-layout" id="split-layout">
      <article class="pane" id="sphere-pane">
        <header class="pane-header">Sphere Mapping View</header>
        <div class="pane-body">
          <div class="torus-host" id="sphere-host"></div>
        </div>
      </article>
      <article class="pane" id="game-pane">
        <header class="pane-header">Asteroids Field</header>
        <div class="pane-body">
          <canvas id="sphere-game-canvas" aria-label="Asteroids gameplay canvas"></canvas>
        </div>
      </article>
    </section>
  `;
  shell.appendChild(createMenuButton(showLanding));
  app!.appendChild(shell);

  const sphereHost = shell.querySelector<HTMLDivElement>('#sphere-host')!;
  const gameCanvas = shell.querySelector<HTMLCanvasElement>('#sphere-game-canvas')!;

  const game = new Game(gameCanvas, topology, {
    toggleFullscreen: () => toggleFullscreen(shell),
    onEscape: showLanding,
  });
  currentGame = game;

  const sphereTextureCanvas = document.createElement('canvas');
  sphereTextureCanvas.width = topology.worldWidth;
  sphereTextureCanvas.height = topology.worldHeight;
  const sphereWorldRenderer = new CanvasRenderer(sphereTextureCanvas, sphereTextureTopology);

  const sphereBackOverlayCanvas = document.createElement('canvas');
  sphereBackOverlayCanvas.width = topology.worldWidth;
  sphereBackOverlayCanvas.height = topology.worldHeight;
  const sphereBackOverlayRenderer = new CanvasRenderer(sphereBackOverlayCanvas, topology);
  const sphereBackOverlayCtx = sphereBackOverlayCanvas.getContext('2d');
  if (!sphereBackOverlayCtx) {
    throw new Error('2D context unavailable for sphere back overlay canvas');
  }
  const safeSphereBackOverlayCtx = sphereBackOverlayCtx;

  let sphereRenderer: SphereRenderer;
  try {
    sphereRenderer = createSphereRenderer(
      sphereHost,
      sphereTextureCanvas,
      SPHERE_DISK_LAYOUT,
      sphereBackOverlayCanvas,
    );
    currentSphereRenderer = sphereRenderer;
  } catch (error) {
    console.warn('WebGL unavailable. Sphere 3D renderer disabled.', error);
    sphereHost.innerHTML =
      '<div class="torus-fallback">WebGL unavailable in this environment.</div>';
    currentSphereRenderer = null;
    game.start();
    return;
  }

  function resizeViews(): void {
    const sphereBody = shell.querySelector<HTMLElement>('#sphere-pane .pane-body');
    if (!sphereBody) return;
    sphereRenderer.resize(sphereBody.clientWidth, sphereBody.clientHeight);
  }

  resizeHandler = resizeViews;
  window.addEventListener('resize', resizeViews);

  game.start();

  function sphereFrame(): void {
    if (!currentGame) return;
    const state = currentGame.getState();
    sphereWorldRenderer.renderWorldOnly(state);
    safeSphereBackOverlayCtx.clearRect(0, 0, sphereBackOverlayCanvas.width, sphereBackOverlayCanvas.height);
    sphereBackOverlayRenderer.renderShiftedEntityGhosts(
      state,
      { x: 0, y: 0 },
      0.55,
      'source-over',
    );
    sphereRenderer.render();
    rafId = requestAnimationFrame(sphereFrame);
  }

  requestAnimationFrame(() => {
    resizeViews();
    sphereFrame();
  });
}

function startRectangleGame(): void {
  const frameInset = 40;
  const topology = createRectangleTopology(1024, 768, {
    frameInset,
    showIdentificationArrows: true,
  });
  const torusTextureTopology = createRectangleTopology(
    topology.worldWidth - frameInset * 2,
    topology.worldHeight - frameInset * 2,
    {
      showIdentificationArrows: true,
    },
  );

  // Build split-screen layout
  const shell = document.createElement('main');
  shell.className = 'split-shell';
  shell.id = 'shell';
  shell.innerHTML = `
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
  `;
  shell.appendChild(createMenuButton(showLanding));
  app!.appendChild(shell);

  const torusHost = shell.querySelector<HTMLDivElement>('#torus-host')!;
  const gameCanvas = shell.querySelector<HTMLCanvasElement>('#game-canvas')!;

  const game = new Game(gameCanvas, topology, {
    toggleFullscreen: () => toggleFullscreen(shell),
    onEscape: showLanding,
  });
  currentGame = game;

  // Create an off-screen canvas for the torus texture (world only, no HUD/text)
  const torusTextureCanvas = document.createElement('canvas');
  torusTextureCanvas.width = torusTextureTopology.worldWidth;
  torusTextureCanvas.height = torusTextureTopology.worldHeight;
  const torusWorldRenderer = new CanvasRenderer(torusTextureCanvas, torusTextureTopology);
  const torusBackOverlayCanvas = document.createElement('canvas');
  torusBackOverlayCanvas.width = torusTextureTopology.worldWidth;
  torusBackOverlayCanvas.height = torusTextureTopology.worldHeight;
  const torusBackOverlayRenderer = new CanvasRenderer(torusBackOverlayCanvas, torusTextureTopology);
  const torusBackOverlayCtx = torusBackOverlayCanvas.getContext('2d');
  if (!torusBackOverlayCtx) {
    throw new Error('2D context unavailable for torus back overlay canvas');
  }
  const safeBackOverlayCtx = torusBackOverlayCtx;

  // Create 3D torus renderer
  let torusRenderer: TorusRenderer;
  try {
    torusRenderer = createTorusRenderer(torusHost, torusTextureCanvas, torusBackOverlayCanvas);
    currentTorusRenderer = torusRenderer;
  } catch (error) {
    console.warn('WebGL unavailable. Torus 3D renderer disabled.', error);
    torusHost.innerHTML =
      '<div class="torus-fallback">WebGL unavailable in this environment.</div>';
    currentTorusRenderer = null;
    game.start();
    return;
  }

  // Resize handler
  function resizeViews(): void {
    const torusBody = shell.querySelector<HTMLElement>('#torus-pane .pane-body');
    if (!torusBody) return;
    torusRenderer.resize(torusBody.clientWidth, torusBody.clientHeight);
  }

  resizeHandler = resizeViews;
  window.addEventListener('resize', resizeViews);

  game.start();

  // Render loop for torus sync — render world-only to the texture canvas
  function torusFrame(): void {
    if (!currentGame) return;
    const state = currentGame.getState();
    torusWorldRenderer.renderWorldOnly(state);
    safeBackOverlayCtx.clearRect(0, 0, torusBackOverlayCanvas.width, torusBackOverlayCanvas.height);
    torusBackOverlayRenderer.renderShiftedEntityGhosts(
      state,
      { x: 0, y: 0 },
      0.55,
      'source-over',
    );
    torusRenderer.render();
    rafId = requestAnimationFrame(torusFrame);
  }

  // Initial sizing
  requestAnimationFrame(() => {
    resizeViews();
    torusFrame();
  });
}

async function toggleFullscreen(element: HTMLElement): Promise<void> {
  if (!document.fullscreenElement) {
    await element.requestFullscreen().catch(() => {});
  } else {
    await document.exitFullscreen().catch(() => {});
  }
}

function parseInitialTopology(): TopologyType | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('mode') ?? params.get('topology');
  if (raw === 'rectangle' || raw === 'annulus' || raw === 'octagon' || raw === 'sphere' || raw === 'handle' || raw === 'klein' || raw === 'projective') {
    return raw;
  }
  if (raw === 'spherical') return 'sphere';
  if (raw === 'genus2-handle' || raw === 'rectangle-handle' || raw === 'handle-rect') return 'handle';
  if (raw === 'klein-bottle') return 'klein';
  if (raw === 'projective-plane' || raw === 'rp2') return 'projective';
  return null;
}

const initialTopology = parseInitialTopology();
if (initialTopology) {
  startGame(initialTopology);
} else {
  // Start with landing page
  showLanding();
}
