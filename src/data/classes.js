// Karakter sınıfları (PLAN §5). Üç sınıf da oynanabilir (M6).
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
    gatherBonus: 'ore', // toplama uzmanlığı: madencilik ×2 hız
    auto: { type: 'melee', damage: 8, range: 24, arc: Math.PI * 1.1, cooldown: 0.55, swingTime: 0.18 },
    skill: { type: 'dash', speedMul: 4.6, duration: 0.16, cooldown: 2.2, damage: 12 },
    flavor: {
      autoName: 'Kılıç Savuruşu',
      autoDesc: 'Öndeki yay içindeki TÜM düşmanlara vurur',
      skillName: 'Atılma',
      skillDesc: 'İleri atılır, yoldaki düşmanlara hasar verir · 2.2 sn',
      skillIcon: 'pack/Items/Weapons/Ninjaku/Sprite.png',
      perk: 'Madencilik ×2 hız',
    },
  },
  nisanci: {
    id: 'nisanci',
    name: 'Nişancı',
    speed: 93, // kite bedava değil: Cengâver (95) açık alanda yavaşça kapatır
    radius: 5,
    hp: 85,
    sprite: 'hunter',
    charFolder: 'Hunter',
    botSprites: ['camoGreen', 'ninjaGreen'],
    gatherBonus: 'wood', // kereste ×2 hız
    auto: { type: 'projectile', damage: 7, range: 95, cooldown: 0.65, swingTime: 0.15, projSpeed: 230 },
    // Şaşmaz Ok: hedefi takip eder, KAÇIRMAZ (engel de durdurmaz) — bedeli uzun bekleme
    skill: { type: 'homingShot', cooldown: 8, damageMul: 2.5, projSpeedMul: 1.4, seekRange: 1.6 },
    flavor: {
      autoName: 'Ok',
      autoDesc: 'Uzaktan vurur; engellerin arkasına işlemez',
      skillName: 'Şaşmaz Ok',
      skillDesc: 'Hedefi takip eder, ASLA ıskalamaz · 2.5× hasar · 8 sn',
      skillIcon: 'pack/HUD/Arrow.png',
      perk: 'Kereste ×2 hız',
    },
  },
  ocakci: {
    id: 'ocakci',
    name: 'Ocakçı',
    speed: 91,
    radius: 5,
    hp: 100,
    sprite: 'sorcerer',
    charFolder: 'SorcererOrange',
    botSprites: ['mageBlack', 'ninjaDark'],
    gatherBonus: 'herb', // bitki verimi ×2
    auto: { type: 'projectile', damage: 12, range: 95, cooldown: 1.0, swingTime: 0.2, projSpeed: 180 },
    skill: { type: 'burnArea', cooldown: 5, radius: 24, dps: 14, areaDuration: 3, throwRange: 1.1 },
    flavor: {
      autoName: 'Büyü Topu',
      autoDesc: 'Yavaş ama güçlü mermi',
      skillName: 'Alan Yakması',
      skillDesc: 'HEDEFİN altını 3 sn yakan alev çemberi fırlatır · 5 sn',
      skillIcon: 'pack/Items/Scroll/ScrollFire.png',
      perk: 'Bitki/pot verimi ×2',
    },
  },
};
