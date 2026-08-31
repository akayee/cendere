// Kart havuzu (PLAN.md §6). Etkiler BİLDİRİMSELDİR: progressionSystem uygular,
// yeni kart eklemek çoğunlukla sadece bu dosyaya satır eklemektir.
//
// effect alanları:
//   maxHpAdd, speedMul, autoDamageAdd, autoCooldownMul, autoRangeAdd,
//   skillPowerMul (sınıfa göre: dash hasarı / ok çarpanı / alev şiddeti),
//   skillCooldownMul, armorAdd, critAdd, lifestealAdd,
//   regenAdd (hp/sn), killMaxHpAdd (kill başına KALICI azami can; kazanım anında mevcut
//     cana da eklenir; toplam kazanım balance.js COMBAT.KILL_MAXHP_CAP'te durur),
//   autoArcFull (cengaver: tam daire), autoProjAdd (+N mermi yelpazesi),
//   autoStrikeAdd (cengaver: her savuruş +N yankı vuruşu — aynı hedeflere kısa
//     gecikmeyle yeniden hasar; combatSystem çözer),
//   poisonOnHit (saldırılar zehirler), skillChargesSet (beceri şarj sayısı),
//   skillSlow (beceri isabetleri yavaşlatır — oran/süre balance.js SKILL_SLOW)
// classId: verilirse kart YALNIZCA o sınıfın teklif havuzuna girer
// unique: true → ikinci kopya HİÇBİR ŞEY vermez (boolean/set etkiler); teklif
//   havuzu ve Yankı Kartı, build'de zaten olan unique kartı ATLAR.
//   catal_ok/cifte_kor/cifte_zipkin/cifte_vurus unique DEĞİLDİR: +1 mermi/vuruş istiflenir.

export const RARITY = {
  common: { key: 'common', name: 'Sıradan', color: '#c9d1d9' },
  rare: { key: 'rare', name: 'Nadir', color: '#c07ef5' },
  epic: { key: 'epic', name: 'Destansı', color: '#ffb545' },
};

// Nadirlik ağırlıkları LEVELE bağlıdır (PLAN §6: seviye yükseldikçe nadir şansı
// artar). Düşük levelde Destansı HİÇ çıkmaz; level 4'te açılır ve levelle büyür.
// Kart teklifi üreten HER rastgele kaynak (rollOffer) bu fonksiyondan geçer —
// sabit T3 elit ganimeti (Destansı garantili) ve Yankı Kartı (kurbanın build
// kopyası) nadirlik ÇEKMEDİĞİ için kapsam dışıdır.
export const EPIC_MIN_LEVEL = 4; // bu levelden önce Destansı ağırlığı 0

/** Verilen oyuncu leveli için {common, rare, epic} ağırlıkları (toplam 100). */
export function rarityWeightsForLevel(level) {
  const epic = level < EPIC_MIN_LEVEL ? 0 : Math.min(22, 4 + (level - EPIC_MIN_LEVEL) * 2);
  const rare = Math.min(44, 30 + level);
  return { common: 100 - rare - epic, rare, epic };
}

