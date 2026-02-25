import type { AsteroidState, UfoState } from '../types';

export function drawShipWireframe(ctx: CanvasRenderingContext2D, radius: number, thrusting: boolean): void {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(-radius * 0.85, radius * 0.68);
  ctx.lineTo(-radius * 0.35, 0);
  ctx.lineTo(-radius * 0.85, -radius * 0.68);
  ctx.closePath();
  ctx.stroke();

  if (thrusting) {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.75, radius * 0.34);
    ctx.lineTo(-radius * 1.35, 0);
    ctx.lineTo(-radius * 0.75, -radius * 0.34);
    ctx.stroke();
  }
}

export function drawLifeShipIcon(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(-radius * 0.75, radius * 0.55);
  ctx.lineTo(-radius * 0.2, 0);
  ctx.lineTo(-radius * 0.75, -radius * 0.55);
  ctx.closePath();
  ctx.stroke();
}

export function drawAsteroidWireframe(ctx: CanvasRenderingContext2D, asteroid: AsteroidState): void {
  const points = asteroid.shape;
  const count = points.length;
  ctx.beginPath();
  for (let i = 0; i < count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    const r = asteroid.radius * points[i];
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

export function drawUfoWireframe(ctx: CanvasRenderingContext2D, ufo: UfoState): void {
  const r = ufo.radius;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.12);
  ctx.lineTo(-r * 0.45, -r * 0.25);
  ctx.lineTo(r * 0.45, -r * 0.25);
  ctx.lineTo(r, r * 0.12);
  ctx.lineTo(r * 0.45, r * 0.35);
  ctx.lineTo(-r * 0.45, r * 0.35);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.08);
  ctx.quadraticCurveTo(0, -r * 0.62, r * 0.35, -r * 0.08);
  ctx.stroke();
}

export function drawBulletWireframe(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, radius), 0, Math.PI * 2);
  ctx.stroke();
}
