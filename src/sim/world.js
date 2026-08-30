// Tek maçın tüm durumu (ARCHITECTURE.md §2). Render/DOM/asset bilgisi YOK.

import { createBus } from '../core/eventBus.js';
import { mulberry32 } from '../core/rng.js';
import { createSpatialHash } from '../core/spatialHash.js';
import { PHYS } from '../data/balance.js';
import { cendereRadiusAt } from '../data/phases.js';
import { generateMap } from './map.js';

export function createWorld(seed) {
  const rng = mulberry32(seed);

  const world = {
    tick: 0,
    rng,
    bus: createBus(),
    /** @type {Map<number, object>} id -> entity */
    entities: new Map(),
    nextId: 1,
    /** hareket eden entity'ler (player, bot, mob) */
    movers: [],
    /** toplanabilir kaynaklar */
    resources: [],
    /** hasat edilen kaynakların yeniden doğum kuyruğu: {resType, x, y, t} */
    respawnQueue: [],
    /** uçan mermiler (ok/büyü topu) */
    projectiles: [],
    /** yerde kalan hasar alanları */
    areas: [],
    /** mob kampları: {x, y, tier, memberIds} — üyesi yaşayan kamp "canlı"dır */
    camps: [],
    /** katı statik gövdeler için geniş faz */
    staticHash: createSpatialHash(PHYS.CELL),
    map: null,
    playerId: 0,
    /** Maç durumu — zoneSystem yönetir (PLAN §2) */
    match: {
      t: 0,
      phaseIndex: 0,
      phase: 'hazirlik',
      cendereR: 99999,
      damageAcc: 0,
      over: false,
    },
    /** Ani Ölüm'de 0.5'e düşer — tüm iyileştirmeler bununla çarpılır */
    healMult: 1,
  };

  world.map = generateMap(rng);
  world.match.cendereR = cendereRadiusAt(0);

  // Statik gövdeleri hash'e yerleştir
  for (const body of world.map.statics) {
    if (body.shape === 'circle') {
      world.staticHash.insert(body, body.x - body.r, body.y - body.r, body.x + body.r, body.y + body.r);
    } else {
      world.staticHash.insert(body, body.minX, body.minY, body.maxX, body.maxY);
    }
  }

  return world;
}

export function addEntity(world, ent) {
  ent.id = world.nextId++;
  world.entities.set(ent.id, ent);
  if (ent.motion) world.movers.push(ent);
  return ent;
}
