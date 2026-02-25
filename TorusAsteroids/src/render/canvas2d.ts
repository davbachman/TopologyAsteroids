import { SHIP_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from '../game/constants';
import type { Asteroid, GameState } from '../game/types';
import { getOverlayLines } from '../ui/overlay';

interface Star {
  x: number;
  y: number;
  brightness: number;
  size: number;
}

export interface CanvasRenderer {
  resizeDisplay: (width: number, height: number) => void;
  render: (state: GameState) => void;
  getSourceCanvas: () => HTMLCanvasElement;
}

function randomFromSeed(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createStars(count: number): Star[] {
  const seededRandom = randomFromSeed(24_604_1985);
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: seededRandom() * WORLD_WIDTH,
      y: seededRandom() * WORLD_HEIGHT,
      brightness: 0.55 + seededRandom() * 0.45,
      size: 2.2 + seededRandom() * 2.1
    });
  }
  return stars;
}

function drawShip(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { ship } = state;
  if (!ship.alive) {
    return;
  }

  const previousAlpha = ctx.globalAlpha;
  if (ship.invulnerableMs > 0) {
    const pulse = 0.48 + 0.32 * (0.5 + 0.5 * Math.sin(ship.invulnerableMs * 0.02));
    ctx.globalAlpha = pulse;
  }

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle + Math.PI * 0.5);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -SHIP_RADIUS - 1);
  ctx.lineTo(SHIP_RADIUS * 0.75, SHIP_RADIUS);
  ctx.lineTo(0, SHIP_RADIUS * 0.45);
  ctx.lineTo(-SHIP_RADIUS * 0.75, SHIP_RADIUS);
  ctx.closePath();
  ctx.stroke();

  if (state.mode === 'playing') {
    const thrusting = Math.abs(ship.vx) + Math.abs(ship.vy) > 0.01;
    if (thrusting) {
      ctx.beginPath();
      ctx.moveTo(-SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.6);
      ctx.lineTo(0, SHIP_RADIUS + 6);
      ctx.lineTo(SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.6);
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.globalAlpha = previousAlpha;
}

function drawBullet(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function asteroidVertices(asteroid: Asteroid): number[] {
  const points: number[] = [];
  const seededRandom = randomFromSeed(asteroid.shapeSeed + 11_791);
  const count = 11;
  for (let i = 0; i < count; i += 1) {
    const variance = 0.74 + seededRandom() * 0.34;
    points.push(variance);
  }
  return points;
}

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid): void {
  const radii = asteroidVertices(asteroid);
  const count = radii.length;

  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.rotation);
  ctx.beginPath();

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = asteroid.radius * radii[i];
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = '#f8f8f8';
  ctx.font = '700 24px "Chakra Petch", "Avenir Next", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${state.score.toString().padStart(5, '0')}`, 24, 36);
  ctx.fillText(`HIGH ${state.highScore.toString().padStart(5, '0')}`, 24, 66);

  ctx.textAlign = 'right';
  ctx.fillText(`LEVEL ${state.level}`, WORLD_WIDTH - 24, 36);
  ctx.fillText(`LIVES ${state.lives}`, WORLD_WIDTH - 24, 66);
}

function drawOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const lines = getOverlayLines(state);
  if (!lines) {
    return;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const totalHeight = lines.reduce((sum, line) => sum + line.size + 10, 0);
  let y = WORLD_HEIGHT * 0.5 - totalHeight * 0.5;

  for (const line of lines) {
    ctx.font = `700 ${line.size}px "Chakra Petch", "Avenir Next", sans-serif`;
    ctx.fillStyle = '#f5f7ff';
    ctx.textAlign = 'center';
    ctx.fillText(line.text, WORLD_WIDTH * 0.5, y + line.size);
    y += line.size + 10;
  }
}

function drawPlayfield(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  stars: Star[]
): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  for (const star of stars) {
    ctx.fillStyle = `rgba(220, 230, 255, ${star.brightness})`;
    const half = star.size * 0.5;
    ctx.fillRect(star.x - half, star.y - half, star.size, star.size);
  }

  ctx.strokeStyle = '#f7f7f7';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#fff';

  for (const asteroid of state.asteroids) {
    drawAsteroid(ctx, asteroid);
  }

  for (const bullet of state.bullets) {
    drawBullet(ctx, bullet.x, bullet.y, bullet.radius);
  }

  drawShip(ctx, state);
}

export function createCanvasRenderer(displayCanvas: HTMLCanvasElement): CanvasRenderer {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = WORLD_WIDTH;
  sourceCanvas.height = WORLD_HEIGHT;
  const hudCanvas = document.createElement('canvas');
  hudCanvas.width = WORLD_WIDTH;
  hudCanvas.height = WORLD_HEIGHT;

  const sourceCtxMaybe = sourceCanvas.getContext('2d');
  const hudCtxMaybe = hudCanvas.getContext('2d');
  const displayCtxMaybe = displayCanvas.getContext('2d');

  if (!sourceCtxMaybe || !hudCtxMaybe || !displayCtxMaybe) {
    throw new Error('Canvas rendering contexts are unavailable.');
  }
  const sourceCtx = sourceCtxMaybe;
  const hudCtx = hudCtxMaybe;
  const displayCtx = displayCtxMaybe;

  const stars = createStars(95);

  function resizeDisplay(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    displayCanvas.width = Math.floor(safeWidth * dpr);
    displayCanvas.height = Math.floor(safeHeight * dpr);
    displayCanvas.style.width = `${safeWidth}px`;
    displayCanvas.style.height = `${safeHeight}px`;

    displayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    displayCtx.imageSmoothingEnabled = true;
  }

  function render(state: GameState): void {
    drawPlayfield(sourceCtx, state, stars);
    hudCtx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawHud(hudCtx, state);
    drawOverlay(hudCtx, state);

    const displayWidth = Number.parseFloat(displayCanvas.style.width || '0') || displayCanvas.width;
    const displayHeight = Number.parseFloat(displayCanvas.style.height || '0') || displayCanvas.height;

    displayCtx.clearRect(0, 0, displayWidth, displayHeight);

    const scale = Math.min(displayWidth / WORLD_WIDTH, displayHeight / WORLD_HEIGHT);
    const drawWidth = WORLD_WIDTH * scale;
    const drawHeight = WORLD_HEIGHT * scale;
    const dx = (displayWidth - drawWidth) * 0.5;
    const dy = (displayHeight - drawHeight) * 0.5;

    displayCtx.drawImage(sourceCanvas, dx, dy, drawWidth, drawHeight);
    displayCtx.drawImage(hudCanvas, dx, dy, drawWidth, drawHeight);
  }

  return {
    resizeDisplay,
    render,
    getSourceCanvas: () => sourceCanvas
  };
}
