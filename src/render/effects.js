// Tek seferlik görsel efektler: hasar sayıları, kılıç yayı, ölüm dumanı.
// Sim event'lerini dinleyen taraf bunları spawn eder; sim bunlardan habersizdir.

export function createEffects() {
  /** @type {Array<object>} */
  const items = [];

  return {
    /** Yüzen hasar sayısı */
    spawnText(x, y, text, color = '#ffe08a') {
      items.push({ type: 'text', x, y, text, color, t: 0, life: 0.6 });
    },

    /** Kılıç savuruş yayı */
    spawnSlash(x, y, angle) {
      items.push({ type: 'slash', x, y, angle, t: 0, life: 0.14 });
    },

    /** Ölüm dumanı (genişleyip solan halkalar) */
    spawnPoof(x, y) {
      items.push({ type: 'poof', x, y, t: 0, life: 0.35 });
    },

    /** Seviye atlama: HERKESE görünür ışık sütunu + halka (PLAN §6) */
    spawnLevelBeam(x, y) {
      items.push({ type: 'beam', x, y, t: 0, life: 0.9 });
    },

    update(dt) {
      for (let i = items.length - 1; i >= 0; i--) {
        items[i].t += dt;
        if (items[i].t >= items[i].life) items.splice(i, 1);
      }
    },

    /** Dünya uzayında çizim (kamera dönüşümü uygulanmış olmalı) */
    draw(ctx) {
      for (const fx of items) {
        const p = fx.t / fx.life; // 0..1
        if (fx.type === 'text') {
          ctx.globalAlpha = 1 - p * p;
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          const y = fx.y - 14 - p * 12;
          ctx.strokeText(fx.text, fx.x, y);
          ctx.fillStyle = fx.color;
          ctx.fillText(fx.text, fx.x, y);
        } else if (fx.type === 'slash') {
          ctx.globalAlpha = (1 - p) * 0.9;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5 * (1 - p * 0.5);
          ctx.beginPath();
          ctx.arc(fx.x, fx.y, 13 + p * 7, fx.angle - 0.9, fx.angle + 0.9);
          ctx.stroke();
        } else if (fx.type === 'beam') {
          // Işık sütunu: yukarı uzanan parlak şerit + zeminde genişleyen altın halka
          const fade = p < 0.7 ? 1 : (1 - p) / 0.3;
          ctx.globalAlpha = fade * 0.85;
          const grad = ctx.createLinearGradient(0, fx.y - 70, 0, fx.y);
          grad.addColorStop(0, 'rgba(255,240,150,0)');
          grad.addColorStop(1, 'rgba(255,240,150,0.9)');
          ctx.fillStyle = grad;
          const w = 10 * (1 - p * 0.4);
          ctx.fillRect(fx.x - w / 2, fx.y - 70, w, 70);
          ctx.strokeStyle = '#ffd75e';
          ctx.lineWidth = 2 * (1 - p);
          ctx.beginPath();
          ctx.ellipse(fx.x, fx.y, 6 + p * 22, (6 + p * 22) * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (fx.type === 'poof') {
          ctx.globalAlpha = (1 - p) * 0.7;
          ctx.fillStyle = '#e8e8e0';
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + p * 1.5;
            const r = 3 + p * 9;
            ctx.beginPath();
            ctx.arc(fx.x + Math.cos(a) * r, fx.y - 4 + Math.sin(a) * r * 0.6, 3 * (1 - p), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    },
  };
}
