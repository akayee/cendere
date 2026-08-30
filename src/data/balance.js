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
  RING_CLEAR: 70, // doğum halkası bandı (SPAWN.RING_RADIUS ± bu) engelsiz kalır (px)
};

export const PHYS = {
  CELL: 32, // spatial hash hücre boyutu
  ITERATIONS: 2, // çarpışma çözüm turu
};

export const COMBAT = {
  TOUCH_PAD: 2.5, // mob temas saldırısı için ekstra menzil
  KNOCKBACK: 7, // hasar alanın itilme mesafesi (dünya birimi)
  HURT_TIME: 0.15, // hasar sonrası kırmızı flaş süresi (sn) — görselini animator çizer
  DUMMY_REPAIR_TIME: 5, // kırılan kuklanın onarım bekleme süresi (sn)
  IN_COMBAT_TIME: 3, // son hasardan sonra "savaşta" sayılma süresi (kese açılışı bekler)
  LOOT_DELAY: 0.5, // Ganimet Kesesi çatışmadan bu kadar sonra açılabilir (kazara açılmasın)
  // Alan Yakması: toplam hasar bütçesinin (dps × areaDuration) bu payı atıldığı AN
  // alandakilere iner; kalanı alanda kalındıkça DoT olarak işler. Toplam bütçe değişmez.
  AREA_BURST_RATIO: 0.25,
};

// Zehir (PLAN §9 — Ultima usulü): hasarı küçük, asıl silahı İYİLEŞME KİLİDİ.
export const POISON = {
  TICK: 1, // sn'de bir işler
  // Kaynak başına süre/dps mob tanımından gelir; kart zehri:
  CARD_DPS: 2,
  CARD_DURATION: 3,
};

export const SPAWN = {
  T1_COUNT: 42, // maç başı T1 mob sayısı (doğum noktaları hariç her yerde)
  BOT_COUNT: 9, // maçı dolduran botlar (PLAN §10: koltuk doldurma)
  RING_RADIUS: 620, // oyuncu doğum halkasının merkeze uzaklığı (merkez = zindan)
  CLEAR_RADIUS: 40, // doğum noktalarının bu kadar yakınına mob doğmaz
};

export const XP = {
  BASE: 30, // 1→2 için gereken XP
  GROWTH: 18, // her seviyede eklenen ek gereksinim
  DUMMY_PER_HIT: 1, // kukla vuruşu başına XP (PLAN §4: mob XP'sinin ~⅓'ü)
  CARD_CHOICES: 3, // seviye başına sunulan kart sayısı
  // Taban değerler ×2 Vahşi çarpanı kalktığı için ~×1.8 yükseltildi (tempo korunur)
  PVP_BASE: 45, // oyuncu kesmenin taban XP'si — her mobdan yüksek (PLAN §6)
  PVP_PER_LEVEL: 18, // kurbanın seviyesi başına ek XP (gelişmiş avı değerli)
};

/** Seviye n'den n+1'e geçiş için gereken XP */
export function xpForLevel(level) {
  return XP.BASE + (level - 1) * XP.GROWTH;
}

export const ECON = {
  // TEMAS TOPLAMASI: kaynaklar yerdeki pickup'lardır — üstüne gelen ANINDA toplar.
  // Temas eşiği = gövde yarıçapı + kaynak yarıçapı + bu tolerans (5+4+2 ≈ 11 birim).
  PICKUP_PAD: 2,
  RESPAWN_TIME: 35, // kaynak yeniden doğma süresi (sn)
  ATK_COUNT: 26, // haritadaki saldırı pickup'ı sayısı
  ARMOR_COUNT: 24, // zırh pickup'ı
  HERB_COUNT: 20, // şifa bitkisi (pot)
  SPEED_COUNT: 16, // hız pickup'ı
  ATK_DMG_MUL: 1.04, // atk pickup'ı: otomatik saldırı hasarı ×1.04 (anında, kalıcı)
  ARMOR_PER_PICKUP: 1, // armor pickup'ı: anında +1 zırh
  SPEED_PER_PICKUP: 0.03, // speed pickup'ı: kalıcı +%3 hareket hızı...
  SPEED_PICKUP_CAP: 0.3, // ...pickup başına etki toplam +%30'da durur (toplamak serbest — sayaç işler)
  SPEED_TOTAL_CAP: 1.5, // toplam hız çarpanı tavanı (kart + pickup + milestone üst üste binse de)
  // Eşik ödülleri: bir türden bu kadar pickup toplayan kalıcı görünür aura + bonus kazanır.
  // Hiçbir atk/armor/speed pickup'ı "alınamaz" değildir — sayaç hep eşiğe ilerler.
  MILESTONE_COUNT: 20, // tür başına eşik (her tür için bir kez tetiklenir)
  MILESTONE_ATK_MUL: 1.25, // atk 20 → ekstra hasar ×1.25 (tek seferlik, kalıcı)
  MILESTONE_ARMOR_ADD: 5, // armor 20 → ekstra +5 zırh
  MILESTONE_SPEED_ADD: 0.1, // speed 20 → ekstra +%10 hız (SPEED_TOTAL_CAP yine aşılamaz)
  POT_MAX: 3, // taşınabilir pot (PLAN §9)
  POT_MAX_UPGRADED: 4, // ömürlük POT_UPGRADE_AT bitki toplayınca kapasite buna çıkar
  POT_UPGRADE_AT: 3, // pot kapasite artışı eşiği (toplam toplanan bitki)
  POT_HEAL_RATE: 12, // pot: saniyede can (2.5 sn'ye yayılır)
  POT_DURATION: 2.5,
  POT_DRINK_TIME: 0.5, // içme animasyonu — bu sürede yavaşlarsın
  POT_DRINK_SLOW: 0.5,
  FOCUS_TICK: 1.0, // yoğunlaşma: her 1 sn'lik kanal döngüsü...
  FOCUS_HEAL: 4, // ...bu kadar can verir; hasar/hareket bozar
};

// Cendere (daralan çember) — kişisel GZ'ler kaldırıldı, tek tehlike bu.
export const CENDERE = {
  DAMAGE_TICK: 0.5, // cendere hasarının uygulanma aralığı (sn)
};
