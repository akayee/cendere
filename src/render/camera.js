// Kamera: hedefi yumuşak takip eder, harita sınırına yaslanır.

import { clamp, lerp } from '../core/vec2.js';

const FOLLOW = 0.12; // takip yumuşaklığı (kare başına lerp katsayısı)

export function createCamera(zoom) {
  return { x: 0, y: 0, zoom, shake: 0 };
}

/** Vuruş hissi: kısa kamera sarsıntısı (render süsü — sim habersiz). */
export function addShake(cam, amount) {
  cam.shake = Math.min(cam.shake + amount, 6);
}

export function snapCamera(cam, x, y) {
  cam.x = x;
  cam.y = y;
}

export function followCamera(cam, targetX, targetY, map, viewW, viewH) {
  cam.x = lerp(cam.x, targetX, FOLLOW);
  cam.y = lerp(cam.y, targetY, FOLLOW);

  const halfW = viewW / cam.zoom / 2;
  const halfH = viewH / cam.zoom / 2;
  cam.x = clamp(cam.x, halfW, map.widthPx - halfW);
  cam.y = clamp(cam.y, halfH, map.heightPx - halfH);
}

/** Ekran koordinatına geçiş: ctx'e kamera dönüşümünü uygular. */
export function applyCamera(ctx, cam, viewW, viewH) {
  let sx = 0;
  let sy = 0;
  if (cam.shake > 0.1) {
    sx = (Math.random() * 2 - 1) * cam.shake;
    sy = (Math.random() * 2 - 1) * cam.shake;
    cam.shake *= 0.86;
  } else {
    cam.shake = 0;
  }
  ctx.setTransform(
    cam.zoom, 0, 0, cam.zoom,
    Math.round(viewW / 2 - (cam.x + sx) * cam.zoom),
    Math.round(viewH / 2 - (cam.y + sy) * cam.zoom)
  );
}

export function viewRect(cam, viewW, viewH, pad = 24) {
  const halfW = viewW / cam.zoom / 2;
  const halfH = viewH / cam.zoom / 2;
  return {
    minX: cam.x - halfW - pad,
    minY: cam.y - halfH - pad,
    maxX: cam.x + halfW + pad,
    maxY: cam.y + halfH + pad,
  };
}
