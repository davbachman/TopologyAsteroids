# Annular Asteroids

## Status

This is the original standalone annulus implementation (plain JavaScript) and is kept as a legacy/reference app. A unified annulus mode also exists in the canonical `unified/` app in the parent workspace.

A clone of the classic 1979 Asteroids arcade game with a twist: the playing field is an annulus (ring) instead of a rectangle. Game physics run in a rectangular (r, t) coordinate space, then everything is mapped onto the annulus via polar coordinates. Objects wrap at both the inner and outer boundaries, just like they wrap at the edges in the original game.

## Play

[**Play Annular Asteroids**](https://davbachman.github.io/AnnulusAsteroids/)

## Controls

| Key | Action |
|-----|--------|
| Arrow Up / W | Thrust |
| Arrow Left / A | Rotate left |
| Arrow Right / D | Rotate right |
| Space | Fire |
| P / Escape | Pause |

Press **Space** on the title screen to start.

## Running Locally

Serve the project directory with any static HTTP server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.
