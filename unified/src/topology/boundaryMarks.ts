import type { Vec2 } from '../core/types';

export function drawChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size = 11,
): void {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  const back = size;
  const half = size * 0.52;

  ctx.beginPath();
  ctx.moveTo(x - ux * back - px * half, y - uy * back - py * half);
  ctx.lineTo(x, y);
  ctx.lineTo(x - ux * back + px * half, y - uy * back + py * half);
  ctx.stroke();
}

export function drawDoubleChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size = 11,
  gap = 18,
): void {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const halfGap = gap * 0.5;
  drawChevron(ctx, x - ux * halfGap, y - uy * halfGap, angle, size);
  drawChevron(ctx, x + ux * halfGap, y + uy * halfGap, angle, size);
}

export function drawCircleTangentMarker(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  theta: number,
  tangentDirection: 1 | -1,
  radialOffset = 0,
  size = 11,
): void {
  const nx = Math.cos(theta);
  const ny = Math.sin(theta);
  const x = center.x + nx * (radius + radialOffset);
  const y = center.y + ny * (radius + radialOffset);
  const angle = theta + (tangentDirection > 0 ? Math.PI / 2 : -Math.PI / 2);
  drawDoubleChevron(ctx, x, y, angle, size);
}

export function drawEdgeMarker(
  ctx: CanvasRenderingContext2D,
  midpoint: Vec2,
  tangent: Vec2,
  inwardNormal: Vec2,
  inwardOffset = 12,
  size = 10,
): void {
  const len = Math.hypot(tangent.x, tangent.y);
  if (len <= 1e-9) return;
  const angle = Math.atan2(tangent.y, tangent.x);
  const x = midpoint.x + inwardNormal.x * inwardOffset;
  const y = midpoint.y + inwardNormal.y * inwardOffset;
  drawDoubleChevron(ctx, x, y, angle, size);
}

