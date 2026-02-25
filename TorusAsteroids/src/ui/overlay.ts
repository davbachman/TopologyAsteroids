import type { GameState } from '../game/types';

export interface OverlayLine {
  text: string;
  size: number;
}

export function getOverlayLines(state: GameState): OverlayLine[] | null {
  if (state.mode === 'attract') {
    return [
      { text: 'TORUS ASTEROIDS', size: 44 },
      { text: 'Press Any Key To Start', size: 24 },
      { text: 'Arrow Left/Right Rotate  |  Arrow Up Thrust  |  Space Fire', size: 15 },
      { text: 'P Pause  |  R Restart  |  F Fullscreen', size: 15 }
    ];
  }

  if (state.mode === 'paused') {
    return [
      { text: 'PAUSED', size: 40 },
      { text: 'Press P To Resume', size: 19 }
    ];
  }

  if (state.mode === 'game_over') {
    return [
      { text: 'GAME OVER', size: 44 },
      { text: 'Press R Or Any Key To Restart', size: 21 }
    ];
  }

  return null;
}
