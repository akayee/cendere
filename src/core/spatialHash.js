// Geniş faz: "yakınımda kim var?" sorusunu O(1) yapan ızgara (ARCHITECTURE.md §8).

export function createSpatialHash(cellSize) {
  /** @type {Map<string, Set<*>>} hücre -> item kümesi */
  const cells = new Map();
  /** @type {Map<*, string[]>} item -> kapladığı hücre anahtarları */
  const placed = new Map();

  const keyOf = (cx, cy) => cx + ',' + cy;
  const cellOf = (v) => Math.floor(v / cellSize);

  function insert(item, minX, minY, maxX, maxY) {
    const keys = [];
    for (let cy = cellOf(minY); cy <= cellOf(maxY); cy++) {
      for (let cx = cellOf(minX); cx <= cellOf(maxX); cx++) {
        const k = keyOf(cx, cy);
        if (!cells.has(k)) cells.set(k, new Set());
        cells.get(k).add(item);
        keys.push(k);
      }
    }
    placed.set(item, keys);
  }

  function remove(item) {
    const keys = placed.get(item);
    if (!keys) return;
    for (const k of keys) cells.get(k)?.delete(item);
    placed.delete(item);
  }

  function update(item, minX, minY, maxX, maxY) {
    remove(item);
    insert(item, minX, minY, maxX, maxY);
  }

  /** Dikdörtgenle kesişen hücrelerdeki item'ları out dizisine toplar (tekrarsız). */
  function queryRect(minX, minY, maxX, maxY, out) {
    out.length = 0;
    for (let cy = cellOf(minY); cy <= cellOf(maxY); cy++) {
      for (let cx = cellOf(minX); cx <= cellOf(maxX); cx++) {
        const set = cells.get(keyOf(cx, cy));
        if (set) for (const item of set) if (!out.includes(item)) out.push(item);
      }
    }
    return out;
  }

  return { insert, remove, update, queryRect };
}
