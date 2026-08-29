// Bölge yardımcıları (M5): GZ artık maç durumundan okunur — Sıkışma'da erir,
// Son Cendere'de tamamen kalkar (her yer Vahşi olur).

import { distSq } from '../core/vec2.js';
import { ZONE } from '../data/balance.js';

/** GZ içinde mi? (GZ kalmadıysa kimse içeride değildir) */
export function isInGZ(world, x, y) {
  const r = world.match.gzR;
  if (r <= 0) return false;
  return distSq(x, y, world.map.widthPx / 2, world.map.heightPx / 2) <= r * r;
}

/** GZ koruması geçerli mi? (içeride VE Sürgün değilse) — PvP filtresi (M6) */
export function isProtected(world, ent) {
  return !ent.zone?.exiled && isInGZ(world, ent.transform.x, ent.transform.y);
}

export function isWild(world, x, y) {
  return !isInGZ(world, x, y);
}

export function xpMultiplier(world, x, y) {
  return isWild(world, x, y) ? ZONE.WILD_XP_MULT : 1;
}

export function yieldMultiplier(world, x, y) {
  return isWild(world, x, y) ? ZONE.WILD_YIELD_MULT : 1;
}

/** Cendere çemberinin dışında mı? */
export function isOutsideCendere(world, x, y) {
  const r = world.match.cendereR;
  return distSq(x, y, world.map.widthPx / 2, world.map.heightPx / 2) > r * r;
}