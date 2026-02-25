import type { Topology } from '../../topology/topology';
import { GAME_CONFIG } from '../config';
import { randRange, randSign } from '../math/random';
import { normalize, scale } from '../math/vector';
import type { UfoState } from '../types';

export function updateUfoMovement(ufo: UfoState, topology: Topology, dt: number): void {
  ufo.pos.x += ufo.vel.x * dt;
  ufo.pos.y += ufo.vel.y * dt;
  const beforeWrap = { x: ufo.pos.x, y: ufo.pos.y };
  const wrap = topology.wrapInPlace(ufo.pos);
  if (wrap.passes > 0) {
    topology.transformWrappedVelocityInPlace?.(ufo.vel, beforeWrap, ufo.pos);
  }
  ufo.courseTimer -= dt;
  ufo.fireCooldown -= dt;
}

export function retargetUfoCourse(ufo: UfoState, rng = Math.random): void {
  const speed = Math.hypot(ufo.vel.x, ufo.vel.y) || randRange(GAME_CONFIG.ufo.speedRange[0], GAME_CONFIG.ufo.speedRange[1], rng);
  const toCenter = normalize({ x: -ufo.pos.x, y: -ufo.pos.y });
  const lateral = { x: -toCenter.y * randSign(rng), y: toCenter.x * randSign(rng) };
  const mix = ufo.type === 'large' ? 0.85 : 0.45;
  const dir = normalize({ x: toCenter.x * mix + lateral.x * (1 - mix), y: toCenter.y * mix + lateral.y * (1 - mix) });
  ufo.vel = scale(dir, speed);
  ufo.courseTimer = randRange(GAME_CONFIG.ufo.courseChangeInterval[0], GAME_CONFIG.ufo.courseChangeInterval[1], rng);
}
