# TopologyAsteroids (Workspace)

This workspace contains multiple Asteroids variants and experiments:

- `unified/` (canonical): one app with a landing page that launches rectangle/torus, annulus, and octagon/genus-2 modes.
- `Genus2Asteroids/` (thin wrapper): standalone octagon app entrypoint runs the shared `unified` game core/topology.
- `TorusAsteroids/` (standalone app): split-screen torus view app; now shares the torus Three.js renderer implementation with `unified`.
- `AnnularAsteroids/` (legacy/reference): original annulus implementation in plain JS, kept as a behavioral/visual reference.

## Current Unification Direction

- Gameplay engine canonical source: `unified/src/core/*`
- Topology abstractions and implementations: `unified/src/topology/*`
- Shared torus Three.js renderer logic: `unified/src/shared/torusRenderer.ts`

The repository root is not a single Git repo; each standalone app may have its own `.git` history.
