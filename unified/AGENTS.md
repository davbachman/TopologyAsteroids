# Topology Asteroids

Classic Asteroids reimagined on different topological surfaces. One unified codebase supports multiple game modes, each played on a different 2-manifold. A landing page lets users pick the universe.

## Tech Stack

- **Language**: TypeScript (strict)
- **Build**: Vite + `tsc`
- **3D**: Three.js (used only for the torus visualization in rectangle mode)
- **Audio**: Web Audio API with procedural synthesis (no audio files)
- **Rendering**: HTML5 Canvas 2D (all gameplay), WebGL (3D torus only)
- **No framework** — vanilla DOM manipulation

## Commands

```bash
npm run dev      # Start dev server (port 5174)
npm run build    # Type-check + production build (tsc -b && vite build)
npx tsc --noEmit # Type-check only (fastest way to verify changes compile)
```

## Architecture

### Core Abstraction: `Topology` Interface

The entire architecture revolves around `src/topology/topology.ts`. This interface encapsulates everything that differs between game modes:

- **`wrapInPlace(point, vel?)`** — Wraps position (and optionally velocity) when an entity crosses a boundary. Returns an offset for bullet collision adjustment.
- **`getGhostOffsets(point, radius)`** — Returns displacement vectors for rendering entities near boundaries that visually wrap through edges.
- **`buildClipPath(ctx)`** / **`drawBoundary(ctx)`** — Define the visible play area.
- **`containsPoint`**, **`randomPointInBounds`**, **`pointOnRandomEdge`**, **`spawnCenter`** — Spatial queries for spawning and collision.

The game engine (`src/core/`) is 100% topology-agnostic. Physics is always `pos += vel * dt` then `topology.wrapInPlace(pos)`.

### Game Modes (Topologies)

| File | Surface | Play Area | Coordinates |
|------|---------|-----------|-------------|
| `topology/rectangle.ts` | Torus (T2) | Rectangle with opposite edges identified | Centered: x in [-512, 512], y in [-384, 384] |
| `topology/annulus.ts` | Torus (T2) | Annular ring, inner/outer boundary identified | Centered Cartesian, polar for wrapping |
| `topology/octagon.ts` | Genus-2 surface | Regular octagon with opposite edges identified | Centered, 4 normal vectors for portal wrapping |
| `topology/sphere.ts` | Sphere (S2) | Two side-by-side disks with boundary identified | Centered, velocity reflection on crossing |

Rectangle mode also has a split-screen 3D torus visualization (`topology/torus3d.ts`) using Three.js.

### Source Layout

```
src/
  main.ts              # Entry point — landing page ↔ game transitions
  landing.ts           # Landing page UI with topology selection
  styles.css           # All CSS (landing, game-shell, split-screen)

  core/                # Topology-agnostic game engine
    game.ts            # Game class — orchestrates update/render loop
    types.ts           # All type definitions (GameState, entities, etc.)
    config.ts          # Physics constants (speeds, cooldowns, thresholds)
    state.ts           # Factory for initial GameState
    input.ts           # Keyboard input manager
    loop.ts            # Fixed-step game loop (60Hz)
    collision.ts       # Circle-circle / segment-circle overlap tests
    spawn.ts           # Entity spawning (asteroids, UFOs, bullets, hyperspace)
    math/vector.ts     # Vec2 operations (add, scale, normalize, dot, etc.)
    math/random.ts     # Random utilities
    audio/audioEngine.ts  # Web Audio procedural synthesis engine
    audio/sfx.ts       # Sound effect dispatch
    render/canvasRenderer.ts  # 2D canvas renderer (delegates to topology for clipping/ghosts)
    render/wireframes.ts      # Ship, asteroid, UFO, bullet wireframe drawing
    update/player.ts   # Player movement physics
    update/asteroids.ts # Asteroid movement + wrapping
    update/bullets.ts  # Bullet movement + wrapping + expiry
    update/ufo.ts      # UFO movement + wrapping + AI
    update/gameRules.ts # Scoring rules
    update/waves.ts    # Wave progression

  topology/            # Topology implementations
    topology.ts        # Topology interface + TopologyType union
    rectangle.ts       # Torus on rectangle
    annulus.ts         # Torus on annular ring
    octagon.ts         # Genus-2 on octagon
    sphere.ts          # Sphere on two disks
    torus3d.ts         # Three.js 3D torus renderer (rectangle mode only)
```

### Key Patterns

**Adding a new topology:**
1. Create `src/topology/newname.ts` exporting `createNewNameTopology()` that returns a `Topology` object
2. Add the name to `TopologyType` in `topology.ts`
3. Add a button in `landing.ts`
4. Add the creation case in `main.ts` → `startSingleCanvasGame()`
5. If the canvas isn't square, add CSS for the aspect ratio in `styles.css`

**Coordinate system:** All topologies use centered Cartesian coordinates with origin at (0, 0). The renderer translates to canvas center when `topology.centered` is true (all current topologies).

**Entity lifecycle:** `pos += vel * dt` → `topology.wrapInPlace(pos, vel)` → collision checks → render with ghost offsets. The `wrapInPlace` optional `vel` parameter is used by topologies that need velocity reflection (e.g., sphere).

**Ghost rendering:** Entities near boundaries are drawn multiple times using offsets from `getGhostOffsets()`. The renderer clips to the topology's `buildClipPath()`, so ghost copies outside the play area are automatically hidden — only the parts that "poke through" from the other side are visible.

**Split-screen layout:** Rectangle mode uses a different DOM structure (`split-shell` with CSS grid) to show the 3D torus alongside the 2D game. An off-screen canvas with `renderWorldOnly()` provides the torus texture without HUD text.

### Game Features (all modes)

- Asteroid waves with progressive difficulty
- UFOs (large and small) with aimed shooting
- Hyperspace (Shift key) — random teleport with risk of death
- Escalating heartbeat audio tied to asteroid count
- Extra lives every 10,000 points
- Pause (P), Fullscreen (F), Mute (M), Escape → menu
