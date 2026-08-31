// Çizim orkestrasyonu: zemin → y-sıralı dünya objeleri → (ileride) efektler.
// Sim state'ini OKUR, asla yazmaz (ARCHITECTURE.md §9).

import { applyCamera, viewRect } from './camera.js';
import { drawCharacter } from './animator.js';
import { buildGroundCanvas, drawGround } from './tileRenderer.js';
import { PROPS, RESOURCE_PROPS } from './atlasData.js';
import { drawZones } from './zoneOverlay.js';
import { lerp } from '../core/vec2.js';
import { xpForLevel } from '../data/balance.js'; // veri katmanı importu serbest (XP oranı için)

export function createRenderer(canvas, images, map, effects) {
  const ctx = canvas.getContext('2d', { alpha: false }); // main ile aynı context (opak — mobilde ucuz)
  const groundCanvas = buildGroundCanvas(map, images);

  // Statik + süs çizim listesi bir kere kurulur: {def, x, y, sortY}
  const worldSprites = [];
  for (const s of map.statics) {
    if (s.type === 'water') continue; // su, zemine basılı
    let def = PROPS[s.type];
    // Ağaç çeşitliliği: pozisyondan türetilen deterministik seçim (sim habersiz)
    if (s.type === 'tree' && (Math.floor(s.x) + Math.floor(s.y)) % 3 === 0) def = PROPS.tree2;
    if (def) worldSprites.push({ def, x: s.x, y: s.y, sortY: s.y });
  }
  for (const d of map.decors) {
    const def = PROPS[d.type];
    if (def) worldSprites.push({ def, x: d.x, y: d.y, sortY: d.y });
  }
  worldSprites.sort((a, b) => a.sortY - b.sortY);

  const drawList = [];

  // highlightId: app'in geçtiği "şu entity vurgulu" bilgisi (geri sayımda oyuncu
  // yanıp söner — spawn vurgusu). Sim habersiz; 0 = vurgu yok.
  function render(world, cam, alpha, timeSec, viewW, viewH, highlightId = 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, viewW, viewH);

    applyCamera(ctx, cam, viewW, viewH);
    const view = viewRect(cam, viewW, viewH, 48);

    drawGround(ctx, groundCanvas, view);

    // Görünürdeki sprite'ları topla (statikler önceden sıralı → filtre sırayı korur)
    drawList.length = 0;
    for (const s of worldSprites) {
      if (s.x < view.minX || s.x > view.maxX || s.y < view.minY || s.y > view.maxY) continue;
      drawList.push(s);
    }

    // Pickup'lar: etkilerini anlatan, yerde süzülüp YAVAŞÇA dönen semboller.
    // Döndükleri için y-sıralamaya girmezler; karakterlerin altında kalsınlar
    // diye dünya objelerinden ÖNCE çizilirler (viewport culling aynen geçerli).
    drawPickups(world, view, timeSec);

    // Hareketlileri araya y-sıralamayla kat
    for (const ent of world.movers) {
      const t = ent.transform;
      const ix = lerp(t.prevX, t.x, alpha);
      const iy = lerp(t.prevY, t.y, alpha);
      drawList.push({ ent, x: ix, y: iy, sortY: iy });
    }
    drawList.sort((a, b) => a.sortY - b.sortY);

    for (const item of drawList) {
      if (item.ent) {
        // Vurgulu entity ~4 Hz opaklık dalgasıyla yanıp söner (görünür↔silik)
        const blink = highlightId !== 0 && item.ent.id === highlightId;
        if (blink) ctx.globalAlpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(timeSec * Math.PI * 8));
        drawCharacter(ctx, images, item.ent, item.x, item.y, timeSec);
        if (blink) ctx.globalAlpha = 1;
      } else {
        const d = item.def;
        ctx.drawImage(
          images.get(d.sheet),
          d.x, d.y, d.w, d.h,
          Math.round(item.x - d.anchorX), Math.round(item.y - d.anchorY), d.w, d.h
        );
      }
    }

    // Hasar alanları (Ocakçı alevi) — zeminde, karakterlerin altında kalsın diye önce
    for (const a of world.areas) {
      const flicker = 0.5 + 0.2 * Math.sin(timeSec * 14);
      ctx.fillStyle = `rgba(255,120,40,${0.22 * flicker + 0.1})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,170,60,${flicker})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Mermiler
    for (const p of world.projectiles) {
      if (p.kind === 'kement') {
        // Kement: dönen halat halkası + kısa ip izi — skillshot uzaktan okunur
        const a = Math.atan2(p.vy, p.vx);
        ctx.strokeStyle = 'rgba(224,179,106,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(a) * 10, p.y - Math.sin(a) * 10);
        ctx.lineTo(p.x - Math.cos(a) * 3, p.y - Math.sin(a) * 3);
        ctx.stroke();
        ctx.strokeStyle = '#e0b36a';
        ctx.lineWidth = 1.6;
        const squish = 0.6 + 0.4 * Math.abs(Math.sin(timeSec * 12)); // dönüş yanılsaması
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 3.2, 3.2 * squish, a, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'zipkin') {
        // Zıpkın (Kementçi auto): uzun çelik gövde + dolgun üçgen başlık + geriye
        // dönük çapa dişleri — okun ince çizgisinden ve büyü topundan net ayrışır
        const a = Math.atan2(p.vy, p.vx);
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        ctx.strokeStyle = '#6b7b8c'; // koyu çelik sap
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p.x - ca * 11, p.y - sa * 11);
        ctx.lineTo(p.x - ca * 2, p.y - sa * 2);
        ctx.stroke();
        ctx.fillStyle = '#cfe3f2'; // parlak uç
        ctx.beginPath();
        ctx.moveTo(p.x + ca * 4.5, p.y + sa * 4.5); // sivri burun
        ctx.lineTo(p.x - ca * 2 - sa * 2.2, p.y - sa * 2 + ca * 2.2);
        ctx.lineTo(p.x - ca * 2 + sa * 2.2, p.y - sa * 2 - ca * 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#cfe3f2'; // çapa dişleri (zıpkın imzası)
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - ca * 1, p.y - sa * 1);
        ctx.lineTo(p.x - ca * 4.5 - sa * 3, p.y - sa * 4.5 + ca * 3);
        ctx.moveTo(p.x - ca * 1, p.y - sa * 1);
        ctx.lineTo(p.x - ca * 4.5 + sa * 3, p.y - sa * 4.5 - ca * 3);
        ctx.stroke();
      } else if (p.kind === 'bolt') {
        ctx.fillStyle = '#ffb545';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,120,0.45)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const homing = p.kind === 'homingArrow';
        const len = homing ? 8 : 6;
        const a = Math.atan2(p.vy, p.vx);
        if (homing) {
          ctx.fillStyle = 'rgba(255,215,94,0.35)'; // Şaşmaz Ok: altın iz
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = homing ? '#ffd75e' : '#e8dcb8';
        ctx.lineWidth = homing ? 2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(a) * len, p.y - Math.sin(a) * len);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    // Kanal ilerleme barı (yalnız yoğunlaşma — toplama artık temasla anında).
    // Ayak ALTINDA durur: baş üstü artık isim/can/XP bloğuna ait (çakışma olmasın).
    for (const ent of world.movers) {
      const ch = ent.gather?.channel;
      if (!ch) continue;
      const t = ent.transform;
      const w = 16;
      const frac = Math.min(1, ch.t / ch.duration);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(t.x - w / 2, t.y + 5, w, 2.5);
      ctx.fillStyle = '#7ee8a0';
      ctx.fillRect(t.x - w / 2, t.y + 5, w * frac, 2.5);
    }

    // Baş üstü katmanı: kendi karakterin (isim + can + ince XP barı), rakip
    // oyuncular (soluk isim + can barı), hasarlı mob/kuklalar (yalnız minik can
    // barı — İSİMSİZ). İnterpolasyonlu pozisyon: sprite'la birlikte kayar.
    ctx.textAlign = 'center';
    for (const ent of world.movers) {
      if (ent.dead) continue;
      const isMe = ent.id === world.playerId;
      const isRival = ent.kind === 'player' && !isMe;
      const damagedMob = (ent.kind === 'mob' || ent.kind === 'dummy') && ent.health.hp < ent.health.maxHp;
      if (!isMe && !isRival && !damagedMob) continue;
      const t = ent.transform;
      const ix = lerp(t.prevX, t.x, alpha);
      const iy = lerp(t.prevY, t.y, alpha);
      if (ix < view.minX || ix > view.maxX || iy < view.minY || iy > view.maxY) continue;
      const frac = Math.max(0, ent.health.hp / ent.health.maxHp);

      if (damagedMob) {
        const w = 12;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(ix - w / 2, iy - 19, w, 2.5);
        ctx.fillStyle = frac > 0.4 ? '#6ee86e' : '#e85a5a';
        ctx.fillRect(ix - w / 2, iy - 19, w * frac, 2.5);
        continue;
      }

      // İsim: minik gölge kopyası + asıl yazı (text-shadow dili; shadowBlur mobilde pahalı)
      const name = ent.name ?? '';
      const nameY = isMe ? iy - 25 : iy - 22.8;
      ctx.font = isMe ? 'bold 4.5px monospace' : 'bold 3.5px monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillText(name, ix + 0.4, nameY + 0.4);
      ctx.fillStyle = isMe ? '#ffffff' : 'rgba(255,255,255,0.72)';
      ctx.fillText(name, ix, nameY);

      // Can barı (mevcut bar diliyle: koyu zemin + yeşil→kırmızı; rakipte turuncu)
      const w = isMe ? 17 : 16;
      const hpY = isMe ? iy - 23.5 : iy - 21.5;
      const hpH = isMe ? 2.4 : 2.2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(ix - w / 2, hpY, w, hpH);
      ctx.fillStyle = isRival ? '#ff8c5a' : frac > 0.4 ? '#6ee86e' : '#e85a5a';
      ctx.fillRect(ix - w / 2, hpY, w * frac, hpH);

      // Kendi karakterinde canın hemen altında daha ince ALTIN XP barı
      if (isMe && ent.progress) {
        const xpFrac = Math.min(1, ent.progress.xp / xpForLevel(ent.progress.level));
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(ix - w / 2, iy - 20.4, w, 1.2);
        ctx.fillStyle = '#ffd75e';
        ctx.fillRect(ix - w / 2, iy - 20.4, w * xpFrac, 1.2);
      }
    }
    ctx.textAlign = 'left';

    if (effects) effects.draw(ctx);

    drawZones(ctx, world, view, timeSec);

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    drawRivalArrows(ctx, world, cam, viewW, viewH);
  }

  /** Pickup sembolleri: hafif yukarı-aşağı süzülme + ~0.8 rad/sn dönüş + yer gölgesi. */
  function drawPickups(world, view, timeSec) {
    for (const res of world.resources) {
      const t = res.transform;
      if (t.x < view.minX || t.x > view.maxX || t.y < view.minY || t.y > view.maxY) continue;
      const def = RESOURCE_PROPS[res.resType];
      if (!def) continue;

      // Faz pozisyondan türetilir: semboller senkron dönmesin (deterministik, sim habersiz)
      const phase = t.x * 0.7 + t.y * 1.3;
      const bob = Math.sin(timeSec * 2 + phase) * 1.5;

      // Yer gölgesi: süzülme yüksekliğiyle hafifçe nefes alır — yer hissi korunur
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 2, 5 - bob * 0.7, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(t.x, t.y - def.h / 2 - 3 + bob); // dönüş merkezi = sembolün ortası
      if (def.spin) ctx.rotate(timeSec * 0.8 + phase);
      ctx.drawImage(images.get(def.sheet), def.x, def.y, def.w, def.h, -def.w / 2, -def.h / 2, def.w, def.h);
      ctx.restore();
    }
  }

  /** Yakındaki (≤400) ama ekran dışındaki rakipler için kenar okları. */
  function drawRivalArrows(ctx, world, cam, viewW, viewH) {
    const me = world.entities.get(world.playerId);
    if (!me) return;
    const s = cam.zoom / 3; // canvas ölçeği (dpr + piksel bütçesi): ok her cihazda aynı boyda görünsün
    const margin = 30 * s;
    for (const ent of world.movers) {
      if (ent.kind !== 'player' || ent.id === world.playerId || ent.dead) continue;
      const dx = ent.transform.x - me.transform.x;
      const dy = ent.transform.y - me.transform.y;
      const d = Math.hypot(dx, dy);
      if (d > 400) continue;
      // Ekranda görünüyorsa ok çizme
      const sx = viewW / 2 + (ent.transform.x - cam.x) * cam.zoom;
      const sy = viewH / 2 + (ent.transform.y - cam.y) * cam.zoom;
      if (sx > 0 && sx < viewW && sy > 0 && sy < viewH) continue;

      const ang = Math.atan2(dy, dx);
      const ax = Math.min(viewW - margin, Math.max(margin, viewW / 2 + Math.cos(ang) * (viewW / 2 - margin)));
      const ay = Math.min(viewH - margin, Math.max(margin, viewH / 2 + Math.sin(ang) * (viewH / 2 - margin)));
      const alpha = 0.9 - (d / 400) * 0.5;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.scale(s, s);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff5252';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  return { render };
}
