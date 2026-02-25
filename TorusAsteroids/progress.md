Original prompt: Make a split-screen Torus Asteroids web app where right pane is Atari Asteroids-like gameplay with keyboard controls/audio, and left pane is a 3D torus mapped from the game that rotates meridionally/longitudinally so the ship always faces the user.

## Progress Log
- Initialized Vite + TypeScript project scaffold and planned module structure.

## TODO
- Implement simulation, rendering, input, audio, UI overlay, and testing hooks.
- Add unit and e2e tests.
- Run automated tests and web-game Playwright client loop.
- Implemented core modules: simulation, spawning/collision, 2D renderer, torus renderer, keyboard input, procedural audio, overlay UI, and testing hooks.
- Added tests: unit simulation tests, torus mapping math tests, and Playwright e2e spec.

## Notes
- Torus orientation uses hard lock every frame: `rotationY=-2πu`, `rotationX=2π(v-0.5)`.
- High score key: `torus_asteroids_high_score` in localStorage.
- Fixed strict TypeScript issues, Vitest config typing, and e2e helper typing.
- Added WebGL-fallback torus renderer path so the app still initializes hooks/runtime in headless or unsupported GPU contexts.
- Validation completed: `npm run lint`, `npm run test`, `npm run test:e2e`, and skill client run via `$WEB_GAME_CLIENT` with screenshots/state outputs in `output/web-game/`.

## Remaining Suggestions
- If desired, add a headed/manual QA pass to visually inspect the left torus pane in a GPU-backed browser session.
- Consider adding score-increase gameplay assertions in e2e by forcing deterministic asteroid intersections via test-only fixtures.
- Updated torus behavior: mesh is now fixed and texture offset shifts each frame so the ship stays at a fixed lock coordinate on the torus surface.
- Updated 3D view to an elevated camera perspective and fit logic so the torus remains fully in-frame in the left pane.
- Updated left pane styling to use an off-white background behind the torus (including fallback state).
- Updated testing hooks and mapping/e2e tests for texture-lock outputs (`shipU/shipV`, `lockedU/lockedV`, `offsetX/offsetY`).
- Re-ran validation: lint, unit tests, e2e tests, and skill Playwright client loop.
- Tuned torus resting pose to horizontal (`rotationX = π/2`, `rotationY = 0`) and reduced camera elevation for a slight elevated perspective.
- Validation re-run after pose/camera update: lint, unit tests, and Playwright e2e all passing.
- Raised torus camera elevation slightly (height factor from 0.24 to 0.30, initial y from 1.2 to 1.4) for a higher slight-elevation view.
- Raised torus camera elevation further for a stronger tilted look.
- Changed torus ship lock to outside/front target (`lockedU=0.25`, `lockedV=0.0`) so ship maps to the outside-facing viewer side.
- Separated torus texture source from HUD/overlay rendering; score/lives/start text now render only on right pane display, not on torus map texture.
- Re-ran lint, unit tests, e2e tests, and skill client action loop with updated state artifacts.
- Increased torus thickness substantially (`major=1.02`, `tube=0.90`) to reduce outside-surface stretch and better match the right-pane visual ratio.
- Updated split layout to make the right pane wider (`0.56fr 1.44fr`).
- Validation re-run after geometry/layout changes: lint, unit tests, e2e tests all passing.
- Rebalanced torus geometry from extreme near-solid donut to a uniform-looking fat tube (`major=1.20`, `tube=0.66`) to correct visual aspect issues in torus pane.
- Validation re-run: lint and unit tests passing.
- Adjusted ship invulnerability rendering from full blink-hide to pulsing translucency so restart state remains visibly active and does not look like a blank/black pane.
- Reproduced game_over -> R restart flow via Playwright and verified ship/asteroids render immediately after restart.
- Increased star sizes from fixed near-pixel dots to variable multi-pixel quads (`2.2..4.3`) for better visibility.
- Star placement now draws centered quads around each star coordinate instead of top-left anchored tiny pixels.
- Workspace unification update: `src/render/torus3d.ts` now reuses the shared torus renderer implementation from `../unified/src/shared/torusRenderer.ts` while preserving local `computeTorusTextureLock` API and tests.
