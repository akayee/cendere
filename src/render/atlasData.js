// Asset koordinat sözlüğü. Sprite paketi değişirse SADECE bu dosya (ve PNG'ler) değişir.
// Kaynak: NinjaAdventure asset pack (CC0) — assets/pack/

const CHAR = (name) => ({
  walk: `pack/Actor/Characters/${name}/SeparateAnim/Walk.png`,
  idle: `pack/Actor/Characters/${name}/SeparateAnim/Idle.png`,
  attack: `pack/Actor/Characters/${name}/SeparateAnim/Attack.png`,
});

// Karakter sprite setleri: etiket → klasör (insan + bot varyantları)
const CHAR_SHEETS = {
  ninja: CHAR('BlueNinja'),
  hunter: CHAR('Hunter'),
  sorcerer: CHAR('SorcererOrange'),
  ninjaRed: CHAR('NinjaRed'),
  ninjaGray: CHAR('NinjaGray'),
  ninjaGreen: CHAR('NinjaGreen'),
  ninjaDark: CHAR('NinjaDark'),
  camoGreen: CHAR('CamouflageGreen'),
  mageBlack: CHAR('NinjaMageBlack'),
};

export const SHEETS = {
  shadow: 'pack/Actor/Characters/Shadow.png',
  dummy: 'pack/Actor/Monsters/Bamboo/SpriteSheet.png',
  slime: 'pack/Actor/Monsters/Slime/Slime.png',
  mushroom: 'pack/Actor/Monsters/Mushroom/mushroom.png',
  snake: 'pack/Actor/Monsters/Snake/Snake.png',
  cyclope: 'pack/Actor/Monsters/Cyclope/SpriteSheet.png',
  skull: 'pack/Actor/Monsters/Skull/SpriteSheet.png',
  spider: 'pack/Actor/Monsters/SpiderRed/SpriteSheet.png',
  dragon: 'pack/Actor/Monsters/Dragon/SpriteSheet.png',
  flam: 'pack/Actor/Monsters/Flam/SpriteSheet.png',
  chest: 'pack/Items/Treasure/LittleTreasureChest.png',
  swordItem: 'pack/Items/Weapons/Sword/Sprite.png',
  shieldFx: 'pack/FX/Magic/Shield/SpriteSheetBlue.png',
  lifePot: 'pack/Items/Potion/LifePot.png',
  floor: 'pack/Backgrounds/Tilesets/TilesetFloor.png',
  field: 'pack/Backgrounds/Tilesets/TilesetField.png',
  water: 'pack/Backgrounds/Tilesets/TilesetWater.png',
  nature: 'pack/Backgrounds/Tilesets/TilesetNature.png',
};
for (const [key, set] of Object.entries(CHAR_SHEETS)) {
  SHEETS[key + 'Walk'] = set.walk;
  SHEETS[key + 'Idle'] = set.idle;
  SHEETS[key + 'Attack'] = set.attack;
}

// --- Zemin -------------------------------------------------------------
// TilesetField: açık yeşil 3x3 blok (y=48..96). Orta karo = düz çim.
export const GROUND = {
  grass: { sheet: 'field', x: 16, y: 64 },
  // Seyrek serpiştirilen dokulu çim varyantları
  grassVariants: [
    { sheet: 'field', x: 48, y: 48 },
    { sheet: 'field', x: 64, y: 48 },
    { sheet: 'field', x: 48, y: 64 },
    { sheet: 'field', x: 64, y: 64 },
  ],
  variantChance: 0.07,
  // 9'lu bloklar: sol-üst köşe koordinatı (3x3 karo, kenar+köşe+merkez)
  dirt9: { sheet: 'floor', x: 0, y: 128 },
  water9: { sheet: 'water', x: 0, y: 96 },
};

// --- Statik objeler ve süsler -----------------------------------------
// anchorX/Y: sprite içinde "ayak noktası" — dünya pozisyonuna bu nokta oturur.
// sortYOff: y-sıralamada kullanılacak ofset (ayak noktasına göre).
export const PROPS = {
  tree: { sheet: 'nature', x: 0, y: 0, w: 32, h: 32, anchorX: 16, anchorY: 29 },
  tree2: { sheet: 'nature', x: 96, y: 0, w: 32, h: 32, anchorX: 16, anchorY: 29 },
  rockBig: { sheet: 'nature', x: 192, y: 80, w: 64, h: 48, anchorX: 32, anchorY: 42 },
  rockSmall: { sheet: 'nature', x: 240, y: 128, w: 16, h: 32, anchorX: 8, anchorY: 26 },
  bush: { sheet: 'nature', x: 16, y: 160, w: 16, h: 16, anchorX: 8, anchorY: 14 },
  flower: { sheet: 'nature', x: 96, y: 176, w: 16, h: 16, anchorX: 8, anchorY: 14 },
  stone: { sheet: 'nature', x: 48, y: 176, w: 16, h: 16, anchorX: 8, anchorY: 14 },
  stump: { sheet: 'nature', x: 64, y: 128, w: 16, h: 16, anchorX: 8, anchorY: 13 },
  grassTuft: { sheet: 'nature', x: 80, y: 160, w: 16, h: 16, anchorX: 8, anchorY: 14 },
};

