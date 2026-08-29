// Sim → üst katmanlar tek iletişim yolu (ARCHITECTURE.md §6).
// Event isimleri 'alan.olay' biçimindedir: 'entity.died', 'player.levelup' ...

export function createBus() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type)?.delete(fn);
    },
    off(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    emit(type, payload) {
      const set = listeners.get(type);
      if (set) for (const fn of set) fn(payload);
    },
  };
}
