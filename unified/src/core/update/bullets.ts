import type { Topology } from '../../topology/topology';
import type { BulletState } from '../types';

export function updateBullets(bullets: BulletState[], topology: Topology, dt: number): void {
  for (const bullet of bullets) {
    bullet.prevPos.x = bullet.pos.x;
    bullet.prevPos.y = bullet.pos.y;
    bullet.pos.x += bullet.vel.x * dt;
    bullet.pos.y += bullet.vel.y * dt;
    const beforeWrap = { x: bullet.pos.x, y: bullet.pos.y };
    const wrap = topology.wrapInPlace(bullet.pos);
    bullet.prevPos.x += wrap.offset.x;
    bullet.prevPos.y += wrap.offset.y;
    if (wrap.passes > 0) {
      topology.transformWrappedVelocityInPlace?.(bullet.vel, beforeWrap, bullet.pos);
    }
    bullet.ttl -= dt;
  }
}

export function pruneExpiredBullets(bullets: BulletState[]): BulletState[] {
  return bullets.filter((b) => b.ttl > 0);
}
