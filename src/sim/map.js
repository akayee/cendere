// Harita üretimi: seed'li, deterministik. Görsel bilgi içermez — yalnızca
// "nerede ne var" (tip etiketleri) ve katı gövdeler. Görselleştirme render/'ın işi.

import { rangeInt, range, pick } from '../core/rng.js';
import { distSq } from '../core/vec2.js';
import { MAP, ZONE } from '../data/balance.js';

export function generateMap(rng) {
  const T = MAP.TILE;
  const w = MAP.W;
  const h = MAP.H;
  const cx = (w * T) / 2;
  const cy = (h * T) / 2;

  const map = {
    w, h, tile: T,
    widthPx: w * T,
    heightPx: h * T,
    /** çim varyasyonu için seed (render kendi RNG kopyasını kurar) */
    groundSeed: rangeInt(rng, 1, 1e9),
    /** yuvarlak köşeli toprak yamaları: {tx,ty,tw,th} (tile cinsinden) */
    dirtPatches: [],
    /** göller: {tx,ty,tw,th} */
    lakes: [],
    /** katı objeler: {shape:'circle'|'aabb', type:'tree'|'rock'|'water', ...} */
    statics: [],
    /** çarpışmasız süsler: {type:'bush'|'flower'|'stone'|'stump', x, y} */
    decors: [],
  };

  // Kişisel GZ halka bandı engelsiz kalır (üsler ve aralarındaki "yol" temiz)
  const isInSpawn = (x, y, pad) => {
    const d = Math.sqrt(distSq(x, y, cx, cy));
    return Math.abs(d - ZONE.RING_RADIUS) < MAP.GZ_RING_CLEAR + pad;
  };

  // --- Toprak yamaları (görsel çeşitlilik; çarpışmasız)
  for (let i = 0; i < MAP.DIRT_PATCHES; i++) {
    map.dirtPatches.push({
      tx: rangeInt(rng, MAP.BORDER + 2, w - MAP.BORDER - 10),
      ty: rangeInt(rng, MAP.BORDER + 2, h - MAP.BORDER - 8),
      tw: rangeInt(rng, 3, 8),
      th: rangeInt(rng, 3, 6),
    });
  }

  // --- Göller (katı: yüzülemez)
  const lakeRects = [];
  for (let i = 0; i < MAP.LAKES; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const lw = rangeInt(rng, 4, 9);
      const lh = rangeInt(rng, 3, 7);
      const tx = rangeInt(rng, MAP.BORDER + 3, w - MAP.BORDER - lw - 3);
      const ty = rangeInt(rng, MAP.BORDER + 3, h - MAP.BORDER - lh - 3);
      const centerX = (tx + lw / 2) * T;
      const centerY = (ty + lh / 2) * T;
      if (isInSpawn(centerX, centerY, (lw / 2) * T)) continue;
      const overlaps = lakeRects.some(
        (r) => tx < r.tx + r.tw + 4 && tx + lw + 4 > r.tx && ty < r.ty + r.th + 4 && ty + lh + 4 > r.ty
      );
      if (overlaps) continue;
      lakeRects.push({ tx, ty, tw: lw, th: lh });
      map.lakes.push({ tx, ty, tw: lw, th: lh });
      // Kıyıda yarım tile pay bırak: karakter suya "değebilsin" ama giremesin
      map.statics.push({
        shape: 'aabb', type: 'water',
        minX: tx * T + T * 0.4, minY: ty * T + T * 0.4,
        maxX: (tx + lw) * T - T * 0.4, maxY: (ty + lh) * T - T * 0.4,
      });
      break;
    }
  }

  const inLake = (x, y, pad) =>
    lakeRects.some(
      (r) => x > r.tx * T - pad && x < (r.tx + r.tw) * T + pad && y > r.ty * T - pad && y < (r.ty + r.th) * T + pad
    );

  // --- Orman duvarı: harita kenarını iki sıra ağaçla kapat (BR sınırı hissi)
  const step = T * 1.4;
  for (let ring = 0; ring < MAP.BORDER; ring++) {
    const inset = T * (0.8 + ring * 1.3);
    for (let x = inset; x <= w * T - inset; x += step) {
      addTree(map, x + range(rng, -3, 3), inset + range(rng, -3, 3));
      addTree(map, x + range(rng, -3, 3), h * T - inset + range(rng, -3, 3));
    }
    for (let y = inset + step; y <= h * T - inset - step; y += step) {
      addTree(map, inset + range(rng, -3, 3), y + range(rng, -3, 3));
      addTree(map, w * T - inset + range(rng, -3, 3), y + range(rng, -3, 3));
    }
  }

  // --- Serpiştirilmiş ağaçlar ve kayalar: ORTAK yerleşim listesi (üst üste binmesinler)
  const occupied = [];
  placeScattered(rng, map, MAP.TREES, 26, (x, y) => addTree(map, x, y), isInSpawn, inLake, occupied);
  placeScattered(rng, map, MAP.ROCKS, 40, (x, y) => {
    if (rng() < 0.35) {
      // Büyük kaya: 64x48 sprite'ın ayak izini kaplayan AABB
      // (x,y render çapası için; min/max çarpışma için — ARCHITECTURE.md §8b)
      map.statics.push({
        shape: 'aabb', type: 'rockBig', x, y,
        minX: x - 28, minY: y - 20, maxX: x + 28, maxY: y + 2,
      });
    } else {
      map.statics.push({ shape: 'circle', type: 'rockSmall', x, y, r: 6 });
    }
  }, isInSpawn, inLake, occupied);

  // --- Çarpışmasız süsler
  // 'flower' (beyaz papatya) süs listesinden çıkarıldı: artık şifa bitkisi kaynağının görseli
  const decorTypes = ['bush', 'stone', 'stump', 'grassTuft'];
  for (let i = 0; i < MAP.DECOR; i++) {
    const x = range(rng, (MAP.BORDER + 1) * T, (w - MAP.BORDER - 1) * T);
    const y = range(rng, (MAP.BORDER + 1) * T, (h - MAP.BORDER - 1) * T);
    if (inLake(x, y, 8)) continue;
    map.decors.push({ type: pick(rng, decorTypes), x, y });
  }

  return map;
}

function addTree(map, x, y) {
  // Gövde küçük bir daireyle çarpışır; taç görseldir (ARCHITECTURE.md §8b)
  map.statics.push({ shape: 'circle', type: 'tree', x, y, r: 5 });
}

function placeScattered(rng, map, count, minGap, place, isInSpawn, inLake, occupied) {
  const placedPts = occupied ?? [];
  const T = MAP.TILE;
  let placed = 0;
  let attempts = count * 12;
  while (placed < count && attempts-- > 0) {
    const x = range(rng, (MAP.BORDER + 1.5) * T, (map.w - MAP.BORDER - 1.5) * T);
    const y = range(rng, (MAP.BORDER + 1.5) * T, (map.h - MAP.BORDER - 1.5) * T);
    if (isInSpawn(x, y, 16)) continue;
    if (inLake(x, y, 20)) continue;
    if (placedPts.some((p) => distSq(p.x, p.y, x, y) < minGap * minGap)) continue;
    placedPts.push({ x, y });
    place(x, y);
    placed++;
  }
}
