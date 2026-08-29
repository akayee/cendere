// T1 mob FSM'i: boşta/dolan → kovala → eve dön (ARCHITECTURE.md §5, sıra 1).
// Moblar da Intent üretir: sim'in gözünde oyuncudan farkı yok (§4).

import { distSq } from '../../core/vec2.js';
import { range } from '../../core/rng.js';
import { SIM } from '../../data/balance.js';

export function aiMobSystem(world) {
  for (const ent of world.movers) {
    if (!ent.ai || ent.dead) continue;
    const ai = ent.ai;
    const t = ent.transform;

    switch (ai.state) {
      case 'idle': {
        // Dolanma: birkaç saniyede bir ev çevresinde yeni nokta seç
        ai.wanderT -= SIM.DT;
        if (ai.wanderT <= 0) {
          ai.wanderT = range(world.rng, 1.5, 4);
          ai.wanderX = ai.homeX + range(world.rng, -ai.def.wanderRadius, ai.def.wanderRadius);
          ai.wanderY = ai.homeY + range(world.rng, -ai.def.wanderRadius, ai.def.wanderRadius);
        }
        moveToward(ent, ai.wanderX, ai.wanderY, 6);

        // Agresif moblar EN YAKIN oyuncuya (bot dahil) kilitlenir
        if (ai.def.aggroRange > 0) {
          const prey = nearestPlayer(world, t.x, t.y, ai.def.aggroRange);
          if (prey) {
            ai.targetId = prey.id;
            ai.state = 'chase';
          }
        }
        break;
      }

      case 'chase': {
        const target = world.entities.get(ai.targetId);
        if (!target || target.dead) {
          ai.state = 'return';
          ai.targetId = 0;
          break;
        }
        // Tasma: evden çok uzaklaşma
        if (distSq(t.x, t.y, ai.homeX, ai.homeY) > ai.def.leash ** 2) {
          ai.state = 'return';
          ai.targetId = 0;
          break;
        }
        moveToward(ent, target.transform.x, target.transform.y, 0);
        break;
      }

      case 'return': {
        moveToward(ent, ai.homeX, ai.homeY, 8);
        if (distSq(t.x, t.y, ai.homeX, ai.homeY) < 64) ai.state = 'idle';
        break;
      }
    }
  }
}

function nearestPlayer(world, x, y, radius) {
  let best = null;
  let bestDsq = radius * radius;
  for (const other of world.movers) {
    if (other.kind !== 'player' || other.dead) continue;
    const dsq = distSq(x, y, other.transform.x, other.transform.y);
    if (dsq < bestDsq) {
      bestDsq = dsq;
      best = other;
    }
  }
  return best;
}

function moveToward(ent, x, y, stopDist) {
  const dx = x - ent.transform.x;
  const dy = y - ent.transform.y;
  const d = Math.hypot(dx, dy);
  if (d <= stopDist || d < 1) {
    ent.input.moveX = 0;
    ent.input.moveY = 0;
  } else {
    ent.input.moveX = dx / d;
    ent.input.moveY = dy / d;
  }
}
