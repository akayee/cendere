// Maçın kalbi: evre saati, daralan cendere + hasarı, kamp/T4 dalgaları, maç bitişi.
// Kişisel GZ'ler KALDIRILDI — tek tehlike ve tek saat cenderedir.

import { SIM, CENDERE } from '../../data/balance.js';
import { PHASES, MATCH_END, SUDDEN_DEATH, phaseIndexAt, cendereRadiusAt, cendereDpsAt } from '../../data/phases.js';
import { isOutsideCendere } from '../zone.js';
import { fillCampsToTarget, ensureCamps, spawnCamp, spawnT4Wave } from '../spawn.js';
import { T4_SPAWN_INTERVAL, CAMPS, ELITE_CAMP } from '../../data/mobs.js';

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
      spawnCamp(world, ELITE_CAMP);
      spawnCamp(world, ELITE_CAMP);
      world.bus.emit('t3.spawned', {});
    }
    if (PHASES[idx].key === 'son') {
      spawnT4Wave(world);
      m.t4Timer = T4_SPAWN_INTERVAL;
    }
  }

  m.cendereR = cendereRadiusAt(m.t);
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

  // --- Cendere hasarı (tik bazlı): dışarıda kalan oyuncu/bot yanar
  m.damageAcc += SIM.DT;
  const damageTickDue = m.damageAcc >= CENDERE.DAMAGE_TICK;
  if (damageTickDue) m.damageAcc -= CENDERE.DAMAGE_TICK;
  const dps = cendereDpsAt(m.t);

  if (damageTickDue && dps > 0) {
    for (const ent of world.movers) {
      if (ent.dead || ent.kind !== 'player') continue;
      const t = ent.transform;
      if (!isOutsideCendere(world, t.x, t.y)) continue;

      const dmg = Math.max(1, Math.round(dps * CENDERE.DAMAGE_TICK));
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
  }

  // --- Maç bitişi: süre doldu
  if (m.t >= MATCH_END) {
    m.over = true;
    world.bus.emit('match.ended', { win: true, reason: 'time' });
  }
}
