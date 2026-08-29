// Zemin: maç başında TEK offscreen canvas'a basılır, sonra her karede
// yalnızca görünen dikdörtgeni kopyalanır (ARCHITECTURE.md §9).

import { mulberry32 } from '../core/rng.js';
import { GROUND } from './atlasData.js';

const T = 16;

export function buildGroundCanvas(map, images) {
  const canvas = document.createElement('canvas');
  canvas.width = map.widthPx;
  canvas.height = map.heightPx;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const rng = mulberry32(map.groundSeed);
  const grassImg = images.get(GROUND.grass.sheet);

  // Taban çim + seyrek varyant
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      let tile = GROUND.grass;
      if (rng() < GROUND.variantChance) {
        tile = GROUND.grassVariants[Math.floor(rng() * GROUND.grassVariants.length)];
      }
      ctx.drawImage(images.get(tile.sheet) ?? grassImg, tile.x, tile.y, T, T, tx * T, ty * T, T, T);
    }
  }

  // Toprak yamaları ve göller: 9'lu blok (köşe/kenar/merkez)
  for (const p of map.dirtPatches) drawNine(ctx, images, GROUND.dirt9, p.tx, p.ty, p.tw, p.th);
  for (const l of map.lakes) drawNine(ctx, images, GROUND.water9, l.tx, l.ty, l.tw, l.th);

  return canvas;
}

/** 3x3 kaynak bloğunu (köşe+kenar+merkez) tw x th karoluk alana döşer. */
function drawNine(ctx, images, nine, tx, ty, tw, th) {
  const img = images.get(nine.sheet);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const col = x === 0 ? 0 : x === tw - 1 ? 2 : 1;
      const row = y === 0 ? 0 : y === th - 1 ? 2 : 1;
      ctx.drawImage(img, nine.x + col * T, nine.y + row * T, T, T, (tx + x) * T, (ty + y) * T, T, T);
    }
  }
}

/** Görünür alanı hedef ctx'e kopyalar (kamera dönüşümü uygulanmış olmalı). */
export function drawGround(ctx, groundCanvas, view) {
  const sx = Math.max(0, view.minX);
  const sy = Math.max(0, view.minY);
  const sw = Math.min(groundCanvas.width, view.maxX) - sx;
  const sh = Math.min(groundCanvas.height, view.maxY) - sy;
  if (sw <= 0 || sh <= 0) return;
  ctx.drawImage(groundCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
}
