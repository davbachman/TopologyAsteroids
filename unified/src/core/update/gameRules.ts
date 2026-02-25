import { GAME_CONFIG } from '../config';
import type { AsteroidSize, UfoType } from '../types';

export function asteroidScore(size: AsteroidSize): number {
  return GAME_CONFIG.asteroids.scoreBySize[size];
}

export function ufoScore(type: UfoType): number {
  return type === 'large' ? GAME_CONFIG.ufo.scoreLarge : GAME_CONFIG.ufo.scoreSmall;
}
