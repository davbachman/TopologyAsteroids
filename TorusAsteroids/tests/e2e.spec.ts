import { expect, test, type Page } from '@playwright/test';

type TextState = {
  mode: string;
  bullets: Array<unknown>;
  high_score: number;
  player: { x: number; y: number };
  torus: {
    shipU: number;
    shipV: number;
    lockedU: number;
    lockedV: number;
    offsetX: number;
    offsetY: number;
  };
  world: { width: number; height: number };
};

async function readState(page: Page): Promise<TextState> {
  return page.evaluate(() => {
    const raw = window.render_game_to_text?.() ?? '{}';
    return JSON.parse(raw);
  });
}

test('start, shoot, and pause flow works', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => typeof window.render_game_to_text === 'function' && typeof window.advanceTime === 'function'
  );

  let state = await readState(page);
  expect(state.mode).toBe('attract');

  await page.keyboard.press('ArrowUp');
  await page.evaluate(() => window.advanceTime?.(300));

  state = await readState(page);
  expect(state.mode).toBe('playing');

  await page.keyboard.down('Space');
  await page.evaluate(() => window.advanceTime?.(420));
  await page.keyboard.up('Space');

  state = await readState(page);
  expect(state.bullets.length).toBeGreaterThan(0);

  await page.keyboard.press('KeyP');
  await page.evaluate(() => window.advanceTime?.(100));
  state = await readState(page);
  expect(state.mode).toBe('paused');

  await page.keyboard.press('KeyP');
  await page.evaluate(() => window.advanceTime?.(100));
  state = await readState(page);
  expect(state.mode).toBe('playing');
});

test('loads high score from localStorage and emits torus texture lock values', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('torus_asteroids_high_score', '777');
  });

  await page.goto('/');
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');

  let state = await readState(page);
  expect(state.high_score).toBe(777);

  await page.keyboard.press('ArrowUp');
  await page.evaluate(() => window.advanceTime?.(280));
  state = await readState(page);

  const expectedU = ((state.player.x % state.world.width) + state.world.width) % state.world.width / state.world.width;
  const wrappedY = ((state.player.y % state.world.height) + state.world.height) % state.world.height;
  const expectedV = 1 - wrappedY / state.world.height;
  const expectedOffsetX = ((expectedU - state.torus.lockedU) % 1 + 1) % 1;
  const expectedOffsetY = ((expectedV - state.torus.lockedV) % 1 + 1) % 1;

  expect(state.torus.shipU).toBeCloseTo(expectedU, 5);
  expect(state.torus.shipV).toBeCloseTo(expectedV, 5);
  expect(state.torus.offsetX).toBeCloseTo(expectedOffsetX, 5);
  expect(state.torus.offsetY).toBeCloseTo(expectedOffsetY, 5);
});
