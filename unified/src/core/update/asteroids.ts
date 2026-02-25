import type { Topology } from '../../topology/topology';
import type { AsteroidState } from '../types';

export function updateAsteroids(asteroids: AsteroidState[], topology: Topology, dt: number): void {
  for (const asteroid of asteroids) {
    asteroid.pos.x += asteroid.vel.x * dt;
    asteroid.pos.y += asteroid.vel.y * dt;
    asteroid.angle += asteroid.spin * dt;
    const beforeWrap = { x: asteroid.pos.x, y: asteroid.pos.y };
    const wrap = topology.wrapInPlace(asteroid.pos);
    if (wrap.passes > 0) {
      topology.transformWrappedVelocityInPlace?.(asteroid.vel, beforeWrap, asteroid.pos);
    }
  }
}
