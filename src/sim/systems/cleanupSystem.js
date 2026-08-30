// Ölüleri kaldırır: sim ANINDA öldürür, uğurlamayı render yapar (ARCHITECTURE.md §8b).

import { createLootBag, createEliteBag } from '../entity.js';

export function cleanupSystem(world) {
  for (let i = world.movers.length - 1; i >= 0; i--) {
    const ent = world.movers[i];
    if (!ent.dead) continue;

    const killer = ent.lastHitBy === -1 ? 'Cendere' : (world.entities.get(ent.lastHitBy)?.name ?? null);
    world.bus.emit('entity.died', {
      x: ent.transform.x,
      y: ent.transform.y,
      kind: ent.kind,
      isHuman: ent.id === world.playerId,
      name: ent.name ?? null,
      killerName: killer,
      sprite: ent.render.sprite,
    });

    if (ent.kind === 'player') {
      world.movers.splice(i, 1);
      createLootBag(world, ent); // Ganimet Kesesi düşer (PLAN §9)

      if (ent.id === world.playerId) {
        // İnsan öldü: maç biter (entity kamera için yerinde kalır)
        if (!world.match.over) {
          world.match.over = true;
          world.bus.emit('match.ended', { win: false, reason: 'death' });
        }
      } else {
        world.entities.delete(ent.id);
        // Son hayatta kalan kontrolü
        const alive = world.movers.filter((m) => m.kind === 'player' && !m.dead).length;
        if (alive === 1 && !world.match.over) {
          world.match.over = true;
          world.bus.emit('match.ended', { win: true, reason: 'lastAlive' });
        }
      }
    } else {
      world.movers.splice(i, 1);
      world.entities.delete(ent.id);
      if (ent.eliteDrop) createEliteBag(world, ent); // T3 eliti: Destansı kartlı kese
    }
  }
}
