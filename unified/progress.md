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
