# DoubleTorusAsteroids

## Status

This standalone app now runs as a thin wrapper over the shared `unified` game core/topology implementation in the parent workspace. The duplicated local engine source has been removed; regression tests now live in `unified/`.

Browser game: a classic Asteroids-style clone with an octagonal playfield and edge wrap-around.

Live app (GitHub Pages): [https://davbachman.github.io/DoubleTorusAsteroids/](https://davbachman.github.io/DoubleTorusAsteroids/)

Thanks to Edmund Harriss for the idea for this app!

## How To Play

- `Enter`: start / restart
- `Left` / `A`: rotate left
- `Right` / `D`: rotate right
- `Up` / `W`: thrust
- `Space`: fire
- `Shift`: hyperspace
- `P`: pause / resume
- `M`: mute audio
- `F`: toggle fullscreen

## Gameplay Notes

- The arena is a regular octagon, not a rectangle.
- Like the original Asteroids, objects wrap when crossing the boundary and reappear on the opposite side.
- The game includes asteroid splitting, score/lives/waves, UFO enemies, and procedural sound effects.

## Local Development

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite (typically `http://localhost:5173/` or the next available port).

## Build

```bash
npm run build
```

The Vite config is set up to use the correct GitHub Pages base path (`/DoubleTorusAsteroids/`) for production builds.
