// Maç başı mob doğumu (M2: tek dalga; evreye bağlı dalgalar M5-M7'de spawnSystem olur).

import { range, pick } from '../core/rng.js';
import { distSq } from '../core/vec2.js';
import { MAP, SPAWN, ECON } from '../data/balance.js';
import { T1_WEIGHTS, T2_CAMPS, T4_MOB, T4_PER_WAVE, T4_CAP, CAMPS } from '../data/mobs.js';
import { CLASSES } from '../data/classes.js';
import { createMob, createDummy, createResource, createPlayer } from './entity.js';

export function spawnInitialMobs(world) {
  // Antrenman kuklaları: merkez (ileride GZ kasabası) çevresinde halka
  const cx0 = world.map.widthPx / 2;
  const cy0 = world.map.heightPx / 2;
  for (let i = 0; i < SPAWN.DUMMY_COUNT; i++) {
    const a = (i / SPAWN.DUMMY_COUNT) * Math.PI * 2 + Math.PI / 4;
    createDummy(world, cx0 + Math.cos(a) * SPAWN.DUMMY_RING, cy0 + Math.sin(a) * SPAWN.DUMMY_RING);
  }
  const rng = world.rng;
  const map = world.map;
  const cx = map.widthPx / 2;
  const cy = map.heightPx / 2;
  const minD = SPAWN.MIN_DIST_FROM_SPAWN * MAP.TILE;

  // Ağırlıklı seçim listesi
  const bag = [];
  for (const { id, w } of T1_WEIGHTS) for (let i = 0; i < w; i++) bag.push(id);

  let placed = 0;
  let attempts = SPAWN.T1_COUNT * 15;
  while (placed < SPAWN.T1_COUNT && attempts-- > 0) {
    const x = range(rng, (MAP.BORDER + 2) * MAP.TILE, map.widthPx - (MAP.BORDER + 2) * MAP.TILE);
    const y = range(rng, (MAP.BORDER + 2) * MAP.TILE, map.heightPx - (MAP.BORDER + 2) * MAP.TILE);
    if (distSq(x, y, cx, cy) < minD * minD) continue;
    if (inLake(map, x, y)) continue;
    createMob(world, pick(rng, bag), x, y);
    placed++;
  }

  // --- GZ içi pasif kasılma (PLAN §4: güvenli ama yavaş): pasif moblar + garanti kaynak
  const gzR = 224;
  for (let i = 0; i < SPAWN.GZ_MOBS; i++) {
    const a = range(rng, 0, Math.PI * 2);
    const r = range(rng, 75, gzR - 20);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (inLake(map, x, y)) continue;
    createMob(world, rng() < 0.55 ? 'slime' : 'mushroom', x, y); // yalnız pasifler — GZ'de yılan yok
  }
  spawnResourcesInRing(world, 'wood', SPAWN.GZ_WOOD, 70, gzR - 20);
  spawnResourcesInRing(world, 'ore', SPAWN.GZ_ORE, 70, gzR - 20);
  spawnResourcesInRing(world, 'herb', SPAWN.GZ_HERB, 70, gzR - 20);

  // --- Vahşi Bölge kaynakları (verim ×2 orada — asıl servet dışarıda)
  spawnResources(world, 'wood', ECON.WOOD_COUNT);
  spawnResources(world, 'ore', ECON.ORE_COUNT);
  spawnResources(world, 'herb', ECON.HERB_COUNT);
}

function spawnResourcesInRing(world, resType, count, rMin, rMax) {
  const rng = world.rng;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  let placed = 0;
  let attempts = count * 15;
  while (placed < count && attempts-- > 0) {
    const a = range(rng, 0, Math.PI * 2);
    const r = range(rng, rMin, rMax);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (inLake(world.map, x, y)) continue;
    if (nearSolid(world, x, y)) continue;
    createResource(world, resType, x, y);
    placed++;
  }
}

const BOT_NAMES = [
  'Gölge', 'Kartal', 'Bozkurt', 'Şimşek', 'Kuzgun', 'Çakal',
  'Pusucu', 'Demirci', 'Yabani', 'Serçe', 'Poyraz', 'Dağcı',
];

/** Botlar: kasaba çevresine halka şeklinde dağılır, sınıf ve kişilik seed'den (PLAN §10). */
export function spawnBots(world, count = SPAWN.BOT_COUNT) {
  const rng = world.rng;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const classIds = Object.keys(CLASSES);
  const nameOffset = Math.floor(rng() * BOT_NAMES.length);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + range(rng, -0.2, 0.2);
    const r = range(rng, 100, 170);
    const classId = classIds[i % classIds.length];
    const cls = CLASSES[classId];
    createPlayer(world, classId, cx + Math.cos(a) * r, cy + Math.sin(a) * r, {
      bot: true,
      sprite: pick(rng, cls.botSprites),
      personality: { aggro: range(rng, 0.2, 1), greed: range(rng, 0.3, 1) },
      name: BOT_NAMES[(nameOffset + i) % BOT_NAMES.length],
    });
  }
  world.match.playersTotal = count + 1;
}

