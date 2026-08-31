// Build sonrası budama: dist/pack içinden OYUNUN KULLANDIĞI dosyalar dışındakileri
// siler (paket 50MB+; oyun ~2-3MB'lık dilim kullanıyor). npm run build bunu çağırır.
// Ayrıca dist/sw.js'teki __BUILD__ placeholder'ına build sürümünü yazar (SW cache adı).

import { readdirSync, readFileSync, statSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const DIST_PACK = join(DIST, 'pack');

// Kullanılan yolların ön ekleri (SHEETS + kart/lobi ikonları + sesler)
const KEEP = [
  'Actor/Characters/Shadow.png',
  ...['BlueNinja', 'Hunter', 'SorcererOrange', 'GladiatorBlue', 'NinjaRed', 'NinjaGray', 'NinjaGreen', 'NinjaDark', 'CamouflageGreen', 'NinjaMageBlack', 'FighterRed', 'MaskedNinja'].map(
    (n) => `Actor/Characters/${n}/SeparateAnim/`
  ),
  ...['Bamboo', 'Slime', 'Mushroom', 'Snake', 'Cyclope', 'Skull', 'SpiderRed', 'Dragon', 'Flam'].map(
    (n) => `Actor/Monsters/${n}/`
  ),
  'Backgrounds/Tilesets/TilesetFloor.png',
  'Backgrounds/Tilesets/TilesetField.png',
  'Backgrounds/Tilesets/TilesetWater.png',
  'Backgrounds/Tilesets/TilesetNature.png',
  'Items/Potion/LifePot.png',
  'Items/Potion/Medipack.png',
  'Items/Potion/Hear.png',
  ...['Ninjaku', 'Sword', 'Sword2', 'Sai', 'Lance', 'Lance2', 'BigSword', 'Bone', 'Whip', 'Hammer', 'Bow', 'Bow2', 'Katana', 'MagicWand'].map(
    (n) => `Items/Weapons/${n}/Sprite.png`
  ),
  'Items/Scroll/ScrollFire.png',
  'Items/Scroll/ScrollPlant.png',
  'Items/Scroll/ScrollThunder.png',
  'Items/Food/Beaf.png',
  'Items/Treasure/LittleTreasureChest.png',
  'HUD/Arrow.png',
  'HUD/Kunai.png',
  'FX/Magic/Shield/SpriteSheetBlue.png',
  // sfx.js'te kullanılan sesler (yalnız bunlar)
  ...['Sword', 'Hit5', 'Fireball', 'Fire', 'Hit2', 'Kill', 'PowerUp1', 'PowerUp2', 'Coin', 'Bonus', 'Success1', 'Success3', 'Strange', 'Alert', 'Alert2', 'GameOver2'].map(
    (n) => `Sounds/Game/${n}.wav`
  ),
  'Sounds/Menu/Accept.wav',
  'Sounds/Menu/Menu2.wav',
];

let removed = 0;
let kept = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(DIST_PACK, full);
    if (statSync(full).isDirectory()) {
      walk(full);
      if (readdirSync(full).length === 0) rmSync(full, { recursive: true });
    } else if (KEEP.some((k) => rel.startsWith(k))) {
      kept++;
    } else {
      unlinkSync(full);
      removed++;
    }
  }
}

walk(DIST_PACK);
console.log(`prune-dist: ${kept} dosya tutuldu, ${removed} dosya silindi`);

// --- SW cache sürümü: bundle hash'inden (dist/index.html'deki index-XXXX.js adı)
// türetilir; bulunamazsa build zamanı kullanılır. Her deploy → yeni cache adı →
// sw.js'in activate adımı eski cache'leri siler, cihazlar yeni sürümü görür.
const build = readFileSync(join(DIST, 'index.html'), 'utf8').match(/index-([\w-]+)\.js/)?.[1] ?? Date.now().toString(36);
const swPath = join(DIST, 'sw.js');
writeFileSync(swPath, readFileSync(swPath, 'utf8').replaceAll('__BUILD__', build));
console.log(`prune-dist: sw.js cache sürümü → cendere-${build}`);
