// Çarpışma çözümü: mover'ları statik gövdelerden ve birbirinden dışarı iter.

import { circleVsAabb, circleVsCircle } from '../../core/collision.js';
import { clamp } from '../../core/vec2.js';
import { PHYS } from '../../data/balance.js';

const query = [];

export function physicsSystem(world) {
  const { map, staticHash, movers } = world;

  for (let iter = 0; iter < PHYS.ITERATIONS; iter++) {
    for (const ent of movers) {
      const t = ent.transform;
      const r = ent.body.radius;

      // --- Statiklere karşı
      staticHash.queryRect(t.x - r - 8, t.y - r - 8, t.x + r + 8, t.y + r + 8, query);
      for (const body of query) {
        const hit =
          body.shape === 'circle'
            ? circleVsCircle(t.x, t.y, r, body.x, body.y, body.r)
            : circleVsAabb(t.x, t.y, r, body.minX, body.minY, body.maxX, body.maxY);
        if (hit) {
          t.x += hit.nx * hit.depth;
          t.y += hit.ny * hit.depth;
        }
      }

      // --- Harita sınırları
      t.x = clamp(t.x, r, map.widthPx - r);
      t.y = clamp(t.y, r, map.heightPx - r);
    }

    // --- Mover'lar birbirine karşı (yarı yarıya itiş)
    for (let i = 0; i < movers.length; i++) {
      for (let j = i + 1; j < movers.length; j++) {
        const a = movers[i].transform;
        const b = movers[j].transform;
        const hit = circleVsCircle(a.x, a.y, movers[i].body.radius, b.x, b.y, movers[j].body.radius);
        if (hit) {
          const half = hit.depth / 2;
          a.x += hit.nx * half;
          a.y += hit.ny * half;
          b.x -= hit.nx * half;
          b.y -= hit.ny * half;
        }
      }
    }
  }
}
