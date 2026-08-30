// Maç kurulumu ve mob doğumu — KİŞİSEL GZ + ZİNDAN modeli:
// oyuncular harita kenarındaki GZ halkasında kendi üslerinde doğar,
// merkez baştan itibaren kamplarla dolu bir zindandır.

import { range, pick } from '../core/rng.js';
import { MAP, SPAWN, ECON, ZONE } from '../data/balance.js';
import { T1_WEIGHTS, T4_MOB, T4_PER_WAVE, T4_CAP, CAMPS } from '../data/mobs.js';
import { CLASSES } from '../data/classes.js';
import { createMob, createDummy, createResource, createPlayer } from './entity.js';
import { isInAnyGZ } from './zone.js';

const BOT_NAMES = [
  'Gölge', 'Kartal', 'Bozkurt', 'Şimşek', 'Kuzgun', 'Çakal',
  'Pusucu', 'Demirci', 'Yabani', 'Serçe', 'Poyraz', 'Dağcı',
];

/**
 * Maç kurulumu: insan + botlar GZ halkasına eşit açılarla dizilir; herkes
 * KENDİ GZ dairesinin ortasında doğar (üste 1 kukla + 1 kaynak). Zindan
 * (merkez) Hazırlık hedefine kadar kampla doldurulur. İnsanı döndürür.
 */
export function spawnMatch(world, humanClassId) {
  const rng = world.rng;
  const cx = world.map.widthPx / 2;
  const cy = world.map.heightPx / 2;
  const total = SPAWN.BOT_COUNT + 1;
  const classIds = Object.keys(CLASSES);
  const nameOffset = Math.floor(rng() * BOT_NAMES.length);
  const startAngle = range(rng, 0, Math.PI * 2);

  let human = null;
  for (let i = 0; i < total; i++) {
    const a = startAngle + (i / total) * Math.PI * 2;
    const gx = cx + Math.cos(a) * ZONE.RING_RADIUS;
    const gy = cy + Math.sin(a) * ZONE.RING_RADIUS;

    let ent;
    if (i === 0) {
      ent = createPlayer(world, humanClassId, gx, gy);
      human = ent;
    } else {
      const classId = classIds[i % classIds.length];
      const cls = CLASSES[classId];
      ent = createPlayer(world, classId, gx, gy, {
        bot: true,
        sprite: pick(rng, cls.botSprites),
        personality: { aggro: range(rng, 0.2, 1), greed: range(rng, 0.3, 1) },
        name: BOT_NAMES[(nameOffset + i) % BOT_NAMES.length],
      });
    }
    world.gzones.push({ x: gx, y: gy, r: ZONE.PERSONAL_R, ownerId: ent.id });

    // Üs donanımı: 1 antrenman kuklası + 1 rastgele kaynak (kendi GZ'nde, verim ×1)
    createDummy(world, gx + Math.cos(a) * 30, gy + Math.sin(a) * 30);
    const resA = a + Math.PI / 2;
    createResource(world, pick(rng, ['wood', 'ore', 'herb']), gx + Math.cos(resA) * 28, gy + Math.sin(resA) * 28);
  }
  world.match.playersTotal = total;

  // --- T1 moblar: her yerde (GZ daireleri hariç) — merkez zaten kamplarla dolu
  const bag = [];
  for (const { id, w } of T1_WEIGHTS) for (let i = 0; i < w; i++) bag.push(id);
  let placed = 0;
  let attempts = SPAWN.T1_COUNT * 15;
  while (placed < SPAWN.T1_COUNT && attempts-- > 0) {
    const x = range(rng, (MAP.BORDER + 2) * MAP.TILE, world.map.widthPx - (MAP.BORDER + 2) * MAP.TILE);
    const y = range(rng, (MAP.BORDER + 2) * MAP.TILE, world.map.heightPx - (MAP.BORDER + 2) * MAP.TILE);
    if (inLake(world.map, x, y)) continue;
    if (isInAnyGZ(world, x, y, 30)) continue;
    createMob(world, pick(rng, bag), x, y);
    placed++;
  }

  // --- Vahşi kaynaklar
  spawnResources(world, 'wood', ECON.WOOD_COUNT);
  spawnResources(world, 'ore', ECON.ORE_COUNT);
  spawnResources(world, 'herb', ECON.HERB_COUNT);

  // --- Zindan baştan dolu: Hazırlık hedefine kadar kamp
  fillCampsToTarget(world);

  return human;
}

/**
 * Tek kamp doğur: her zaman O ANKİ cendere çemberinin MERKEZ bandında (zindan),
 * kişisel GZ'lerden ve göllerden uzak. Evre ilerledikçe içerik güçlenir.
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
    if (isInAnyGZ(world, x, y, CAMPS.GZ_PAD)) continue; // üslerin dibinde kamp olmaz
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
    if (isInAnyGZ(world, x, y, 12)) continue; // üslerin garanti kaynağı ayrı verildi
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
