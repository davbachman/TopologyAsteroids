import { rtToXY } from './coordinateTransform.js';
import { ASTEROID_POINTS } from './constants.js';

function checkCollision(entityA, entityB, cx, cy, scale) {
  const posA = rtToXY(entityA.r, entityA.t, cx, cy, scale);
  const posB = rtToXY(entityB.r, entityB.t, cx, cy, scale);
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  const distSq = dx * dx + dy * dy;
  const radiiSum = entityA.collisionRadius + entityB.collisionRadius;
  return distSq < radiiSum * radiiSum;
}

export function processCollisions(ship, bullets, asteroids, cx, cy, scale) {
  const result = {
    newAsteroids: [],
    destroyedBulletIndices: new Set(),
    destroyedAsteroidIndices: new Set(),
    shipHit: false,
    score: 0
  };

  for (let bi = 0; bi < bullets.length; bi++) {
    if (!bullets[bi].alive) continue;
    for (let ai = 0; ai < asteroids.length; ai++) {
      if (!asteroids[ai].alive) continue;
      if (result.destroyedAsteroidIndices.has(ai)) continue;
      if (checkCollision(bullets[bi], asteroids[ai], cx, cy, scale)) {
        result.destroyedBulletIndices.add(bi);
        result.destroyedAsteroidIndices.add(ai);
        result.score += ASTEROID_POINTS[asteroids[ai].size];
        result.newAsteroids.push(...asteroids[ai].split());
        break;
      }
    }
  }

  if (ship.invulnTimer <= 0) {
    for (let ai = 0; ai < asteroids.length; ai++) {
      if (!asteroids[ai].alive) continue;
      if (result.destroyedAsteroidIndices.has(ai)) continue;
      if (checkCollision(ship, asteroids[ai], cx, cy, scale)) {
        result.shipHit = true;
        break;
      }
    }
  }

  return result;
}
