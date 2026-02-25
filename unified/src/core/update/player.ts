import type { InputState, PlayerConfig, PlayerState } from '../types';
import { fromAngle, limitMagnitude } from '../math/vector';

export function updatePlayerMovement(
  player: PlayerState,
  input: InputState,
  config: PlayerConfig,
  dt: number,
): void {
  if (!player.alive) return;

  let rotateDir = 0;
  if (input.left) rotateDir -= 1;
  if (input.right) rotateDir += 1;
  player.angle += rotateDir * config.rotateSpeed * dt;
  player.thrusting = input.thrust;

  if (input.thrust) {
    const thrust = fromAngle(player.angle);
    player.vel.x += thrust.x * config.thrustAccel * dt;
    player.vel.y += thrust.y * config.thrustAccel * dt;
  }

  player.vel.x *= Math.pow(config.damping, dt * 60);
  player.vel.y *= Math.pow(config.damping, dt * 60);
  const limited = limitMagnitude(player.vel, config.maxSpeed);
  player.vel.x = limited.x;
  player.vel.y = limited.y;

  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.blinkPhase += dt * 12;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invulnerableTimer = Math.max(0, player.invulnerableTimer - dt);
}
