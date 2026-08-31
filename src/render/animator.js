// animState (sim etiketi) → atlas karesi. Kare seçimini SADECE bu dosya bilir.

import { CHAR_ANIMS, DIR_COL } from './atlasData.js';

// Hasar tint'i için tek scratch canvas (her karakter için yeniden kullanılır)
const scratch = document.createElement('canvas');
scratch.width = 32;
scratch.height = 32;
const sctx = scratch.getContext('2d');

// Eşik ödülü aura renkleri (sim 'atk'/'armor'/'speed' etiketi yazar, yorumu burada)
const AURA_COLORS = {
  atk: '#ff7a3d', // turuncu-kızıl: saldırı ustası
  armor: '#9db8d9', // mavi-gri: zırh ustası
  speed: '#cfeeff', // açık mavi/beyaz: hız ustası
};

/** Kalıcı eşik auraları: ayak hizasında iç içe, yavaşça dönen kesikli halkalar.
 *  Birden fazla milestone üst üste okunur kalsın diye her etiket kendi yarıçapında.
 *  Sim {type, tier} yazar: kademe yükseldikçe halka hafifçe belirginleşir
 *  (parça sayısı + parlaklık artar — abartısız, okunabilirlik önce). */
function drawAuras(ctx, auras, x, y, timeSec) {
  for (let i = 0; i < auras.length; i++) {
    const color = AURA_COLORS[auras[i].type];
    if (!color) continue;
    const tier = auras[i].tier ?? 1;
    const r = 8 + i * 3;
    const spin = timeSec * (i % 2 === 0 ? 1.4 : -1.1); // halkalar zıt yönlerde döner
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.38 + tier * 0.06; // kademe 1: 0.44 → kademe 4: 0.62
    // Kesikli halka: kademe başına bir parça daha (3..6) — yerde, hafif basık
    const segs = 2 + tier;
    for (let s = 0; s < segs; s++) {
      const a0 = spin + (s / segs) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 1, r, r * 0.45, 0, a0, a0 + (Math.PI * 2) / segs * 0.66);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

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

  // Eşik ödülü auraları: kalıcı, HERKESE görünür (güç görünürdür — PLAN §6 felsefesi)
  if (ent.render.auras?.length > 0 && !broken) drawAuras(ctx, ent.render.auras, x, y, timeSec);

  // KEMENT (root): ayak hizasında halat halkası + kazık düğümleri — sabitlenen
  // HERKESE okunur ("şimdi bas" istihbaratı; zehir görünürlüğüyle aynı felsefe)
  if (ent.motion?.root && !broken) {
    ctx.strokeStyle = '#e0b36a';
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y) + 1, 6.5, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8a5a2b';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.fillRect(Math.round(x + Math.cos(a) * 6.5) - 1, Math.round(y + 1 + Math.sin(a) * 3) - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

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

  // Hasar flaşı: sprite silüetini KIRMIZIYA boyayıp üstüne bindir (~0.15 sn).
  // Tek scratch canvas yeniden kullanılır — her karede yeni canvas YOK (mobil perf).
  if (ent.health?.hurtT > 0) {
    sctx.clearRect(0, 0, set.frameW, set.frameH);
    sctx.globalCompositeOperation = 'source-over';
    sctx.drawImage(img, col * set.frameW, frame * set.frameH, set.frameW, set.frameH, 0, 0, set.frameW, set.frameH);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = 'rgba(255,56,44,0.7)';
    sctx.fillRect(0, 0, set.frameW, set.frameH);
    ctx.drawImage(scratch, 0, 0, set.frameW, set.frameH, dx, dy, set.frameW, set.frameH);
  }
}