// Yerdeki pickup'lar (sim resType → sembol). Her sembol ETKİSİNİ anlatır ve
// renderer'da ayrı katmanda süzülerek YAVAŞÇA döner (spin: true olanlar) —
// y-sıralı dünya objelerinden görsel olarak ayrık dursun diye.
export const RESOURCE_PROPS = {
  atk: { sheet: 'swordItem', x: 0, y: 0, w: 6, h: 17, spin: true }, // AD = kılıç (AD kartlarıyla aynı dil)
  armor: { sheet: 'shieldFx', x: 0, y: 0, w: 24, h: 26, spin: true }, // ARMOR = kalkan
  herb: { sheet: 'lifePot', x: 0, y: 0, w: 9, h: 11, spin: true }, // +1 pot = pot şişesi
  speed: { sheet: 'bootGen', x: 0, y: 0, w: 12, h: 12, spin: true }, // SPEED = çizme (HUD 👢 ve SPEED kartlarıyla aynı dil)
  kese: { sheet: 'chest', x: 0, y: 0, w: 16, h: 16, spin: false }, // Ganimet Kesesi (sandık) — dönmez, sadece süzülür
};

// --- Kod-çizim sprite: ÇİZME (SPEED pickup'ı) --------------------------
// NinjaAdventure paketinde çizme/ayakkabı sprite'ı YOK; SPEED'in görsel dili
// (yerde çizme + HUD/kartlarda 👢) tutarlı kalsın diye küçük pikselli bir çizme
// silüeti BİR KEZ offscreen canvas'a basılır ve normal sheet gibi kullanılır
// (mobil perf: her karede path çizimi yerine tek drawImage). main.js yüklemede
// images sözlüğüne 'bootGen' anahtarıyla ekler.
export function makeBootSprite() {
  // Piksel haritası: o=koyu kontur, b=deri, h=parlak vurgu, s=taban
  const PALETTE = { o: '#3b2314', b: '#9c672f', h: '#d69a55', s: '#26170a' };
  const ROWS = [
    '............',
    '.oooo.......',
    '.obbho......',
    '.obbho......',
    '.obbho......',
    '.obbbo......',
    '.obbbooo....',
    '.obbbbbbo...',
    '.obbbbbbbo..',
    '.osssssssso.',
    '..oooooooo..',
    '............',
  ];
  const c = document.createElement('canvas');
  c.width = 12;
  c.height = 12;
  const ctx = c.getContext('2d');
  ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

// --- Karakter animasyonları -------------------------------------------
// SeparateAnim düzeni: 16x16 kareler, sütun = yön (down, up, left, right).
export const DIR_COL = { down: 0, up: 1, left: 2, right: 3 };

export const CHAR_ANIMS = {
  dummy: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'dummy', frames: 4, fps: 2 },
    walk: { sheet: 'dummy', frames: 4, fps: 2 },
  },
  slime: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'slime', frames: 4, fps: 3 },
    walk: { sheet: 'slime', frames: 4, fps: 7 },
  },
  mushroom: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'mushroom', frames: 4, fps: 3 },
    walk: { sheet: 'mushroom', frames: 4, fps: 7 },
  },
  snake: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'snake', frames: 4, fps: 3 },
    walk: { sheet: 'snake', frames: 4, fps: 8 },
  },
  cyclope: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'cyclope', frames: 4, fps: 3 },
    walk: { sheet: 'cyclope', frames: 4, fps: 7 },
  },
  skull: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'skull', frames: 4, fps: 3 },
    walk: { sheet: 'skull', frames: 4, fps: 8 },
  },
  spider: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'spider', frames: 4, fps: 4 },
    walk: { sheet: 'spider', frames: 4, fps: 9 },
  },
  dragon: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'dragon', frames: 4, fps: 3 },
    walk: { sheet: 'dragon', frames: 4, fps: 6 },
  },
  flam: {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: 'flam', frames: 4, fps: 6 },
    walk: { sheet: 'flam', frames: 4, fps: 10 },
  },
};

// İnsan/bot karakter setleri: hepsi aynı SeparateAnim düzeni (16px, 4 yön sütunu)
for (const key of ['ninja', 'hunter', 'sorcerer', 'ninjaRed', 'ninjaGray', 'ninjaGreen', 'ninjaDark', 'camoGreen', 'mageBlack']) {
  CHAR_ANIMS[key] = {
    frameW: 16,
    frameH: 16,
    anchorX: 8,
    anchorY: 14,
    idle: { sheet: key + 'Idle', frames: 1, fps: 1 },
    walk: { sheet: key + 'Walk', frames: 4, fps: 9 },
    attack: { sheet: key + 'Attack', frames: 1, fps: 1 },
  };
}
