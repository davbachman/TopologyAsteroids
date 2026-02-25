interface Circle {
  x: number;
  y: number;
  radius: number;
}

function torusAxisDistance(a: number, b: number, extent: number): number {
  const raw = Math.abs(a - b);
  return raw > extent / 2 ? extent - raw : raw;
}

export function torusDistanceSquared(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number,
  height: number
): number {
  const dx = torusAxisDistance(ax, bx, width);
  const dy = torusAxisDistance(ay, by, height);
  return dx * dx + dy * dy;
}

export function circlesOverlapTorus(
  a: Circle,
  b: Circle,
  width: number,
  height: number
): boolean {
  const minDistance = a.radius + b.radius;
  return torusDistanceSquared(a.x, a.y, b.x, b.y, width, height) <= minDistance * minDistance;
}