/**
 * Tek kamp doğur: her zaman O ANKİ cendere çemberinin içinde (%25-70 bandı),
 * GZ'den ve göllerden uzak. Evre ilerledikçe içerik güçlenir (CAMPS.KINDS).
 */
export function spawnCamp(world) {
  const rng = world.rng;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const kinds = CAMPS.KINDS[world.match.phase];
  if (!kinds || kinds.length === 0) return null;

  const maxR = Math.min(world.match.cendereR, world.map.widthPx / 2 - (MAP.BORDER + 3) * MAP.TILE);
  for (let attempt = 0; attempt < 25; attempt++) {
    const a = range(rng, 0, Math.PI * 2);
    const r = range(rng, maxR * CAMPS.RADIAL[0], maxR * CAMPS.RADIAL[1]);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (r < world.match.gzR + CAMPS.GZ_PAD) continue; // GZ'nin dibinde kamp olmaz
    if (inLake(world.map, x, y)) continue;

    const [mobId, count, elite] = pick(rng, kinds);
    const camp = { x, y, tier: elite ? 3 : 2, memberIds: [] };
    for (let i = 0; i < count; i++) {
      const mob = createMob(world, mobId, x + range(rng, -20, 20), y + range(rng, -20, 20));
      if (elite) mob.eliteDrop = true; // ölünce Destansı kartlı kese düşürür
      camp.memberIds.push(mob.id);
    }
    world.camps.push(camp);
    world.bus.emit('camp.spawned', { x, y, tier: camp.tier });
    return camp;
  }
  return null;
}

/** Canlı kamp sayısını evre hedefine tamamla (dalga başına EN FAZLA 1 kamp — yavaş yenilenme). */
export function ensureCamps(world) {
  const target = CAMPS.TARGET[world.match.phase] ?? 0;
  const alive = world.camps.filter((c) => c.memberIds.some((id) => world.entities.has(id))).length;
  if (alive < target) spawnCamp(world);
}

/** Genişleme başlangıcı: ilk kamp dalgası (hepsi cendere içinde). */
export function spawnInitialCamps(world) {
  for (let i = 0; i < T2_CAMPS; i++) spawnCamp(world);
  world.bus.emit('t2.spawned', {});
}

/** T4 Cendere Canavarı dalgası: daralan sınırın hemen içinden sızar (PLAN §8). */
export function spawnT4Wave(world) {
  const rng = world.rng;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const alive = world.movers.filter((m) => m.ai?.def.tier === 4).length;
  const count = Math.min(T4_PER_WAVE, T4_CAP - alive);
  for (let i = 0; i < count; i++) {
    const a = range(rng, 0, Math.PI * 2);
    const r = Math.max(60, world.match.cendereR - 12);
    createMob(world, T4_MOB.id, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  if (count > 0) world.bus.emit('t4.spawned', { count });
}

const nearQuery = [];

/** Nokta bir katı objenin (ağaç/kaya) dibinde mi? Kaynak üstüne doğmasın. */
function nearSolid(world, x, y, pad = 10) {
  world.staticHash.queryRect(x - pad, y - pad, x + pad, y + pad, nearQuery);
  return nearQuery.length > 0;
}

function spawnResources(world, resType, count) {
  const rng = world.rng;
  const map = world.map;
  let placed = 0;
  let attempts = count * 15;
  while (placed < count && attempts-- > 0) {
    const x = range(rng, (MAP.BORDER + 2) * MAP.TILE, map.widthPx - (MAP.BORDER + 2) * MAP.TILE);
    const y = range(rng, (MAP.BORDER + 2) * MAP.TILE, map.heightPx - (MAP.BORDER + 2) * MAP.TILE);
    if (inLake(map, x, y)) continue;
    if (nearSolid(world, x, y)) continue; // ağacın/kayanın üstüne kaynak doğmasın
    // GZ'nin payı ayrıca verildi (spawnResourcesInRing) — Vahşi kaynakları dışarıda kalır
    if (distSq(x, y, map.widthPx / 2, map.heightPx / 2) < (14 * MAP.TILE + 16) ** 2) continue;
    createResource(world, resType, x, y);
    placed++;
  }
}

function inLake(map, x, y) {
  const T = MAP.TILE;
  return map.lakes.some(
    (r) => x > r.tx * T - 12 && x < (r.tx + r.tw) * T + 12 && y > r.ty * T - 12 && y < (r.ty + r.th) * T + 12
  );
}
