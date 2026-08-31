// Intent → hız → pozisyon. Yön ve animasyon durumu da burada türetilir
// (animState bir sim etiketidir; hangi kareye denk geldiğini render bilir).

import { normInto } from '../../core/vec2.js';
import { SIM } from '../../data/balance.js';

const tmp = { x: 0, y: 0 };

export function movementSystem(world) {
  for (const ent of world.movers) {
    const t = ent.transform;
    const m = ent.motion;

    t.prevX = t.x;
    t.prevY = t.y;

    // Süreli yavaşlatma (Pranga — beceri isabeti): süre boyunca hız çarpanı.
    // Yığılmaz; combatSystem yeni isabette süreyi tazeler. Dash'e de işler.
    let slowMul = 1;
    if (m.slow) {
      m.slow.t -= SIM.DT;
      if (m.slow.t <= 0) m.slow = null;
      else slowMul = m.slow.mul;
    }

    // KEMENT (root — Kementçi becerisi): süre boyunca YERE SABİT — hız 0, hareket
    // girdisi yok sayılır, aktif dash bile yerinde sayar (yenisi combatSystem'de
    // engelli). Saldırı/beceri SERBEST kalır; süre bitince kendiliğinden çözülür.
    // slow'un üstüne mul:0 basmak DEĞİL, ayrı alan: ikisi bağımsız akar/tazelenir.
    if (m.root) {
      m.root.t -= SIM.DT;
      if (m.root.t <= 0) {
        m.root = null;
      } else {
        m.velX = 0;
        m.velY = 0;
        ent.render.animState = 'idle';
        continue;
      }
    }

    // Atılma aktifken girdi yerine dash yönü/hızı geçerlidir
    const dash = ent.combat?.dash;
    if (dash) {
      m.velX = dash.dirX * m.speed * ent.combat.skill.speedMul * slowMul;
      m.velY = dash.dirY * m.speed * ent.combat.skill.speedMul * slowMul;
      t.x += m.velX * SIM.DT;
      t.y += m.velY * SIM.DT;
      ent.render.animState = 'walk';
      continue;
    }

    normInto(tmp, ent.input.moveX, ent.input.moveY);
    // Pot içme animasyonu sırasında yavaşlama (PLAN §9)
    const drinkSlow = ent.gather?.drinkT > 0 ? 0.5 : 1;
    m.velX = tmp.x * m.speed * drinkSlow * slowMul;
    m.velY = tmp.y * m.speed * drinkSlow * slowMul;

    t.x += m.velX * SIM.DT;
    t.y += m.velY * SIM.DT;

    const moving = tmp.x !== 0 || tmp.y !== 0;
    ent.render.animState = moving ? 'walk' : 'idle';
    if (moving) {
      // 4 yön: baskın eksen kazanır
      if (Math.abs(tmp.x) >= Math.abs(tmp.y)) t.dir = tmp.x < 0 ? 'left' : 'right';
      else t.dir = tmp.y < 0 ? 'up' : 'down';
    }
  }
}
