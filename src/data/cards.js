// Kart havuzu (PLAN.md §6). Etkiler BİLDİRİMSELDİR: progressionSystem uygular,
// yeni kart eklemek çoğunlukla sadece bu dosyaya satır eklemektir.
//
// effect alanları:
//   maxHpAdd, speedMul, autoDamageAdd, autoCooldownMul, autoRangeAdd,
//   skillPowerMul (sınıfa göre: dash hasarı / ok çarpanı / alev şiddeti),
//   skillCooldownMul, armorAdd, critAdd, lifestealAdd,
//   regenAdd (hp/sn), killHealAdd (kill başına can),
//   autoArcFull (cengaver: tam daire), autoProjAdd (+N mermi yelpazesi),
//   poisonOnHit (saldırılar zehirler), skillChargesSet (beceri şarj sayısı)
// classId: verilirse kart YALNIZCA o sınıfın teklif havuzuna girer

export const RARITY = {
  common: { key: 'common', name: 'Sıradan', color: '#c9d1d9', weight: 62 },
  rare: { key: 'rare', name: 'Nadir', color: '#c07ef5', weight: 30 },
  epic: { key: 'epic', name: 'Destansı', color: '#ffb545', weight: 8 },
};

// icon: pack içi yol. İsteğe bağlı crop: {src, x, y, w, h} (sprite sheet'ten kare).
export const CARDS = [
  // --- Sıradan
  { id: 'kalin_post', name: 'Kalın Post', desc: '+20 azami can', rarity: 'common', effect: { maxHpAdd: 20 }, icon: 'pack/Items/Potion/LifePot.png' },
  { id: 'seri_adim', name: 'Seri Adım', desc: '%8 hareket hızı', rarity: 'common', effect: { speedMul: 1.08 }, icon: 'pack/HUD/Kunai.png' },
  { id: 'keskin_kenar', name: 'Keskin Kenar', desc: '+3 saldırı hasarı', rarity: 'common', effect: { autoDamageAdd: 3 }, icon: 'pack/Items/Weapons/Sword/Sprite.png' },
  { id: 'hizli_bilek', name: 'Hızlı Bilek', desc: '%10 saldırı hızı', rarity: 'common', effect: { autoCooldownMul: 0.9 }, icon: 'pack/Items/Weapons/Sai/Sprite.png' },
  { id: 'uzun_kol', name: 'Uzun Kol', desc: '+4 saldırı menzili', rarity: 'common', effect: { autoRangeAdd: 4 }, icon: 'pack/Items/Weapons/Lance/Sprite.png' },
  // +2: zırh pickup'ı zaten +1 verdiği için kart onun iki katı — nadirlik/etki oranı korunur
  { id: 'deri_zirh', name: 'Deri Zırh', desc: '+2 zırh (her vuruşta daha az hasar)', rarity: 'common', effect: { armorAdd: 2 }, icon: { src: 'pack/FX/Magic/Shield/SpriteSheetBlue.png', x: 0, y: 0, w: 24, h: 26 } },
  { id: 'sicak_kan', name: 'Sıcak Kan', desc: 'Saniyede 0.6 can yenileme', rarity: 'common', effect: { regenAdd: 0.6 }, icon: 'pack/Items/Potion/Medipack.png' },

  // --- Nadir
  { id: 'vahsi_guc', name: 'Vahşi Güç', desc: '+6 saldırı hasarı', rarity: 'rare', effect: { autoDamageAdd: 6 }, icon: 'pack/Items/Weapons/BigSword/Sprite.png' },
  { id: 'ruzgar_yurusu', name: 'Rüzgâr Yürüyüşü', desc: '%15 hareket hızı', rarity: 'rare', effect: { speedMul: 1.15 }, icon: 'pack/Items/Weapons/Ninjaku/Sprite.png' },
  { id: 'kan_emici', name: 'Kan Emici', desc: 'Verilen hasarın %10\'u can olur', rarity: 'rare', effect: { lifestealAdd: 0.1 }, icon: 'pack/Items/Weapons/Bone/Sprite.png' },
  { id: 'olum_dansi', name: 'Ölüm Dansı', desc: 'Beceri %25 daha sık kullanılır', rarity: 'rare', effect: { skillCooldownMul: 0.75 }, icon: 'pack/Items/Weapons/Whip/Sprite.png' },
  { id: 'agir_darbe', name: 'Ağır Darbe', desc: 'Beceri gücü +%30 (atılma/ok/alev)', rarity: 'rare', effect: { skillPowerMul: 1.3 }, icon: 'pack/Items/Weapons/Hammer/Sprite.png' },
  { id: 'keskin_goz', name: 'Keskin Göz', desc: '%12 kritik şansı (1.5× hasar)', rarity: 'rare', effect: { critAdd: 0.12 }, icon: 'pack/Items/Weapons/Bow/Sprite.png' },
  { id: 'avci_icgudusu', name: 'Avcı İçgüdüsü', desc: 'Her kill 6 can yeniler', rarity: 'rare', effect: { killHealAdd: 6 }, icon: 'pack/Items/Food/Beaf.png' },

  // --- Nadir: SINIF KARTLARI (yalnız o sınıfın havuzuna düşer — PLAN §6)
  { id: 'girdap', name: 'Girdap', desc: 'Savuruş TAM DAİRE olur — arkanı da keser', rarity: 'rare', classId: 'cengaver', effect: { autoArcFull: true }, icon: 'pack/Items/Weapons/Sword2/Sprite.png' },
  { id: 'catal_ok', name: 'Çatal Ok', desc: 'Her atışta +1 ok (yelpaze)', rarity: 'rare', classId: 'nisanci', effect: { autoProjAdd: 1 }, icon: 'pack/Items/Weapons/Bow2/Sprite.png' },
  { id: 'cifte_kor', name: 'Çifte Kor', desc: 'Her atışta +1 büyü topu (yelpaze)', rarity: 'rare', classId: 'ocakci', effect: { autoProjAdd: 1 }, icon: 'pack/Items/Weapons/MagicWand/Sprite.png' },
  { id: 'zehirli_kenar', name: 'Zehirli Kenar', desc: 'Saldırıların zehirler: 3 sn iyileşme kilidi', rarity: 'rare', effect: { poisonOnHit: true }, icon: 'pack/Items/Scroll/ScrollPlant.png' },

  // --- Destansı
  { id: 'cendere_yuregi', name: 'Cendere Yüreği', desc: '+45 azami can', rarity: 'epic', effect: { maxHpAdd: 45 }, icon: 'pack/Items/Potion/Hear.png' },
  { id: 'firtina_bilegi', name: 'Fırtına Bileği', desc: '%22 saldırı hızı', rarity: 'epic', effect: { autoCooldownMul: 0.78 }, icon: 'pack/Items/Weapons/Katana/Sprite.png' },
  { id: 'vampir_dis', name: 'Vampir Dişi', desc: 'Verilen hasarın %22\'si can olur', rarity: 'epic', effect: { lifestealAdd: 0.22 }, icon: 'pack/Actor/Monsters/Skull/Faceset.png' },
  { id: 'yanki_becerisi', name: 'Yankı Becerisi', desc: 'Becerin 2 ŞARJ kazanır — art arda kullan', rarity: 'epic', effect: { skillChargesSet: 2 }, icon: 'pack/Items/Scroll/ScrollThunder.png' },
];
