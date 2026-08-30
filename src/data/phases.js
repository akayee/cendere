// Maç evreleri ve cendere daralma çizelgesi (PLAN §2).
// Yarıçaplar evre BAŞLANGICINDAKİ değerdir; iki evre arasında doğrusal daralır.

export const MATCH_END = 480; // 8:00 — kesin bitiş

export const PHASES = [
  // start (sn), cendere yarıçapı (dünya px), dışarıda kalma hasarı (can/sn)
  { key: 'hazirlik', name: 'Hazırlık', start: 0, radius: 1450, dps: 0 },
  { key: 'genisleme', name: 'Genişleme', start: 75, radius: 1450, dps: 2 },
  { key: 'sikisma', name: 'Sıkışma', start: 195, radius: 700, dps: 5 },
  { key: 'son', name: 'Son Cendere', start: 315, radius: 380, dps: 10 },
  { key: 'aniolum', name: 'Ani Ölüm', start: 405, radius: 140, dps: 20 },
];

export const FINAL_RADIUS = 60; // 20:00'de ulaşılan minimum çember

export const SUDDEN_DEATH = {
  DOUBLE_EVERY: 15, // Ani Ölüm'de hasar her 15 sn'de katlanır
  DPS_CAP: 120,
  HEAL_MULT: 0.5, // tüm iyileştirme yarıya düşer
};

/** t anındaki evre indeksi */
export function phaseIndexAt(t) {
  let idx = 0;
  for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i].start) idx = i;
  return idx;
}

/** t anındaki cendere yarıçapı (evreler arası doğrusal) */
export function cendereRadiusAt(t) {
  const i = phaseIndexAt(t);
  const cur = PHASES[i];
  const nextRadius = i + 1 < PHASES.length ? PHASES[i + 1].radius : FINAL_RADIUS;
  const nextStart = i + 1 < PHASES.length ? PHASES[i + 1].start : MATCH_END;
  const span = nextStart - cur.start;
  const f = span > 0 ? Math.min(1, (t - cur.start) / span) : 1;
  return cur.radius + (nextRadius - cur.radius) * f;
}

/** t anındaki cendere hasarı (can/sn) */
export function cendereDpsAt(t) {
  const i = phaseIndexAt(t);
  const cur = PHASES[i];
  if (cur.key !== 'aniolum') return cur.dps;
  const doublings = Math.floor((t - cur.start) / SUDDEN_DEATH.DOUBLE_EVERY);
  return Math.min(SUDDEN_DEATH.DPS_CAP, cur.dps * Math.pow(2, doublings));
}
