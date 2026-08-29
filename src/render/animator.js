// animState (sim etiketi) → atlas karesi. Kare seçimini SADECE bu dosya bilir.

import { CHAR_ANIMS, DIR_COL } from './atlasData.js';

// Hasar tint'i için tek scratch canvas (her karakter için yeniden kullanılır)
const scratch = document.createElement('canvas');
scratch.width = 32;
scratch.height = 32;
const sctx = scratch.getContext('2d');

export function drawCharacter(ctx, images, ent, x, y, timeSec) {
  const set = CHAR_ANIMS[ent.render.sprite];
  if (!set) return;

  // Saldırı animasyonu sim'in swing zamanlayıcısından türetilir
  let state = ent.render.animState;
  if (ent.combat?.swingT > 0 && set.attack) state = 'attack';

  const anim = set[state] ?? set.idle;
  const img = images.get(anim.sheet);
  const col = DIR_COL[ent.transform.dir] ?? 0;
  const frame = anim.frames > 1 ? Math.floor(timeSec * anim.fps) % anim.frames : 0;

  const dx = Math.round(x - set.anchorX);
  const dy = Math.round(y - set.anchorY);

  // Kırık kukla soluk görünür (onarım bekliyor)
  const broken = ent.health?.brokenT > 0;
  if (broken) ctx.globalAlpha = 0.4;

  // Basit gölge — zemine oturma hissi
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y) + 1.5, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.drawImage(
    img,
    col * set.frameW, frame * set.frameH, set.frameW, set.frameH,
    dx, dy, set.frameW, set.frameH
  );

  if (broken) {
    ctx.globalAlpha = 1;
    return; // kırıkken hasar flash'ı yok
  }

  // Zehir: kalıcı yeşil ton — HERKES görür (bilgi mekaniği, PLAN §9)
  if (ent.health?.poison) {
    sctx.clearRect(0, 0, set.frameW, set.frameH);
    sctx.globalCompositeOperation = 'source-over';
    sctx.drawImage(img, col * set.frameW, frame * set.frameH, set.frameW, set.frameH, 0, 0, set.frameW, set.frameH);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = 'rgba(90,220,80,0.45)';
    sctx.fillRect(0, 0, set.frameW, set.frameH);
    ctx.drawImage(scratch, 0, 0, set.frameW, set.frameH, dx, dy, set.frameW, set.frameH);
    // Baloncuk
    const bub = (timeSec * 2) % 1;
    ctx.fillStyle = `rgba(120,232,74,${0.7 - bub * 0.6})`;
    ctx.beginPath();
    ctx.arc(dx + 4 + ((timeSec * 7) % 8), dy - 1 - bub * 5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hasar yanıp sönmesi: sprite silüetini beyaza boyayıp üstüne bindir
  if (ent.health?.hurtT > 0) {
    sctx.clearRect(0, 0, set.frameW, set.frameH);
    sctx.globalCompositeOperation = 'source-over';
    sctx.drawImage(img, col * set.frameW, frame * set.frameH, set.frameW, set.frameH, 0, 0, set.frameW, set.frameH);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = 'rgba(255,255,255,0.75)';
    sctx.fillRect(0, 0, set.frameW, set.frameH);
    ctx.drawImage(scratch, 0, 0, set.frameW, set.frameH, dx, dy, set.frameW, set.frameH);
  }
}
