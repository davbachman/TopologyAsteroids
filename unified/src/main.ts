import './styles.css';
import { attachAdvanceTime } from './core/debug/advanceTime';
import { renderGameToText } from './core/debug/renderGameToText';
import { Game } from './core/game';
import { CanvasRenderer } from './core/render/canvasRenderer';
import { createLandingPage } from './landing';
import { createAnnulusTopology } from './topology/annulus';
import { createOctagonTopology } from './topology/octagon';
import { createRectangleTopology } from './topology/rectangle';
import { createHandleTopology } from './topology/handle';
import { createSphereTopology } from './topology/sphere';
import type { TopologyType } from './topology/topology';
import { createTorusRenderer, type TorusRenderer } from './topology/torus3d';

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

function startSingleCanvasGame(topologyType: Exclude<TopologyType, 'rectangle'>): void {
  const topology = (() => {
    switch (topologyType) {
      case 'octagon':
        return createOctagonTopology(360);
      case 'annulus':
        return createAnnulusTopology(110, 420);
      case 'sphere':
        return createSphereTopology();
      case 'handle':
        return createHandleTopology({ frameInset: 40 });
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
  shell.appendChild(createMenuButton(showLanding));
  shell.appendChild(canvas);
  app!.appendChild(shell);

  const game = new Game(canvas, topology, {
    toggleFullscreen: () => toggleFullscreen(shell),
    onEscape: showLanding,
  });

  currentGame = game;
  game.start();
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

  // Create 3D torus renderer
  let torusRenderer: TorusRenderer;
  try {
    torusRenderer = createTorusRenderer(torusHost, torusTextureCanvas);
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
  if (raw === 'rectangle' || raw === 'annulus' || raw === 'octagon' || raw === 'sphere' || raw === 'handle') {
    return raw;
  }
  if (raw === 'spherical') return 'sphere';
  if (raw === 'genus2-handle' || raw === 'rectangle-handle' || raw === 'handle-rect') return 'handle';
  return null;
}

const initialTopology = parseInitialTopology();
if (initialTopology) {
  startGame(initialTopology);
} else {
  // Start with landing page
  showLanding();
}
