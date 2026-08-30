// Mob tanımları (PLAN.md §8). T1: kolay, çoğu pasif — vurulunca saldırır.

export const MOBS = {
  slime: {
    id: 'slime',
    tier: 1,
    hp: 26,
    damage: 5,
    xp: 21,
    speed: 40,
    radius: 5,
    sprite: 'slime',
    aggroRange: 0, // 0 = pasif: sadece vurulunca saldırır
    leash: 130, // evinden bu kadar uzaklaşınca geri döner
    wanderRadius: 50,
    attackCooldown: 0.9,
  },
  mushroom: {
    id: 'mushroom',
    tier: 1,
    hp: 36,
    damage: 7,
    xp: 26,
    speed: 34,
    radius: 5,
    sprite: 'mushroom',
    aggroRange: 0,
    leash: 110,
    wanderRadius: 35,
    attackCooldown: 1.1,
  },
  snake: {
    id: 'snake',
    tier: 1,
    hp: 18,
    damage: 6,
    xp: 23,
    speed: 72,
    radius: 4,
    sprite: 'snake',
    aggroRange: 55, // tek agresif T1: yaklaşana saldırır
    leash: 160,
    wanderRadius: 70,
    attackCooldown: 0.8,
  },
};

/** T1 doğum ağırlıkları */
export const T1_WEIGHTS = [
  { id: 'slime', w: 4 },
  { id: 'mushroom', w: 3 },
  { id: 'snake', w: 3 },
];

// --- T2: Vahşi Bölge kampları (Genişleme evresiyle belirir — PLAN §8)
export const T2_MOBS = {
  haydut: {
    id: 'haydut',
    tier: 2,
    hp: 85,
    damage: 12,
    xp: 60,
    speed: 62,
    radius: 6,
    sprite: 'cyclope',
    aggroRange: 60, // kamp savunur: yaklaşana saldırır
    leash: 150,
    wanderRadius: 40,
    attackCooldown: 1.0,
  },
  hortlak: {
    id: 'hortlak',
    tier: 2,
    hp: 60,
    damage: 9,
    xp: 50,
    speed: 78,
    radius: 5,
    sprite: 'skull',
    aggroRange: 70,
    leash: 170,
    wanderRadius: 50,
    attackCooldown: 0.8,
  },
  orumcek: {
    id: 'orumcek',
    tier: 2,
    hp: 55,
    damage: 6,
    xp: 55,
    speed: 82,
    radius: 5,
    sprite: 'spider',
    aggroRange: 65,
    leash: 160,
    wanderRadius: 45,
    attackCooldown: 0.9,
    poison: { dps: 3, duration: 4 }, // vuruşu ZEHİRLER: iyileşme kilitlenir (PLAN §9)
  },
};

export const T2_CAMPS = 6; // Genişleme'deki ilk kamp dalgası (her kampta 3 mob)

// --- Kamp yöneticisi: ZİNDAN modeli — kamplar merkez bölgede yoğun doğar
// (cendere daraldıkça otomatik daha da içeride), evre ilerledikçe güçlenir.
export const CAMPS = {
  RESPAWN: 55, // kesilen kampın yerine yenisinin gelme aralığı (sn) — uzun cooldown
  RADIAL: [0.05, 0.5], // kamp, cendere yarıçapının MERKEZ bandında doğar (zindan)
  TARGET: { hazirlik: 7, genisleme: 10, sikisma: 8, son: 3, aniolum: 0 }, // hedef canlı kamp
  // Evreye göre kamp içeriği: [mobId, üyeSayısı, elitMi] seçenekleri
  KINDS: {
    hazirlik: [
      ['haydut', 3, false],
      ['hortlak', 3, false],
      ['orumcek', 3, false],
    ],
    genisleme: [
      ['haydut', 3, false],
      ['hortlak', 3, false],
      ['orumcek', 3, false],
    ],
    sikisma: [
      ['haydut', 3, false],
      ['orumcek', 3, false],
      ['ejder', 1, true], // güçlü kamplar devreye girer — eski güçsüzler azalır
      ['ejder', 1, true],
    ],
    son: [['ejder', 1, true]],
    aniolum: [['ejder', 1, true]],
  },
};

// --- T3 Elit (Sıkışma evresiyle belirir): yüksek HP, Destansı kart garantili drop
export const T3_MOBS = {
  ejder: {
    id: 'ejder',
    tier: 3,
    hp: 280,
    damage: 18,
    xp: 175,
    speed: 55,
    radius: 7,
    sprite: 'dragon',
    aggroRange: 75,
    leash: 220,
    wanderRadius: 30,
    attackCooldown: 1.2,
  },
};
export const T3_COUNT = 3;

// --- T4 Cendere Canavarı (Son Cendere): sınırdan sızar, EN YAKIN oyuncuyu kovalar
// Görevi öldürmekten çok SÜRMEK: kamp yapanı söküp merkeze iter (PLAN §8)
export const T4_MOB = {
  id: 'alevruhu',
  tier: 4,
  hp: 130,
  damage: 14,
  xp: 105,
  speed: 108,
  radius: 5,
  sprite: 'flam',
  aggroRange: 9999, // her zaman avda
  leash: 99999, // tasması yok
  wanderRadius: 40,
  attackCooldown: 0.9,
};
export const T4_SPAWN_INTERVAL = 20; // sn'de bir dalga
export const T4_PER_WAVE = 2;
export const T4_CAP = 8;
