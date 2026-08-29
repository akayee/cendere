// Tüm denge sayılarının evi (ARCHITECTURE.md: sayılar kodda magic number olamaz).

export const SIM = {
  TPS: 60,
  DT: 1 / 60,
};

export const MAP = {
  TILE: 16, // 1 tile = 16 dünya birimi (= 16 kaynak pikseli)
  W: 128, // tile
  H: 128,
  SEED: 20260828,
  TREES: 170,
  ROCKS: 55,
  DECOR: 320,
  LAKES: 4,
  DIRT_PATCHES: 10,
  BORDER: 2, // haritayı çevreleyen orman duvarı kalınlığı (tile)
  SPAWN_CLEAR: 8, // merkez spawn çevresinde engelsiz yarıçap (tile)
};

export const PHYS = {
  CELL: 32, // spatial hash hücre boyutu
  ITERATIONS: 2, // çarpışma çözüm turu
};

export const COMBAT = {
  TOUCH_PAD: 2.5, // mob temas saldırısı için ekstra menzil
  KNOCKBACK: 7, // hasar alanın itilme mesafesi (dünya birimi)
  HURT_TIME: 0.18, // hasar sonrası beyaz yanıp sönme süresi (sn)
  DUMMY_REPAIR_TIME: 5, // kırılan kuklanın onarım bekleme süresi (sn)
  IN_COMBAT_TIME: 3, // son hasardan sonra "savaşta" sayılma süresi (oto-toplama bekler)
  LOOT_DELAY: 0.5, // Ganimet Kesesi bu kadar sonra açılabilir (kill sonrası hızlı loot)
};

// Zehir (PLAN §9 — Ultima usulü): hasarı küçük, asıl silahı İYİLEŞME KİLİDİ.
export const POISON = {
  TICK: 1, // sn'de bir işler
  // Kaynak başına süre/dps mob tanımından gelir; kart zehri:
  CARD_DPS: 2,
  CARD_DURATION: 3,
};

export const SPAWN = {
  T1_COUNT: 30, // maç başı T1 mob sayısı
  BOT_COUNT: 9, // maçı dolduran botlar (PLAN §10: koltuk doldurma)
  MIN_DIST_FROM_SPAWN: 10, // tile — oyuncu doğuşuna bu kadar yakın mob doğmaz
  DUMMY_COUNT: 4, // merkez (GZ kasabası) çevresindeki antrenman kuklaları
  DUMMY_RING: 56, // kuklaların merkeze uzaklığı (dünya birimi)
  GZ_MOBS: 7, // GZ içi PASİF mob (slime/mantar) — güvenli ama yavaş kasılma (PLAN §3/§4)
  GZ_WOOD: 4, // GZ içi garanti kaynaklar (verim ×1 — Vahşi'nin yarısı)
  GZ_ORE: 3,
  GZ_HERB: 3,
};

export const XP = {
  BASE: 30, // 1→2 için gereken XP
  GROWTH: 18, // her seviyede eklenen ek gereksinim
  DUMMY_PER_HIT: 1, // kukla vuruşu başına XP (PLAN §4: mob XP'sinin ~⅓'ü)
  CARD_CHOICES: 3, // seviye başına sunulan kart sayısı
  PVP_BASE: 25, // oyuncu kesmenin taban XP'si — her mobdan yüksek (PLAN §6)
  PVP_PER_LEVEL: 10, // kurbanın seviyesi başına ek XP (gelişmiş avı değerli)
};

/** Seviye n'den n+1'e geçiş için gereken XP */
export function xpForLevel(level) {
  return XP.BASE + (level - 1) * XP.GROWTH;
}

export const ECON = {
  GATHER_TIME: 2.5, // kaynak toplama kanalı (sn)
  KESE_TIME: 1.5, // Ganimet Kesesi açma kanalı — kısa ama savunmasız an (PLAN §9)
  GATHER_RANGE: 14, // kaynağa bu kadar yakınken toplanabilir
  RESPAWN_TIME: 35, // kaynak yeniden doğma süresi (sn) — Son Cendere'de kapanacak (M5)
  WOOD_COUNT: 36, // haritadaki genç ağaç sayısı
  ORE_COUNT: 28, // maden damarı
  HERB_COUNT: 22, // şifa bitkisi
  ORE_PER_ARMOR: 5, // 5 cevher → +1 zırh (otomatik işleme, PLAN §7)
  WOOD_PER_DMG: 5, // 5 kereste → saldırı hasarı ×1.02
  WOOD_DMG_MUL: 1.02,
  POT_MAX: 3, // taşınabilir pot (PLAN §9)
  POT_HEAL_RATE: 12, // pot: saniyede can (2.5 sn'ye yayılır)
  POT_DURATION: 2.5,
  POT_DRINK_TIME: 0.5, // içme animasyonu — bu sürede yavaşlarsın
  POT_DRINK_SLOW: 0.5,
  FOCUS_TICK: 1.0, // yoğunlaşma: her 1 sn'lik kanal döngüsü...
  FOCUS_HEAL: 4, // ...bu kadar can verir; hasar/hareket bozar
};

export const ZONE = {
  GZ_RADIUS_TILES: 14, // GZ (kasaba) başlangıç yarıçapı — phases.js gz=224 ile eşit
  WILD_XP_MULT: 2, // Vahşi Bölge: XP ×2
  WILD_YIELD_MULT: 2, // Vahşi Bölge: kaynak verimi ×2
  GZ_BUDGET: 120, // kişisel GZ süresi (sn) — içerideyken erir (10 dk'lık maça göre)
  GZ_REFILL_RATIO: 3, // dışarıda geçen her 3 sn → 1 sn GZ hakkı
  EXILE_LIFT: 30, // Sürgün, bütçe bu seviyeye dolunca kalkar
  DAMAGE_TICK: 0.5, // cendere hasarının uygulanma aralığı (sn)
  EJECT_PUSH: 140, // Sürgünken GZ seni dışarı İTER (yürüme hızından yüksek — direnilemez)
  OVERSTAY_DPS: 3, // itilirken içeride geçen her sn'nin yanma cezası
};
