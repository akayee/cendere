// Karakter sınıfları (PLAN §5). Dört sınıf da oynanabilir (M6 + Kementçi).
// armor: taban zırh — spawn'da combat.mods.armor'a yazılır (entity.js); pickup/kart
//   zırhı üstüne eklenir. Değerler MÜTEVAZI (UI'da stat okunsun, denge kaymasın):
//   cengaver/ocakci/kementci 1 (dayanıklı kimlikler), nisanci 0 (cam top — kimliği mesafe).
//   Cengâver'in tank kimliğini zaten ARMOR pickup uzmanlığı (×2) taşıyor.
//   balance.mjs 40 maç (aynı seed'ler), galibiyet cengaver/nisanci/ocakci/kementci:
//   taban yok 25/7/5/3 · cengaver 2 zırhla 28/4/7/1 (baskın sınıf daha da güçlendi,
//   geri çekildi) · bu haliyle (1/0/1/1) 26/6/4/4 — önceki dağılımın bandında.
// pickupBonus: uzmanlık — o türdeki pickup'ın etkisini ×2 alır (temas toplaması)
// auto.type: 'melee' (yay içi alan) | 'projectile' (mermi — engel arkasına işlemez)
// skill.type: 'dash' (ileri atılma+hasar) | 'homingShot' (şaşmaz ok: hedef takipli, kaçırmaz)
//   | 'burnArea' (yerde kalan alev) | 'snareShot' (kement: düz skillshot, isabet YERE SABİTLER)
// flavor: lobi tanıtım metinleri — oynanışa etkisi yok, yalnızca UI

export const CLASSES = {
  cengaver: {
    id: 'cengaver',
    name: 'Cengâver',
    speed: 95,
    radius: 5,
    hp: 105,
    armor: 1, // tank kimliği; 2 denendi ama zaten baskın sınıfı daha da güçlendirdi (aşağıdaki balans notu)
    sprite: 'ninja',
    charFolder: 'BlueNinja', // lobi karakter önizlemesi
    botSprites: ['ninjaRed', 'ninjaGray'],
    pickupBonus: 'armor', // uzmanlık: zırh pickup'ı ona +2 verir (×2 etki)
    // damage 8 → 10 ve range 24 → 26: buff (kullanıcı isteği) — zırh taban oranı
    // düzeltmesi zırh istifini kırpınca Cengâver'in tank kimliği zayıfladı; açık
    // bu iki dokunuşla telafi edildi. balance.mjs (120 maç) kalibrasyonu:
    // cd 0.52 + range 26 → %57 (band aşıldı, geri çekildi); bu hali ~%52 (%50-55 bandı)
    auto: { type: 'melee', damage: 10, range: 26, arc: Math.PI * 1.1, cooldown: 0.55, swingTime: 0.18 },
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
      perk: 'ARMOR toplaması ×2 etki',
    },
  },
  nisanci: {
    id: 'nisanci',
    name: 'Nişancı',
    speed: 93, // kite bedava değil: Cengâver (95) açık alanda yavaşça kapatır
    radius: 5,
    hp: 80,
    armor: 0, // cam top: savunması mesafesi, zırhı yok
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
      perk: 'AD toplaması ×2 etki',
    },
  },
  ocakci: {
    id: 'ocakci',
    name: 'Ocakçı',
    speed: 91,
    radius: 5,
    hp: 115,
    armor: 1, // 115 hp'li dayanıklı büyücü: hafif taban zırh
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
  kementci: {
    id: 'kementci',
    name: 'Kementçi',
    speed: 94, // hız uzmanının tabanı da çevik — ama Cengâver'i (95) geçmez
    radius: 5,
    hp: 95, // Nişancı (80) ile Ocakçı (115) arası: kontrolcü ama cam değil
    armor: 1, // "cam değil" kimliğinin stat karşılığı: hafif taban zırh
    sprite: 'kementci',
    charFolder: 'GladiatorBlue', // retiarius teması: ağ/kement atan gladyatör
    botSprites: ['fighterRed', 'maskedNinja'],
    pickupBonus: 'speed', // uzmanlık: hız pickup'ı etkisi ×2 (sayaç yine 1 artar)
    // Auto: iki uzakçının ARASI — Nişancı (7 dmg/0.72 cd/230 hız) < zıpkın < Ocakçı (13/0.85/190)
    auto: { type: 'projectile', damage: 10, range: 95, cooldown: 0.78, swingTime: 0.17, projSpeed: 210 },
    // Kement: düz skillshot — isabet hedefi rootDuration sn YERE SABİTLER (hareket yok;
    // saldırı/beceri serbest — uygulaması combat/movementSystem'de motion.root).
    // Hasar sembolik: gücü kontroldedir. Normal autolardan hızlı (taban 300) + geniş
    // çarpışma yarıçapı (2.5) → tutturması kolay; ama düz uçar ve engele takılır →
    // ıskalanabilir. Mermi hızı Kementçi'nin GÜNCEL hareket hızıyla ölçeklenir:
    // taban × (motion.speed / baseSpeed) — SPEED uzmanlığıyla sinerji (combatSystem).
    // Pranga (skillSlow) Kement'e İŞLEMEZ: root varken slow anlamsız (cards.js classExclude).
    // rangeMul: hedef arama menzili = auto.range × bu (≈128) — Şaşmaz Ok deseni:
    // menzilde hedef yoksa harcanmaz.
    skill: { type: 'snareShot', cooldown: 7, damage: 4, projSpeed: 300, projRadius: 2.5, rootDuration: 1.3, rangeMul: 1.35 },
    flavor: {
      autoName: 'Zıpkın',
      autoDesc: 'Uzaktan vurur; engellerin arkasına işlemez',
      skillName: 'Kement',
      skillDesc: 'Düz fırlatılır; isabet 1.3 sn YERE SABİTLER (rakip saldırabilir) · hızınla hızlanır · 7 sn',
      skillIcon: 'pack/Items/Weapons/Whip/Sprite.png',
      perk: 'SPEED toplaması ×2 etki',
    },
  },
};
