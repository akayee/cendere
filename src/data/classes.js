// Karakter sınıfları (PLAN §5). Üç sınıf da oynanabilir (M6).
// pickupBonus: uzmanlık — o türdeki pickup'ın etkisini ×2 alır (temas toplaması)
// auto.type: 'melee' (yay içi alan) | 'projectile' (mermi — engel arkasına işlemez)
// skill.type: 'dash' (ileri atılma+hasar) | 'homingShot' (şaşmaz ok: hedef takipli, kaçırmaz) | 'burnArea' (yerde kalan alev)
// flavor: lobi tanıtım metinleri — oynanışa etkisi yok, yalnızca UI

export const CLASSES = {
  cengaver: {
    id: 'cengaver',
    name: 'Cengâver',
    speed: 95,
    radius: 5,
    hp: 105,
    sprite: 'ninja',
    charFolder: 'BlueNinja', // lobi karakter önizlemesi
    botSprites: ['ninjaRed', 'ninjaGray'],
    pickupBonus: 'armor', // uzmanlık: zırh pickup'ı ona +2 verir (×2 etki)
    auto: { type: 'melee', damage: 8, range: 24, arc: Math.PI * 1.1, cooldown: 0.55, swingTime: 0.18 },
    // leapRange: rakibe atlama arama menzili — bu menzildeki en yakın CANLI rakip
    // (oyuncu/bot; MOB DEĞİL) varsa atılma onun o anki konumuna kilitlenir.
    // cooldown 2.2 → 3.0: rakibe atlama beceriyi belirgin güçlendirdi (denge: balance.mjs)
    skill: { type: 'dash', speedMul: 4.6, duration: 0.16, cooldown: 3.0, damage: 12, leapRange: 120 },
    flavor: {
      autoName: 'Kılıç Savuruşu',
      autoDesc: 'Öndeki yay içindeki TÜM düşmanlara vurur',
      skillName: 'Atılma',
      skillDesc: 'Rakibe atlar; rakip yoksa ileri atılır · 3 sn',
      skillIcon: 'pack/Items/Weapons/Ninjaku/Sprite.png',
      perk: 'Zırh toplaması ×2 etki',
    },
  },
  nisanci: {
    id: 'nisanci',
    name: 'Nişancı',
    speed: 93, // kite bedava değil: Cengâver (95) açık alanda yavaşça kapatır
    radius: 5,
    hp: 80,
    sprite: 'hunter',
    charFolder: 'Hunter',
    botSprites: ['camoGreen', 'ninjaGreen'],
    pickupBonus: 'atk', // uzmanlık: saldırı pickup'ı etkisi ×2
    auto: { type: 'projectile', damage: 7, range: 95, cooldown: 0.72, swingTime: 0.15, projSpeed: 230 },
    // Şaşmaz Ok: hedefi takip eder, KAÇIRMAZ (engel de durdurmaz) — bedeli uzun bekleme
    skill: { type: 'homingShot', cooldown: 8, damageMul: 2.5, projSpeedMul: 1.4, seekRange: 1.6 },
    flavor: {
      autoName: 'Ok',
      autoDesc: 'Uzaktan vurur; engellerin arkasına işlemez',
      skillName: 'Şaşmaz Ok',
      skillDesc: 'Hedefi takip eder, ASLA ıskalamaz · 2.5× hasar · 8 sn',
      skillIcon: 'pack/HUD/Arrow.png',
      perk: 'Saldırı toplaması ×2 etki',
    },
  },
  ocakci: {
    id: 'ocakci',
    name: 'Ocakçı',
    speed: 91,
    radius: 5,
    hp: 115,
    sprite: 'sorcerer',
    charFolder: 'SorcererOrange',
    botSprites: ['mageBlack', 'ninjaDark'],
    pickupBonus: 'herb', // uzmanlık: bitki pickup'ı +2 pot verir
    auto: { type: 'projectile', damage: 13, range: 95, cooldown: 0.85, swingTime: 0.2, projSpeed: 190 },
    skill: { type: 'burnArea', cooldown: 5, radius: 24, dps: 14, areaDuration: 3, throwRange: 1.1 },
    flavor: {
      autoName: 'Büyü Topu',
      autoDesc: 'Yavaş ama güçlü mermi',
      skillName: 'Alan Yakması',
      skillDesc: 'HEDEFİN altını 3 sn yakan alev çemberi fırlatır · 5 sn',
      skillIcon: 'pack/Items/Scroll/ScrollFire.png',
      perk: 'Bitki toplaması ×2 pot',
    },
  },
};
