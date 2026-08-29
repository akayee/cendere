// Çizim orkestrasyonu: zemin → y-sıralı dünya objeleri → (ileride) efektler.
// Sim state'ini OKUR, asla yazmaz (ARCHITECTURE.md §9).

import { applyCamera, viewRect } from './camera.js';
import { drawCharacter } from './animator.js';
import { buildGroundCanvas, drawGround } from './tileRenderer.js';
import { PROPS, RESOURCE_PROPS } from './atlasData.js';
import { drawZones } from './zoneOverlay.js';
import { lerp, distSq } from '../core/vec2.js';
import { ECON } from '../data/balance.js';
import { yieldMultiplier } from '../sim/zone.js';

export function createRenderer(canvas, images, map, effects) {
  const ctx = canvas.getContext('2d');
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

  function render(world, cam, alpha, timeSec, viewW, viewH) {
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

    // Kaynaklar (toplanabilir entity'ler) y-sıralamaya katılır
    for (const res of world.resources) {
      const t = res.transform;
      if (t.x < view.minX || t.x > view.maxX || t.y < view.minY || t.y > view.maxY) continue;
      const def = RESOURCE_PROPS[res.resType];
      if (def) drawList.push({ def, x: t.x, y: t.y, sortY: t.y, locked: res.lockedBy !== 0 });
    }

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
        drawCharacter(ctx, images, item.ent, item.x, item.y, timeSec);
      } else {
        const d = item.def;
        ctx.drawImage(
          images.get(d.sheet),
          d.x, d.y, d.w, d.h,
          Math.round(item.x - d.anchorX), Math.round(item.y - d.anchorY), d.w, d.h
        );
      }
    }

    // Menzildeki kaynaklara beyaz vurgu çerçevesi + verim etiketi (otomatik toplama işareti)
    const player = world.entities.get(world.playerId);
    if (player) {
      const reach = ECON.GATHER_RANGE + player.body.radius;
      for (const res of world.resources) {
        if (res.lockedBy && res.lockedBy !== player.id) continue;
        const rt = res.transform;
        if (distSq(player.transform.x, player.transform.y, rt.x, rt.y) > reach * reach) continue;
        const def = RESOURCE_PROPS[res.resType];
        if (!def) continue;

        const pulse = 0.55 + 0.35 * Math.sin(timeSec * 6);
        ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          Math.round(rt.x - def.anchorX) - 1.5,
          Math.round(rt.y - def.anchorY) - 1.5,
          def.w + 3,
          def.h + 3
        );

        const amount = yieldMultiplier(world, rt.x, rt.y);
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        const label = '×' + amount;
        const ly = rt.y - def.anchorY - 5;
        ctx.strokeText(label, rt.x, ly);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, rt.x, ly);
        ctx.textAlign = 'start';
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
      if (p.kind === 'bolt') {
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

    // Kanal ilerleme barı (toplama / yoğunlaşma)
    for (const ent of world.movers) {
      const ch = ent.gather?.channel;
      if (!ch) continue;
      const t = ent.transform;
      const w = 16;
      const frac = Math.min(1, ch.t / ch.duration);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(t.x - w / 2, t.y - 24, w, 3);
      ctx.fillStyle = ch.type === 'focus' ? '#7ee8a0' : '#e8c76e';
      ctx.fillRect(t.x - w / 2, t.y - 24, w * frac, 3);
    }

    // Can barları: hasarlı mob/kuklalar + rakip oyuncular (botlar her zaman)
    for (const ent of world.movers) {
      const isRival = ent.kind === 'player' && ent.id !== world.playerId;
      const damagedMob = (ent.kind === 'mob' || ent.kind === 'dummy') && ent.health.hp < ent.health.maxHp;
      if (!isRival && !damagedMob) continue;
      const t = ent.transform;
      const w = 12;
      const frac = Math.max(0, ent.health.hp / ent.health.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(t.x - w / 2, t.y - 19, w, 2.5);
      ctx.fillStyle = isRival ? '#ff8c5a' : frac > 0.4 ? '#6ee86e' : '#e85a5a';
      ctx.fillRect(t.x - w / 2, t.y - 19, w * frac, 2.5);
    }

    if (effects) effects.draw(ctx);

    drawZones(ctx, world, view, timeSec);

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    drawRivalArrows(ctx, world, cam, viewW, viewH);
  }

  /** Yakındaki (≤400) ama ekran dışındaki rakipler için kenar okları. */
  function drawRivalArrows(ctx, world, cam, viewW, viewH) {
    const me = world.entities.get(world.playerId);
    if (!me) return;
    const s = cam.zoom / 3; // dpr ölçeği: ok cihaz pikselinde de aynı boyda görünsün
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
