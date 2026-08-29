// Dar faz çarpışma primitifleri (ARCHITECTURE.md §8).
// Hepsi "A'yı dışarı itecek en kısa vektör"ü döndürür: {nx, ny, depth} ya da null.

/** Daire-daire: A'yı B'den ayıracak itme. */
export function circleVsCircle(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rSum = ar + br;
  const dSq = dx * dx + dy * dy;
  if (dSq >= rSum * rSum) return null;
  const d = Math.sqrt(dSq);
  if (d < 1e-8) return { nx: 1, ny: 0, depth: rSum }; // tam üst üste: sabit yöne it
  return { nx: dx / d, ny: dy / d, depth: rSum - d };
}

/** Daire-AABB: daireyi kutudan dışarı itecek en kısa vektör. */
export function circleVsAabb(cx, cy, r, minX, minY, maxX, maxY) {
  // Kutu üzerindeki en yakın nokta
  const px = cx < minX ? minX : cx > maxX ? maxX : cx;
  const py = cy < minY ? minY : cy > maxY ? maxY : cy;
  const dx = cx - px;
  const dy = cy - py;
  const dSq = dx * dx + dy * dy;

  if (dSq > r * r) return null;

  if (dSq > 1e-12) {
    // Merkez kutunun dışında: en yakın noktadan uzağa it
    const d = Math.sqrt(dSq);
    return { nx: dx / d, ny: dy / d, depth: r - d };
  }

  // Merkez kutunun içinde: en yakın yüzeye it
  const left = cx - minX;
  const right = maxX - cx;
  const top = cy - minY;
  const bottom = maxY - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { nx: -1, ny: 0, depth: left + r };
  if (m === right) return { nx: 1, ny: 0, depth: right + r };
  if (m === top) return { nx: 0, ny: -1, depth: top + r };
  return { nx: 0, ny: 1, depth: bottom + r };
}
