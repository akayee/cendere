// Maçın kalbi (PLAN §2, §4): evre saati, daralan cendere + hasarı,
// GZ bütçesi + Sürgün, Ani Ölüm iyileştirme kısıtı ve maç bitişi.

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
import { isInGZ, isOutsideCendere } from '../zone.js';
import { spawnInitialCamps, spawnCamp, ensureCamps, spawnT4Wave } from '../spawn.js';
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
    // Evreye bağlı mob dalgaları (PLAN §8)
    if (PHASES[idx].key === 'genisleme') spawnInitialCamps(world);
    if (PHASES[idx].key === 'sikisma') {
      // Güçlü kamp çağı: anında 2 elit kamp (cendere içinde)
      spawnCamp(world);
      spawnCamp(world);
      world.bus.emit('t3.spawned', {});
    }
    if (PHASES[idx].key === 'son') {
      spawnT4Wave(world);
      m.t4Timer = T4_SPAWN_INTERVAL;
    }
  }

  // Kamp yenilenmesi: kesilen kampın yerine YAVAŞ aralıklarla, hep cendere içinde
  m.campTimer = (m.campTimer ?? CAMPS.RESPAWN) - SIM.DT;
  if (m.campTimer <= 0) {
    m.campTimer = CAMPS.RESPAWN;
    ensureCamps(world);
  }

  // T4 dalgaları: Son Cendere ve Ani Ölüm boyunca aralıklarla sızar
  if (m.phase === 'son' || m.phase === 'aniolum') {
    m.t4Timer = (m.t4Timer ?? T4_SPAWN_INTERVAL) - SIM.DT;
    if (m.t4Timer <= 0) {
      m.t4Timer = T4_SPAWN_INTERVAL;
      spawnT4Wave(world);
    }
  }

  m.cendereR = cendereRadiusAt(m.t);
  m.gzR = gzRadiusAt(m.t);
  world.healMult = m.phase === 'aniolum' ? SUDDEN_DEATH.HEAL_MULT : 1;

  // --- Cendere hasarı (tik bazlı) ve GZ bütçesi
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
      if (ent.combat) ent.combat.inCombatT = 1.5; // yanarken toplama denemesi yapma
      world.bus.emit('cendere.damage', { x: t.x, y: t.y, amount: dmg, id: ent.id });
      if (ent.health.hp <= 0) {
        ent.dead = true;
        ent.lastHitBy = -1; // kill feed: katil Cendere
      }
    }

    // GZ giriş/çıkış geçişleri (UI bildirimleri için) — sınırda titreşim olmasın
    // diye histerezisli: çıkış için 6 birim dışarı, giriş için 6 birim içeri gerekir
    const z = ent.zone;
    const inGZ = isInGZ(world, t.x, t.y);
    const dCenter = Math.hypot(t.x - world.map.widthPx / 2, t.y - world.map.heightPx / 2);
    if (z.wasInGZ && (m.gzR <= 0 || dCenter > m.gzR + 6)) {
      z.wasInGZ = false;
      world.bus.emit('zone.leftGZ', { id: ent.id });
    } else if (!z.wasInGZ && m.gzR > 0 && dCenter < m.gzR - 6) {
      z.wasInGZ = true;
      world.bus.emit('zone.enteredGZ', { id: ent.id });
    }

    // Kişisel GZ bütçesi (PLAN §4)
    if (inGZ) {
      z.gzBudget -= SIM.DT;
      if (z.gzBudget <= 0 && !z.exiled) {
        z.gzBudget = 0;
        z.exiled = true;
        world.bus.emit('zone.exiled', { id: ent.id });
      }
      // 120 sn doldu mu? GZ seni İSTEMİYOR: dışarı itilirsin + kaldığın her sn yakar.
      // (Sürgünken içeride saldırılabilir olmak zaten geçerli — bu, mekanik ceza.)
      if (z.exiled) {
        const ex = t.x - world.map.widthPx / 2;
        const ey = t.y - world.map.heightPx / 2;
        const el = Math.hypot(ex, ey) || 1;
        const rx = ex / el;
        const ry = ey / el;
        // Teğet salınım: radyal hattaki ağaca/kayaya SIKIŞMASIN — etrafından kaydır
        const wob = Math.sin(m.t * 1.6 + ent.id) * 0.8;
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
      }
    } else if (z.gzBudget < ZONE.GZ_BUDGET) {
      z.gzBudget = Math.min(ZONE.GZ_BUDGET, z.gzBudget + SIM.DT / ZONE.GZ_REFILL_RATIO);
      if (z.exiled && z.gzBudget >= ZONE.EXILE_LIFT) {
        z.exiled = false;
        world.bus.emit('zone.exileLifted', { id: ent.id });
      }
    }
  }

  // --- Maç bitişi: 20:00 doldu (son hayatta kalan kontrolü M6'da botlarla gelir)
  if (m.t >= MATCH_END) {
    m.over = true;
    world.bus.emit('match.ended', { win: true, reason: 'time' });
  }
}
