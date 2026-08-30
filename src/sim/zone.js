// Bölge yardımcıları — kişisel GZ'ler KALDIRILDI: her yer tek tip, tek tehlike
// daralan cendere çemberidir. Çarpan (Vahşi ×2) kavramı da kalktı; taban XP
// değerleri data/ altında buna göre ayarlandı.

import { distSq } from '../core/vec2.js';

/** Cendere çemberinin dışında mı? */
export function isOutsideCendere(world, x, y) {
  const r = world.match.cendereR;
  return distSq(x, y, world.map.widthPx / 2, world.map.heightPx / 2) > r * r;
}
