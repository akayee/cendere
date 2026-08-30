// Maç kurulumu ve mob doğumu: oyuncular harita kenarındaki doğum halkasına
// eşit açılarla dizilir; merkez baştan itibaren kamplarla dolu bir zindandır.
// (Kişisel GZ'ler kaldırıldı — doğum noktası yalnızca başlangıç konumudur.)

import { range, pick } from '../core/rng.js';
import { distSq } from '../core/vec2.js';
import { MAP, SPAWN, ECON } from '../data/balance.js';
import { T1_WEIGHTS, T4_MOB, T4_PER_WAVE, T4_CAP, CAMPS } from '../data/mobs.js';
import { CLASSES } from '../data/classes.js';
import { createMob, createDummy, createResource, createPlayer } from './entity.js';

const BOT_NAMES = [
  'Gölge', 'Kartal', 'Bozkurt', 'Şimşek', 'Kuzgun', 'Çakal',
  'Pusucu', 'Demirci', 'Yabani', 'Serçe', 'Poyraz', 'Dağcı',
];

const PICKUP_TYPES = ['atk', 'armor', 'herb', 'speed'];

/**
 * Maç kurulumu: insan + botlar doğum halkasına eşit açılarla dizilir (yanına
 * 1 kukla + 1 rastgele pickup). Zindan (merkez) Hazırlık hedefine kadar kampla
 * doldurulur. İnsanı döndürür; humanClassId null ise TÜM koltuklar bot olur
 * (denge simülatörü — tools/balance.mjs).
 */
export function spawnMatch(world, humanClassId) {
  const rng = world.rng;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const botsOnly = humanClassId == null;
  const total = botsOnly ? SPAWN.BOT_COUNT : SPAWN.BOT_COUNT + 1;
  const classIds = Object.keys(CLASSES);
  const nameOffset = Math.floor(rng() * BOT_NAMES.length);
  const startAngle = range(rng, 0, Math.PI * 2);
  const spawnPts = []; // T1 mobları doğum noktalarının dibine doğmasın

  let human = null;
  for (let i = 0; i < total; i++) {
    const a = startAngle + (i / total) * Math.PI * 2;
    const gx = cx + Math.cos(a) * SPAWN.RING_RADIUS;
    const gy = cy + Math.sin(a) * SPAWN.RING_RADIUS;
    spawnPts.push({ x: gx, y: gy });

    if (!botsOnly && i === 0) {
      human = createPlayer(world, humanClassId, gx, gy);
    } else {
      const classId = classIds[i % classIds.length];
      const cls = CLASSES[classId];
      createPlayer(world, classId, gx, gy, {
        bot: true,
        sprite: pick(rng, cls.botSprites),
        personality: { aggro: range(rng, 0.2, 1), greed: range(rng, 0.3, 1) },
        name: BOT_NAMES[(nameOffset + i) % BOT_NAMES.length],
      });
    }

    // Başlangıç donanımı: 1 antrenman kuklası + 1 rastgele pickup yakında
    createDummy(world, gx + Math.cos(a) * 30, gy + Math.sin(a) * 30);
    const resA = a + Math.PI / 2;
    createResource(world, pick(rng, PICKUP_TYPES), gx + Math.cos(resA) * 28, gy + Math.sin(resA) * 28);
  }
  world.match.playersTotal = total;

  // --- T1 moblar: her yerde (doğum noktaları hariç) — merkez zaten kamplarla dolu
  const bag = [];
  for (const { id, w } of T1_WEIGHTS) for (let i = 0; i < w; i++) bag.push(id);
  let placed = 0;
  let attempts = SPAWN.T1_COUNT * 15;
  while (placed < SPAWN.T1_COUNT && attempts-- > 0) {
    const x = range(rng, (MAP.BORDER + 2) * MAP.TILE, world.map.widthPx - (MAP.BORDER + 2) * MAP.TILE);
    const y = range(rng, (MAP.BORDER + 2) * MAP.TILE, world.map.heightPx - (MAP.BORDER + 2) * MAP.TILE);
    if (inLake(world.map, x, y)) continue;
    if (spawnPts.some((p) => distSq(p.x, p.y, x, y) < SPAWN.CLEAR_RADIUS * SPAWN.CLEAR_RADIUS)) continue;
    createMob(world, pick(rng, bag), x, y);
    placed++;
  }

  // --- Pickup'lar: dört tür, dengeli havuz
  spawnResources(world, 'atk', ECON.ATK_COUNT);
  spawnResources(world, 'armor', ECON.ARMOR_COUNT);
  spawnResources(world, 'herb', ECON.HERB_COUNT);
  spawnResources(world, 'speed', ECON.SPEED_COUNT);

  // --- Zindan baştan dolu: Hazırlık hedefine kadar kamp
  fillCampsToTarget(world);

  return human;
}

/**
 * Tek kamp doğur: her zaman O ANKİ cendere çemberinin MERKEZ bandında (zindan),
 * göllerden uzak. Evre ilerledikçe içerik güçlenir.
 */
export function spawnCamp(world, forcedKind = null) {
  const rng = world.rng;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const kinds = forcedKind ? [forcedKind] : CAMPS.KINDS[world.match.phase];
  if (!kinds || kinds.length === 0) return null;

  const maxR = Math.min(world.match.cendereR, world.map.widthPx / 2 - (MAP.BORDER + 3) * MAP.TILE);
  for (let attempt = 0; attempt < 25; attempt++) {
    const a = range(rng, 0, Math.PI * 2);
    const r = range(rng, maxR * CAMPS.RADIAL[0], maxR * CAMPS.RADIAL[1]);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
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

/** Canlı kamp sayısı (üyesi yaşayan) */
export function aliveCampCount(world) {
  return world.camps.filter((c) => c.memberIds.some((id) => world.entities.has(id))).length;
}

/** Periyodik yenilenme: dalga başına EN FAZLA 1 kamp (yavaş — kesmek bölgeyi temizler). */
export function ensureCamps(world) {
  const target = CAMPS.TARGET[world.match.phase] ?? 0;
  if (aliveCampCount(world) < target) spawnCamp(world);
}

/** Evre geçişinde zindanı yeni hedefe kadar doldur (toplu dalga). */
export function fillCampsToTarget(world) {
  const target = CAMPS.TARGET[world.match.phase] ?? 0;
  let guard = 20;
  while (aliveCampCount(world) < target && guard-- > 0) {
    if (!spawnCamp(world)) break;
  }
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
