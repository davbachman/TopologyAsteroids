import { GAME_CONFIG } from '../config';

export function computeWaveLargeCount(wave: number): number {
  return Math.min(
    GAME_CONFIG.asteroids.maxWaveLargeCount,
    GAME_CONFIG.asteroids.initialWaveLargeCount + Math.max(0, wave - 1),
  );
}
