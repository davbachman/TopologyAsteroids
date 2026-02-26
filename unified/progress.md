Original prompt: Refactor and unify the code more across the TopologyAsteroids repo (user follow-up: "Just do it all.").

## Progress Log
- Started repo-wide unification pass with `unified/` as the canonical target.
- Added deterministic/debug hooks to `unified` runtime (`window.advanceTime`, `window.render_game_to_text`, `window.gameDebug`) and direct launch via `?mode=`/`?topology=` query param for wrapper apps.
- Ported/added baseline tests in `unified` for collision plus rectangle/annulus/octagon topology behavior.
- Validation: `unified` `npm test` passing (4 files / 15 tests).
- Extracted shared Three.js torus renderer implementation to `unified/src/shared/torusRenderer.ts`; `unified` and `TorusAsteroids` now both use it.
- Converted `Genus2Asteroids/src/main.ts` into a thin wrapper over `unified` core + octagon topology, preserving local fullscreen/debug hooks.
- Validation: `Genus2Asteroids` tests/build pass; `TorusAsteroids` lint/tests/build pass after shared renderer extraction.
- Validation: `unified` build passes; Playwright smoke runs pass in rectangle mode using direct `?mode=rectangle` launch and `render_game_to_text`/`advanceTime` hooks (artifacts in `unified/output/web-game-final/`).
- Added new `sphere` topology mode ("Spherical universe") rendered as two side-by-side disks with seam transfer between disks.
- Extended topology API + core updates to support topology-specific wrap kinematics transforms (velocity/heading) for non-translation seam glueing.
- Validation: `unified` tests/build pass with new `sphere` topology tests (20 total tests); Playwright smoke run on `?mode=sphere` renders and plays (artifacts in `unified/output/web-game-sphere/`).
- Added new `handle` topology mode ("Genus two (rectangle with handle)") with torus rectangle edge wrap plus two circular hole seams that map via vertical-centerline reflection.
- Added handle-topology tests; `unified` test suite now passes 26 tests.
- Validation: `unified` build passes and Playwright smoke run on `?mode=handle` renders/plays (artifacts in `unified/output/web-game-handle/`).

## TODO
- Consider moving `TorusAsteroids` runtime itself to a wrapper over `unified` rectangle mode if preserving v1-specific behavior is no longer required.
- If desired, port standalone app e2e smoke tests to exercise `unified` landing-page mode selection for all topologies.
- Optional next unification step: extract shared gameplay core into a dedicated package/workspace if the nested repos are later merged into one Git repo.
- Sphere mode follow-up ideas: tune seam transformation feel (radial reflection vs alternate identification), add explicit seam visual cues, and balance spawn placement for better early-game distribution across both disks.
- Handle mode follow-up ideas: tune hole size/placement, add stronger seam ghost rendering for clearer hole transfers, and optionally display a short on-screen legend explaining the reflection rule.
- Adjusted rectangle-mode torus 3D texture source to render from a second offscreen rectangle topology sized exactly to the inset playfield (no decorative border/HUD margins), eliminating texture seam gaps caused by mapping the full canvas while gameplay wraps on the inset rectangle.
- Validation: `unified` build passes and manual/Playwright visual check of `?mode=rectangle` confirms torus mapping now corresponds to the area inside the bounding rectangle.
- Added seam identification markers to annulus, octagon, sphere, and handle topologies (boundary arrows/chevrons indicating paired boundaries and orientation).
- Added shared boundary marker helpers in `unified/src/topology/boundaryMarks.ts` to keep topology boundary annotations consistent.
- Validation: `unified` tests/build pass; Playwright visual checks completed for `annulus`, `octagon`, `sphere`, and `handle` modes with markers visible and HUD-safe.
- Updated handle topology to support an inset rectangular playfield (frameInset option) so the wrapped area can be shrunk like rectangle mode while retaining the same canvas size.
- Handle mode now renders a bounding rectangle and boundary markers with distinct counts: single on left/right edges, double on top/bottom edges, and triple on the circular hole seams.
- Wired `handle` mode launch in `main.ts` to use `frameInset: 40`; validated with tests/build and a handle-mode visual screenshot.
- Added `klein` topology mode (Klein Bottle Universe) as a rectangular playfield with a twisted left/right seam: crossing left/right wraps with a 180-degree rotation in the rectangle coordinates (implemented as `y -> -y`).
- Added kinematics transforms and ghost image generation for the twisted seam so bullets/ships preserve consistent motion and wrap rendering near the side seam.
- Added landing page option `6`, `?mode=klein` direct launch, and topology tests; validated with `unified` tests/build and a visual `klein` screenshot showing the requested left/down and right/up side arrows.
