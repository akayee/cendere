// Vektör yardımcıları. Sıcak döngülerde nesne üretmemek için düz sayılarla çalışır.

export function len(x, y) {
  return Math.hypot(x, y);
}

export function distSq(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.sqrt(distSq(ax, ay, bx, by));
}

/** (x,y) vektörünü normalize edip out nesnesine yazar; sıfır vektörde 0,0 bırakır. */
export function normInto(out, x, y) {
  const l = Math.hypot(x, y);
  if (l > 1e-8) {
    out.x = x / l;
    out.y = y / l;
  } else {
    out.x = 0;
    out.y = 0;
  }
  return out;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
