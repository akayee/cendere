// Seed'li deterministik RNG (mulberry32).
// ARCHITECTURE.md §0: sim içinde Math.random() yasak — rastgelelik yalnızca buradan.

/** @returns {() => number} [0,1) aralığında deterministik üreteç */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min,max) tam sayı */
export function rangeInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}

/** [min,max) ondalık */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