// icon: pack içi yol. İsteğe bağlı crop: {src, x, y, w, h} (sprite sheet'ten kare)
// veya {emoji} (pack'te uygun sprite yoksa — cardScreen/cardCatalog emoji dalı çizer).
// Simge dili: aynı stat türü = AYNI simge; nadirlik farkı yalnız çerçeveden okunur.
//   AD = kılıç · ARMOR = kalkan (tam kubbe karesi) · SPEED = çizme · saldırı hızı = kol
export const CARDS = [
  // --- Sıradan
  { id: 'kalin_post', name: 'Kalın Post', desc: '+20 azami can', rarity: 'common', effect: { maxHpAdd: 20 }, icon: 'pack/Items/Potion/LifePot.png' },
  { id: 'seri_adim', name: 'Seri Adım', desc: '+%8 SPEED', rarity: 'common', effect: { speedMul: 1.08 }, icon: { emoji: '👢' } },
  { id: 'keskin_kenar', name: 'Keskin Kenar', desc: '+3 AD', rarity: 'common', effect: { autoDamageAdd: 3 }, icon: 'pack/Items/Weapons/Sword/Sprite.png' },
  { id: 'hizli_bilek', name: 'Hızlı Bilek', desc: '+%10 saldırı hızı', rarity: 'common', effect: { autoCooldownMul: 0.9 }, icon: { emoji: '💪' } },
  { id: 'uzun_kol', name: 'Uzun Kol', desc: '+4 saldırı menzili', rarity: 'common', effect: { autoRangeAdd: 4 }, icon: 'pack/Items/Weapons/Lance/Sprite.png' },
  // +2: zırh pickup'ı zaten +1 verdiği için kart onun iki katı — nadirlik/etki oranı korunur
  { id: 'deri_zirh', name: 'Deri Zırh', desc: '+2 ARMOR (her vuruşta daha az hasar)', rarity: 'common', effect: { armorAdd: 2 }, icon: { src: 'pack/FX/Magic/Shield/SpriteSheetBlue.png', x: 120, y: 0, w: 24, h: 26 } },
  { id: 'sicak_kan', name: 'Sıcak Kan', desc: 'Saniyede 0.6 can yenileme', rarity: 'common', effect: { regenAdd: 0.6 }, icon: 'pack/Items/Potion/Medipack.png' },

  // --- Nadir
  { id: 'vahsi_guc', name: 'Vahşi Güç', desc: '+6 AD', rarity: 'rare', effect: { autoDamageAdd: 6 }, icon: 'pack/Items/Weapons/Sword/Sprite.png' },
  { id: 'ruzgar_yurusu', name: 'Rüzgâr Yürüyüşü', desc: '+%15 SPEED', rarity: 'rare', effect: { speedMul: 1.15 }, icon: { emoji: '👢' } },
  { id: 'kan_emici', name: 'Kan Emici', desc: 'Verilen hasarın %10\'u can olur', rarity: 'rare', effect: { lifestealAdd: 0.1 }, icon: 'pack/Items/Weapons/Bone/Sprite.png' },
  { id: 'olum_dansi', name: 'Ölüm Dansı', desc: 'Beceri %25 daha sık kullanılır', rarity: 'rare', effect: { skillCooldownMul: 0.75 }, icon: 'pack/Items/Weapons/Whip/Sprite.png' },
  { id: 'agir_darbe', name: 'Ağır Darbe', desc: 'Beceri gücü +%30 (atılma/ok/alev)', rarity: 'rare', effect: { skillPowerMul: 1.3 }, icon: 'pack/Items/Weapons/Hammer/Sprite.png' },
  { id: 'keskin_goz', name: 'Keskin Göz', desc: '%12 kritik şansı (1.5× hasar)', rarity: 'rare', effect: { critAdd: 0.12 }, icon: 'pack/Items/Weapons/Bow/Sprite.png' },
  { id: 'avci_icgudusu', name: 'Avcı İçgüdüsü', desc: 'Her kill KALICI +3 azami can (toplam +60\'a kadar)', rarity: 'rare', effect: { killMaxHpAdd: 3 }, icon: 'pack/Items/Food/Beaf.png' },

  // --- Nadir: SINIF KARTLARI (yalnız o sınıfın havuzuna düşer — PLAN §6)
  { id: 'girdap', name: 'Girdap', desc: 'Savuruş TAM DAİRE olur — arkanı da keser', rarity: 'rare', classId: 'cengaver', unique: true, effect: { autoArcFull: true }, icon: 'pack/Items/Weapons/Sword2/Sprite.png' },
  // Çifte Atış ikizleri (id'ler tarihsel — DEĞİŞMEZ): +1 mermi, İSTİFLENİR
  { id: 'catal_ok', name: 'Çifte Atış', desc: 'Her atışta +1 ok — iki ok birden yelpaze halinde', rarity: 'rare', classId: 'nisanci', effect: { autoProjAdd: 1 }, icon: 'pack/Items/Weapons/Bow2/Sprite.png' },
  { id: 'cifte_kor', name: 'Çifte Atış', desc: 'Her atışta +1 büyü topu — iki top birden yelpaze halinde', rarity: 'rare', classId: 'ocakci', effect: { autoProjAdd: 1 }, icon: 'pack/Items/Weapons/MagicWand/Sprite.png' },
  { id: 'cifte_zipkin', name: 'Çifte Atış', desc: 'Her atışta +1 zıpkın — iki zıpkın birden yelpaze halinde', rarity: 'rare', classId: 'kementci', effect: { autoProjAdd: 1 }, icon: 'pack/Items/Weapons/Lance2/Sprite.png' },
  { id: 'zehirli_kenar', name: 'Zehirli Kenar', desc: 'Saldırıların zehirler: 3 sn iyileşme kilidi', rarity: 'rare', unique: true, effect: { poisonOnHit: true }, icon: 'pack/Items/Scroll/ScrollPlant.png' },
  // Tüm ARMOR kartları AYNI kalkan karesini (mavi sheet'in tam kubbesi) kullanır;
  // güç sırası ikondan değil nadirlik çerçevesinden okunur.
  { id: 'demir_kabuk', name: 'Demir Kabuk', desc: '+4 ARMOR (her vuruşta daha az hasar)', rarity: 'rare', effect: { armorAdd: 4 }, icon: { src: 'pack/FX/Magic/Shield/SpriteSheetBlue.png', x: 120, y: 0, w: 24, h: 26 } },

  // --- Destansı
  { id: 'cendere_yuregi', name: 'Cendere Yüreği', desc: '+45 azami can', rarity: 'epic', effect: { maxHpAdd: 45 }, icon: 'pack/Items/Potion/Hear.png' },
  { id: 'firtina_bilegi', name: 'Fırtına Bileği', desc: '+%22 saldırı hızı', rarity: 'epic', effect: { autoCooldownMul: 0.78 }, icon: { emoji: '💪' } },
  { id: 'vampir_dis', name: 'Vampir Dişi', desc: 'Verilen hasarın %22\'si can olur', rarity: 'epic', effect: { lifestealAdd: 0.22 }, icon: 'pack/Actor/Monsters/Skull/Faceset.png' },
  { id: 'yanki_becerisi', name: 'Yankı Becerisi', desc: 'Becerin 2 ŞARJ kazanır — art arda kullan', rarity: 'epic', unique: true, effect: { skillChargesSet: 2 }, icon: 'pack/Items/Scroll/ScrollThunder.png' },
  { id: 'cendere_zirhi', name: 'Cendere Zırhı', desc: '+7 ARMOR (her vuruşta daha az hasar)', rarity: 'epic', effect: { armorAdd: 7 }, icon: { src: 'pack/FX/Magic/Shield/SpriteSheetBlue.png', x: 120, y: 0, w: 24, h: 26 } },
  // Uzakçıların istiflenen Çifte Atış'ının yakın dövüş dengi — nadir değil DESTANSI
  // (tek yay savuruşu zaten çoklu hedef vurur; istifi bu yüzden pahalıdır). İSTİFLENİR.
  { id: 'cifte_vurus', name: 'Çifte Vuruş', desc: 'Her savuruş aynı hedeflere +1 kez daha vurur (yankı vuruşu)', rarity: 'epic', classId: 'cengaver', effect: { autoStrikeAdd: 1 }, icon: 'pack/Items/Weapons/Sword2/Sprite.png' },
  // Yavaşlatma oranı/süresi tüm sınıflar için AYNI sabitten okunur: balance.js SKILL_SLOW
  { id: 'pranga_becerisi', name: 'Pranga Becerisi', desc: 'Becerinin vurduğu düşmanlar 1.5 sn %40 yavaşlar', rarity: 'epic', unique: true, effect: { skillSlow: true }, icon: { emoji: '⛓️' } },
];
