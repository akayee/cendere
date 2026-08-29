// Mermiler (ok/büyü topu) ve yerde kalan hasar alanları (Ocakçı alevi).
// Mermiler katı engellere çarpar: engel arkasına işlemez (PLAN §5).

import { circleVsCircle, circleVsAabb } from '../../core/collision.js';
import { distSq } from '../../core/vec2.js';
import { SIM } from '../../data/balance.js';
import { applyDamage, canAttack } from './combatSystem.js';

const PROJ_RADIUS = 1.5;
const AREA_TICK = 0.25; // alan hasarı uygulama aralığı

const query = [];

export function projectileSystem(world) {
  // --- Mermiler
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const p = world.projectiles[i];
    p.ttl -= SIM.DT;

    // Şaşmaz Ok: hedefe kilitli — rotayı her tick günceller, engel tanımaz
    if (p.homing) {
      const target = world.entities.get(p.targetId);
      if (!target || target.dead || p.ttl <= 0) {
        world.projectiles.splice(i, 1);
        continue;
      }
      const dx = target.transform.x - p.x;
      const dy = target.transform.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.vx = (dx / d) * p.speed;
      p.vy = (dy / d) * p.speed;
      p.x += p.vx * SIM.DT;
      p.y += p.vy * SIM.DT;
      if (d < target.body.radius + PROJ_RADIUS + 1) {
        const owner = world.entities.get(p.ownerId);
        if (owner) applyDamage(world, target, p.damage, owner);
        world.bus.emit('projectile.hit', { x: p.x, y: p.y, kind: p.kind });
        world.projectiles.splice(i, 1);
      }
      continue;
    }

    p.x += p.vx * SIM.DT;
    p.y += p.vy * SIM.DT;

    let hit = p.ttl <= 0;

    // Katı engel kontrolü
    if (!hit) {
      world.staticHash.queryRect(p.x - 4, p.y - 4, p.x + 4, p.y + 4, query);
      for (const body of query) {
        if (body.type === 'resource') continue; // küçük kaynaklar oku durdurmaz
        const c =
          body.shape === 'circle'
            ? circleVsCircle(p.x, p.y, PROJ_RADIUS, body.x, body.y, body.r)
            : circleVsAabb(p.x, p.y, PROJ_RADIUS, body.minX, body.minY, body.maxX, body.maxY);
        if (c) {
          hit = true;
          break;
        }
      }
    }

    // Canlı hedef kontrolü
    if (!hit) {
      const owner = world.entities.get(p.ownerId);
      for (const other of world.movers) {
        if (other.dead || !other.combat || other.combat.team === p.team) continue;
        if (owner && !canAttack(world, owner, other)) continue;
        const rr = other.body.radius + PROJ_RADIUS;
        if (distSq(p.x, p.y, other.transform.x, other.transform.y) < rr * rr) {
          if (owner) applyDamage(world, other, p.damage, owner);
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      world.bus.emit('projectile.hit', { x: p.x, y: p.y, kind: p.kind });
      world.projectiles.splice(i, 1);
    }
  }

  // --- Hasar alanları
  for (let i = world.areas.length - 1; i >= 0; i--) {
    const a = world.areas[i];
    a.ttl -= SIM.DT;
    a.tickAcc += SIM.DT;
    if (a.tickAcc >= AREA_TICK) {
      a.tickAcc -= AREA_TICK;
      const owner = world.entities.get(a.ownerId);
      for (const other of world.movers) {
        if (other.dead || !other.combat || other.combat.team === a.team) continue;
        if (owner && !canAttack(world, owner, other)) continue;
        if (distSq(a.x, a.y, other.transform.x, other.transform.y) < a.r * a.r) {
          const src = owner ?? { transform: { x: a.x, y: a.y }, combat: { team: a.team } };
          applyDamage(world, other, a.dps * AREA_TICK, src);
        }
      }
    }
    if (a.ttl <= 0) world.areas.splice(i, 1);
  }
}
