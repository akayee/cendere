// Maçın kalbi: evre saati, daralan cendere + hasarı, KİŞİSEL GZ'ler
// (bütçe + can dolumu + Sürgün itilmesi), kamp/T4 dalgaları, maç bitişi.

import { SIM, ZONE } from '../../data/balance.js';
import {
  PHASES,
  MATCH_END,
  SUDDEN_DEATH,
  phaseIndexAt,
  cendereRadiusAt,
  gzRadiusAt,
  cendereDpsAt,
} from '../../data/phases.js';
import { gzOf, gzRadius, isOutsideCendere } from '../zone.js';
import { canHeal } from './combatSystem.js';
import { fillCampsToTarget, ensureCamps, spawnCamp, spawnT4Wave } from '../spawn.js';
import { T4_SPAWN_INTERVAL, CAMPS } from '../../data/mobs.js';

export function zoneSystem(world) {
  const m = world.match;
  if (m.over) return;

  m.t += SIM.DT;

  // --- Evre geçişi
  const idx = phaseIndexAt(m.t);
  if (idx !== m.phaseIndex) {
    m.phaseIndex = idx;
    m.phase = PHASES[idx].key;
    world.bus.emit('zone.phaseChanged', { phase: PHASES[idx].key, name: PHASES[idx].name });
    // Zindan yeni evre hedefine dolar; güçlü evrelerde duyuru
    fillCampsToTarget(world);
    if (PHASES[idx].key === 'sikisma') {
      // Güçlü kamp çağı: hedef dolu olsa bile 2 elit kamp ZORUNLU gelir
      spawnCamp(world, ['ejder', 1, true]);
      spawnCamp(world, ['ejder', 1, true]);
      world.bus.emit('t3.spawned', {});
    }
    if (PHASES[idx].key === 'son') {
      spawnT4Wave(world);
      m.t4Timer = T4_SPAWN_INTERVAL;
    }
  }

  m.cendereR = cendereRadiusAt(m.t);
  m.gzScale = gzRadiusAt(m.t) / PHASES[0].gz; // tüm kişisel GZ'ler birlikte erir
  world.healMult = m.phase === 'aniolum' ? SUDDEN_DEATH.HEAL_MULT : 1;

  // --- Kamp yenilenmesi: yavaş aralıklarla, hep zindanda
  m.campTimer = (m.campTimer ?? CAMPS.RESPAWN) - SIM.DT;
  if (m.campTimer <= 0) {
    m.campTimer = CAMPS.RESPAWN;
    ensureCamps(world);
  }

  // --- T4 dalgaları: Son Cendere ve Ani Ölüm boyunca aralıklarla sızar
  if (m.phase === 'son' || m.phase === 'aniolum') {
    m.t4Timer = (m.t4Timer ?? T4_SPAWN_INTERVAL) - SIM.DT;
    if (m.t4Timer <= 0) {
      m.t4Timer = T4_SPAWN_INTERVAL;
      spawnT4Wave(world);
    }
  }

  // --- Cendere hasarı (tik bazlı) ve kişisel GZ işleyişi
  m.damageAcc += SIM.DT;
  const damageTickDue = m.damageAcc >= ZONE.DAMAGE_TICK;
  if (damageTickDue) m.damageAcc -= ZONE.DAMAGE_TICK;
  const dps = cendereDpsAt(m.t);

  for (const ent of world.movers) {
    if (ent.dead || !ent.zone) continue;
    const t = ent.transform;

    // Cendere dışında kalan hasar yer
    if (damageTickDue && dps > 0 && isOutsideCendere(world, t.x, t.y)) {
      const dmg = Math.max(1, Math.round(dps * ZONE.DAMAGE_TICK));
      ent.health.hp -= dmg;
      ent.health.hurtT = 0.1;
      if (ent.gather) ent.gather.interrupt = true;
      if (ent.combat) ent.combat.inCombatT = 1.5;
      world.bus.emit('cendere.damage', { x: t.x, y: t.y, amount: dmg, id: ent.id });
      if (ent.health.hp <= 0) {
        ent.dead = true;
        ent.lastHitBy = -1; // katil: Cendere
      }
    }

    // --- Kendi GZ'si
    const gz = gzOf(world, ent);
    const z = ent.zone;
    const r = gz ? gzRadius(world, gz) : 0;
    const inOwn =
      gz && r > 2 && (t.x - gz.x) * (t.x - gz.x) + (t.y - gz.y) * (t.y - gz.y) <= r * r;

    // Giriş/çıkış bildirimleri (histerezisli: sınırda titreşim yok)
    if (gz) {
      const d = Math.hypot(t.x - gz.x, t.y - gz.y);
      if (z.wasInGZ && (r <= 2 || d > r + 6)) {
        z.wasInGZ = false;
        world.bus.emit('zone.leftGZ', { id: ent.id });
      } else if (!z.wasInGZ && r > 2 && d < r - 6) {
        z.wasInGZ = true;
        world.bus.emit('zone.enteredGZ', { id: ent.id });
      }
    }

    if (inOwn) {
      // Bütçe erir; sıfırlanınca Sürgün
      z.gzBudget -= SIM.DT;
      if (z.gzBudget <= 0 && !z.exiled) {
        z.gzBudget = 0;
        z.exiled = true;
        world.bus.emit('zone.exiled', { id: ent.id });
      }

      if (z.exiled) {
        // GZ seni İSTEMİYOR: kendi üssünden dışarı itilirsin + kalırken yanarsın
        const ex = t.x - gz.x;
        const ey = t.y - gz.y;
        const el = Math.hypot(ex, ey);
        let rx, ry;
        if (el < 1) {
          // Tam merkezdeysen radyal yön tanımsız: deterministik bir yön seç
          const a0 = ent.id * 2.4;
          rx = Math.cos(a0);
          ry = Math.sin(a0);
        } else {
          rx = ex / el;
          ry = ey / el;
        }
        const wob = Math.sin(m.t * 1.6 + ent.id) * 0.8; // engel etrafından kaydır
        const px = rx - ry * wob;
        const py = ry + rx * wob;
        const pl = Math.hypot(px, py) || 1;
        t.x += (px / pl) * ZONE.EJECT_PUSH * SIM.DT;
        t.y += (py / pl) * ZONE.EJECT_PUSH * SIM.DT;
        if (damageTickDue) {
          const burn = Math.max(1, Math.round(ZONE.OVERSTAY_DPS * ZONE.DAMAGE_TICK));
          ent.health.hp -= burn;
          ent.health.hurtT = 0.1;
          if (ent.gather) ent.gather.interrupt = true;
          world.bus.emit('gz.burn', { id: ent.id, x: t.x, y: t.y, amount: burn });
          if (ent.health.hp <= 0) {
            ent.dead = true;
            ent.lastHitBy = -2; // katil: GZ
          }
        }
      } else if (ent.health.hp < ent.health.maxHp && canHeal(ent)) {
        // "GZ can bassın": kendi üssün seni yavaşça iyileştirir
        ent.health.hp = Math.min(
          ent.health.maxHp,
          ent.health.hp + ZONE.GZ_HEAL * world.healMult * SIM.DT
        );
      }
    } else if (z.gzBudget < ZONE.GZ_BUDGET) {
      // Dışarıda bütçe yavaşça dolar; Sürgün eşikte kalkar
      z.gzBudget = Math.min(ZONE.GZ_BUDGET, z.gzBudget + SIM.DT / ZONE.GZ_REFILL_RATIO);
      if (z.exiled && z.gzBudget >= ZONE.EXILE_LIFT) {
        z.exiled = false;
        world.bus.emit('zone.exileLifted', { id: ent.id });
      }
    }
  }

  // --- Maç bitişi: süre doldu
  if (m.t >= MATCH_END) {
    m.over = true;
    world.bus.emit('match.ended', { win: true, reason: 'time' });
  }
}
