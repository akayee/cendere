// Bölge yardımcıları — KİŞİSEL GZ modeli:
// Her oyuncunun (bot dahil) kendi küçük GZ dairesi vardır (world.gzones).
// Koruma ve can dolumu YALNIZ kendi GZ'nde geçerlidir; başkasının GZ'si sana
// hiçbir şey vermez. Kendi GZ'n dışındaki HER YER Vahşi'dir (×2). Sıkışma
// evresinde tüm GZ'ler birlikte erir (match.gzScale 1→0).

import { distSq } from '../core/vec2.js';
import { ZONE } from '../data/balance.js';

/** Bu entity'nin kendi GZ'si (yoksa null — moblar, sahipsizler) */
export function gzOf(world, ent) {
  return world.gzones.find((g) => g.ownerId === ent.id) ?? null;
}

/** GZ'nin şu anki etkin yarıçapı (Sıkışma'da erir) */
export function gzRadius(world, gz) {
  return gz.r * world.match.gzScale;
}

/** Entity KENDİ GZ'sinin içinde mi? */
export function isInOwnGZ(world, ent) {
  const gz = gzOf(world, ent);
  if (!gz) return false;
  const r = gzRadius(world, gz);
  if (r <= 2) return false;
  return distSq(ent.transform.x, ent.transform.y, gz.x, gz.y) <= r * r;
}

/** GZ koruması: kendi GZ'nde VE Sürgün değilken (PvP + mob teması işlemez) */
export function isProtected(world, ent) {
  return !!ent.zone && !ent.zone.exiled && isInOwnGZ(world, ent);
}

/** Kendi GZ'n dışında her yer Vahşi'dir */
export function isWild(world, ent) {
  return !isInOwnGZ(world, ent);
}

export function xpMultiplier(world, ent) {
  return isWild(world, ent) ? ZONE.WILD_XP_MULT : 1;
}

export function yieldMultiplier(world, ent) {
  return isWild(world, ent) ? ZONE.WILD_YIELD_MULT : 1;
}

/** Nokta HERHANGİ bir GZ'nin içinde mi? (mob doğumu bunlardan kaçınır) */
export function isInAnyGZ(world, x, y, pad = 0) {
  for (const g of world.gzones) {
    const r = gzRadius(world, g) + pad;
    if (distSq(x, y, g.x, g.y) <= r * r) return true;
  }
  return false;
}

/** Cendere çemberinin dışında mı? */
export function isOutsideCendere(world, x, y) {
  const r = world.match.cendereR;
  return distSq(x, y, world.map.widthPx / 2, world.map.heightPx / 2) > r * r;
}
